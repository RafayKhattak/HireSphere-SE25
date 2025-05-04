const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/auth');
const { isEmployer } = require('../middleware/roleCheck');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Gemini API
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCKDyoST4sGKHYCNoTunjhQKk6VCXcB1fk"; // Use const for API Key
let geminiModel;
try {
    const genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    console.log('[Screening] Gemini AI Model initialized successfully.');
} catch (aiError) {
    console.error('[Screening] Failed to initialize Gemini AI Model:', aiError);
    geminiModel = null; // Set to null if initialization fails
}

/**
 * @route   GET /api/screening/test
 * @desc    Test route for screening API
 * @access  Public
 */
router.get('/test', (req, res) => {
    console.log('[Screening] Test route accessed.');
    res.json({ message: 'Screening API is working' });
});

/**
 * @route   POST /api/screening/analyze/:jobId
 * @desc    Analyze candidates for a job
 * @access  Private (Employers only)
 */
router.post('/analyze/:jobId', authenticateUser, isEmployer, async (req, res) => {
    console.log(`[Screening] Received POST /analyze request for Job ID: ${req.params.jobId} from Employer ID: ${req.user.id}`);
    console.log(`[Screening] Request body:`, req.body);
    console.log(`[Screening] Request query params:`, req.query);
    
    if (!geminiModel) {
        console.error('[Screening] AI Model not available. Cannot perform analysis.');
        return res.status(503).json({ message: 'AI Screening service is currently unavailable.' });
    }

    try {
        const jobId = req.params.jobId;
        const useFallback = req.query.useFallback === 'true';
        
        console.log(`[Screening] Finding job with ID: ${jobId}, useFallback=${useFallback}`);
        const job = await Job.findById(jobId).lean(); // Use lean for performance
        if (!job) {
            console.log(`[Screening] Job not found: ${jobId}`);
            return res.status(404).json({ message: 'Job not found' });
        }
        console.log(`[Screening] Found job: "${job.title}" (${job._id})`);
        
        if (job.employer.toString() !== req.user.id) {
            console.log(`[Screening] Authorization failed: Employer ${req.user.id} does not own job ${jobId}`);
            return res.status(403).json({ message: 'Not authorized to access this job' });
        }
        console.log(`[Screening] Employer ownership verified.`);
        
        console.log(`[Screening] Finding applications for Job ID: ${jobId}`);
        const applications = await Application.find({ job: jobId })
            // Populate necessary fields for the prompt
            .populate({
                path: 'jobSeeker',
                select: 'name email skills experience education title totalYearsExperience location profileImage',
                // Do NOT populate nested refs like experience/education here if they are embedded
            })
            .lean(); // Use lean as we only need plain objects
        
        console.log(`[Screening] Found ${applications.length} applications.`);
        if (applications.length === 0) {
            return res.status(200).json({ 
                message: 'No applications found for this job.', 
                job: { id: job._id, title: job.title },
                candidates: [] 
            });
        }

        // If using fallback mode, skip AI processing and use a simple algorithmic match
        if (useFallback) {
            console.log('[Screening] Using fallback mode (no AI) for candidate matching');
            
            const fallbackResults = applications.map(app => {
                // Basic algorithm: Count matching skills and calculate percentage
                const jobSeekerSkills = app.jobSeeker?.skills || [];
                const jobRequiredSkills = (job.requirements || '').toLowerCase().split(/[,;\s]+/);
                
                // Filter out empty strings and normalize
                const normalizedJobSkills = jobRequiredSkills.filter(s => s.trim()).map(s => s.trim().toLowerCase());
                const normalizedSeekerSkills = jobSeekerSkills.map(s => s.toLowerCase());
                
                // Count matches
                let matchCount = 0;
                const matchedSkills = [];
                const missingSkills = [];
                
                normalizedJobSkills.forEach(skill => {
                    if (normalizedSeekerSkills.some(s => s.includes(skill) || skill.includes(s))) {
                        matchCount++;
                        matchedSkills.push(skill);
                    } else {
                        missingSkills.push(skill);
                    }
                });
                
                // Calculate match score (normalize to 0-100)
                const rawScore = normalizedJobSkills.length > 0 
                    ? (matchCount / normalizedJobSkills.length) * 100 
                    : 50; // Default if no skills specified
                
                // Adjust based on years of experience if available
                const expYears = app.jobSeeker?.totalYearsExperience || 0;
                const expBonus = Math.min(expYears * 2, 15); // Up to 15% bonus for experience
                
                // Final score (cap at 100)
                const matchScore = Math.min(Math.round(rawScore + expBonus), 100);
                
                console.log(`[Screening] Fallback match for ${app.jobSeeker?.name}: ${matchScore}% (skills: ${matchCount}/${normalizedJobSkills.length}, exp: +${expBonus}%)`);
                
                return {
                    applicationId: app._id.toString(),
                    matchScore: matchScore,
                    strengths: matchedSkills.slice(0, 3).map(s => `Has skill in ${s}`),
                    weaknesses: missingSkills.slice(0, 3).map(s => `Missing skill in ${s}`),
                    reasoning: `Matched ${matchCount} skills out of ${normalizedJobSkills.length} required skills with ${expYears} years of experience.`
                };
            });
            
            // Sort by score and prepare final response
            const finalFallbackResults = applications.map(app => {
                const analysis = fallbackResults.find(res => res.applicationId === app._id.toString());
                return {
                    applicationId: app._id,
                    candidate: {
                        id: app.jobSeeker?._id,
                        name: app.jobSeeker?.name || 'Unknown',
                        email: app.jobSeeker?.email,
                        title: app.jobSeeker?.title,
                        location: app.jobSeeker?.location,
                        profileImage: app.jobSeeker?.profileImage
                    },
                    appliedAt: app.appliedAt,
                    status: app.status,
                    matchScore: analysis?.matchScore ?? 0,
                    strengths: analysis?.strengths ?? [],
                    weaknesses: analysis?.weaknesses ?? [],
                    reasoning: analysis?.reasoning ?? 'Analysis not available.'
                };
            }).sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
            
            console.log(`[Screening] Returning ${finalFallbackResults.length} analyzed candidates (fallback mode).`);
            return res.json({
                job: {
                    id: job._id,
                    title: job.title,
                    company: job.company
                },
                candidates: finalFallbackResults
            });
        }
        
        // --- AI Screening Implementation --- 
        console.log('[Screening] Preparing data for AI analysis...');

        // 1. Construct the Prompt
        let prompt = `Act as an expert recruitment screener for HireSphere. Evaluate the following candidates who applied for the job described below. Assess their fit based ONLY on the provided profile information against the job requirements.

`;
        prompt += `**Job Details:**
`;
        prompt += `- Title: ${job.title || 'N/A'}\n`;
        prompt += `- Description: ${job.description || 'N/A'}\n`;
        prompt += `- Requirements: ${job.requirements || 'N/A'}\n`;
        prompt += `- Location: ${job.location || 'N/A'}\n\n`;
        prompt += `**Candidate Profiles:**\n---\n`;

        applications.forEach((app, index) => {
            const seeker = app.jobSeeker;
            if (!seeker) return; // Skip if seeker data is missing

            prompt += `**Candidate ${index + 1} (Application ID: ${app._id})**\n`;
            prompt += `- Name: ${seeker.name || 'N/A'}\n`;
            prompt += `- Title: ${seeker.title || 'N/A'}\n`;
            prompt += `- Location: ${seeker.location || 'N/A'}\n`;
            prompt += `- Total Experience (Years): ${seeker.totalYearsExperience !== undefined ? seeker.totalYearsExperience : 'N/A'}\n`;
            prompt += `- Skills: ${seeker.skills && seeker.skills.length > 0 ? seeker.skills.join(', ') : 'None listed'}\n`;
            
            // Summarize Experience (optional, could make prompt long)
            if (seeker.experience && seeker.experience.length > 0) {
                prompt += `- Experience Summary: ${seeker.experience.map(e => `${e.title} at ${e.company}`).join('; ')}\n`;
            }
            // Summarize Education (optional)
            if (seeker.education && seeker.education.length > 0) {
                prompt += `- Education Summary: ${seeker.education.map(e => `${e.degree} from ${e.institution}`).join('; ')}\n`;
            }
            prompt += `---\n`;
        });

        prompt += `\n**Instructions:**
`;
        prompt += `1. For each candidate, provide a detailed analysis comparing their profile (skills, experience level, title, location) to the Job Details.
`;
        prompt += `2. Assign a Match Score (0-100) indicating overall fit (0=No Fit, 100=Perfect Fit).
`;
        prompt += `3. List key Strengths (max 3 bullet points) aligning with job requirements.
`;
        prompt += `4. List key Weaknesses/Gaps (max 3 bullet points) where the profile falls short.
`;
        prompt += `5. Provide brief Reasoning (1-2 sentences) explaining the score.
`;
        prompt += `6. Return the response as a single valid JSON object with a key "candidateAnalysis" containing an array. Each element in the array should be an object with these EXACT keys: "applicationId", "matchScore", "strengths", "weaknesses", "reasoning".
`;
        prompt += `7. Ensure the "applicationId" matches the ID provided in the candidate profile section.
`;
        prompt += `8. Sort the array by "matchScore" in descending order.
`;
        prompt += `Example format for one candidate:
 { "applicationId": "${applications[0]._id}", "matchScore": 85, "strengths": ["Strong alignment in required skill X", "Relevant experience in Y"], "weaknesses": ["Lacks specific tool Z"], "reasoning": "Good overall fit due to skills and experience, minor gap in tooling." }

JSON Response:
`;

        // 2. Call Gemini API
        console.log('[Screening] Sending prompt to Gemini AI...');
        console.log('[Screening] Prompt length:', prompt.length);
        // Don't log full prompt in production

        const aiResult = await geminiModel.generateContent({ 
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                // Ensure JSON output if supported by model version
                responseMimeType: "application/json", 
            },
        });
        const aiResponse = await aiResult.response;
        const responseText = aiResponse.text();
        console.log('[Screening] Received raw response from Gemini AI. Response length:', responseText.length);

        // 3. Parse AI Response
        let analysisResults = [];
        try {
            // Assuming the model adhered to responseMimeType: "application/json"
            console.log('[Screening] Attempting to parse JSON response...');
            
            // Add a preprocessing step to clean up potentially malformed JSON
            let cleanedResponseText = responseText;
            
            // Try to extract JSON from the response if there's any wrapper text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanedResponseText = jsonMatch[0];
                console.log('[Screening] Extracted JSON object from response');
            }
            
            try {
                const parsedJson = JSON.parse(cleanedResponseText);
                
                if (parsedJson.candidateAnalysis && Array.isArray(parsedJson.candidateAnalysis)) {
                    analysisResults = parsedJson.candidateAnalysis;
                    console.log(`[Screening] Successfully parsed AI analysis for ${analysisResults.length} candidates.`);
                } else {
                    console.warn('[Screening] AI response JSON did not contain expected structure (candidateAnalysis array).');
                    console.warn('[Screening] JSON keys found:', Object.keys(parsedJson).join(', '));
                    
                    // Try to extract candidateAnalysis if it exists somewhere in the structure
                    if (typeof parsedJson === 'object') {
                        const findCandidateAnalysis = (obj) => {
                            for (const key in obj) {
                                if (key === 'candidateAnalysis' && Array.isArray(obj[key])) {
                                    return obj[key];
                                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                                    const result = findCandidateAnalysis(obj[key]);
                                    if (result) return result;
                                }
                            }
                            return null;
                        };
                        
                        const foundAnalysis = findCandidateAnalysis(parsedJson);
                        if (foundAnalysis) {
                            analysisResults = foundAnalysis;
                            console.log(`[Screening] Found candidateAnalysis in nested object with ${analysisResults.length} items`);
                        } else {
                            throw new Error('AI response structure incorrect.');
                        }
                    } else {
                        throw new Error('AI response structure incorrect.');
                    }
                }
            } catch (innerError) {
                console.warn('[Screening] Initial JSON parse failed, attempting manual JSON cleaning...');
                
                // More aggressive JSON cleaning for common issues
                cleanedResponseText = cleanedResponseText
                    .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
                    .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
                    .replace(/\\/g, '\\\\')  // Escape backslashes
                    .replace(/"\s*\n\s*"/g, '", "') // Fix newlines between string items
                    .replace(/\n/g, '\\n');  // Escape newlines within strings
                    
                try {
                    const parsedJson = JSON.parse(cleanedResponseText);
                    if (parsedJson.candidateAnalysis && Array.isArray(parsedJson.candidateAnalysis)) {
                        analysisResults = parsedJson.candidateAnalysis;
                        console.log(`[Screening] Successfully parsed AI analysis after cleanup for ${analysisResults.length} candidates.`);
                    } else {
                        throw new Error('AI response structure incorrect after cleanup.');
                    }
                } catch (finalError) {
                    console.error('[Screening] Failed all JSON parsing attempts:', finalError);
                    throw finalError; // Re-throw to be caught by the outer catch
                }
            }
        } catch (parseError) {
            console.error('[Screening] Error parsing AI JSON response:', parseError);
            console.error('[Screening] Raw AI Response Text start:', responseText.substring(0, 200) + '...');
            console.error('[Screening] Response ends with:', responseText.substring(responseText.length - 100));
            
            // For now, return placeholder error scores
            analysisResults = applications.map(app => ({ 
                applicationId: app._id.toString(), 
                matchScore: -1, 
                strengths: [], 
                weaknesses: [], 
                reasoning: 'Error parsing AI analysis.'
            }));
        }

        // 4. Format and Return Results
        // Map AI results back to application data for the final response
        const finalResults = applications.map(app => {
            const analysis = analysisResults.find(res => res.applicationId === app._id.toString());
            return {
                applicationId: app._id,
                candidate: {
                    id: app.jobSeeker?._id,
                    name: app.jobSeeker?.name || 'Unknown',
                    email: app.jobSeeker?.email,
                    title: app.jobSeeker?.title,
                    location: app.jobSeeker?.location,
                    profileImage: app.jobSeeker?.profileImage
                },
                appliedAt: app.appliedAt,
                status: app.status,
                // AI Analysis Data (or placeholders)
                matchScore: analysis?.matchScore ?? 0,
                strengths: analysis?.strengths ?? [],
                weaknesses: analysis?.weaknesses ?? [],
                reasoning: analysis?.reasoning ?? (analysis?.matchScore === -1 ? 'Error parsing AI analysis.' : 'Analysis not available.')
            };
        })
        // Sort by matchScore descending
        .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)); 

        console.log(`[Screening] Returning ${finalResults.length} analyzed candidates.`);
        return res.json({
            job: {
                id: job._id,
                title: job.title,
                company: job.company
            },
            candidates: finalResults
        });

    } catch (error) {
        console.error('[Screening] Error in AI candidate analysis:', error);
        // Handle potential Gemini API errors specifically if needed
        if (error.message?.includes('API key')) {
            return res.status(500).json({ message: 'AI service configuration error.' });
        }
        return res.status(500).json({ 
            message: 'Server error during AI analysis.', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router; 