const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');
// Import the Google Generative AI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Gemini AI Setup ---
// Ensure you have GEMINI_API_KEY in your .env file
const apiKey = process.env.GEMINI_API_KEY;
let genAI;
let geminiModel;

if (apiKey) {
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Or your preferred model
        console.log('[Recommendations] Gemini AI client initialized successfully.');
    } catch (error) {
        console.error('[Recommendations] Failed to initialize Gemini AI client:', error);
        // We can proceed without Gemini, potentially falling back to old logic or erroring
        genAI = null;
        geminiModel = null;
    }
} else {
    console.warn('[Recommendations] GEMINI_API_KEY not found in environment variables. AI recommendations disabled.');
    genAI = null;
    geminiModel = null;
}
// ----------------------

// Helper function to escape special regex characters
function escapeRegex(string) {
  // Ensure input is a string before calling replace
  if (typeof string !== 'string') return ''; 
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'); // $& means the whole matched string
}

// @route   GET /api/recommendations/jobs
// @desc    Get AI-powered job recommendations for the current user
// @access  Private
router.get('/jobs', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const userType = req.user.type;
        console.log(`[Recommendations] Received job recommendation request for user ID: ${userId}, type: ${userType}`);

        if (userType !== 'jobseeker') {
            console.log(`[Recommendations] Access denied for user ID: ${userId} (not a job seeker).`);
            return res.status(403).json({ message: 'Access denied. Only job seekers can access job recommendations.' });
        }

        const user = await User.findById(userId);

        if (!user) {
            console.log(`[Recommendations] User not found for ID: ${userId}`);
            return res.status(404).json({ message: 'User not found' });
        }
        console.log(`[Recommendations] Found user: ${user.email}`);

        const userSkills = user.skills || [];
        const userLocations = user.preferredLocations || [];
        const userJobTypes = user.preferredJobTypes || [];

        console.log(`[Recommendations] User Criteria - Skills: [${userSkills.join(', ')}], Locations: [${userLocations.join(', ')}], JobTypes: [${userJobTypes.join(', ')}]`);

        // --- Handle Empty Profile ---
        if (userSkills.length === 0 && userLocations.length === 0 && userJobTypes.length === 0) {
            console.log(`[Recommendations] User profile criteria empty, returning recent jobs.`);
            const recentJobs = await Job.find({ status: 'open' })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('employer', 'name companyName') // Populate employer details
                .lean(); // Use lean
            console.log(`[Recommendations] Found ${recentJobs.length} recent jobs.`);
            return res.json({
                jobs: recentJobs,
                message: 'Showing recent listings. Add skills, locations, or job types to your profile for personalized AI recommendations!'
            });
        }

        // --- Use Gemini if Available ---
        if (!geminiModel) {
             console.warn('[Recommendations] Gemini AI model not available. Cannot provide AI recommendations.');
             // Fallback: Return recent jobs if AI is unavailable
             console.log('[Recommendations] Falling back to recent jobs due to unavailable AI service.');
             const recentJobs = await Job.find({ status: 'open' })
                .sort({ createdAt: -1 }).limit(10).populate('employer', 'name companyName').lean();
             return res.json({ jobs: recentJobs, message: 'AI service unavailable, showing recent jobs.' });
        }

        // --- Fetch Candidate Jobs for AI ---
        console.log('[Recommendations] Fetching candidate jobs for AI analysis...');
        // Basic query: open jobs, potentially filtered by location/type if specified
        // Limit to avoid overwhelming the AI/context window
        let candidateQuery = { status: 'open' };
        if (userLocations.length > 0) {
            // Use escaped regex for location matching as well
             candidateQuery.location = { $in: userLocations.map(loc => new RegExp(escapeRegex(loc), 'i')) };
        }
        if (userJobTypes.length > 0) {
             candidateQuery.type = { $in: userJobTypes };
        }

        const candidateJobs = await Job.find(candidateQuery)
                                     .sort({ createdAt: -1 }) // Prioritize newer jobs
                                     .limit(100) // Limit the number of jobs sent to AI
                                     // Select fields needed for the prompt + the ID
                                     .select('_id title description requirements location type companyName employer') 
                                     // Populate company name if not directly on Job (assuming it might be on employer)
                                     // .populate({ path: 'employer', select: 'companyName' }) 
                                     .lean(); // Use lean for plain JS objects

        console.log(`[Recommendations] Fetched ${candidateJobs.length} candidate jobs for AI analysis.`);

        if (candidateJobs.length === 0) {
            console.log('[Recommendations] No candidate jobs found matching criteria.');
            return res.json({ jobs: [], message: 'No matching jobs found for your criteria.' });
        }

        // --- Prepare Prompt for Gemini (Standard String Concatenation - Explicit) ---
        let prompt = "You are an expert job recommendation system for HireSphere.\n";
        prompt += "Analyze the following job seeker profile and list of available jobs.\n";
        prompt += "Your goal is to identify the most relevant jobs for the seeker based on their skills, experience implied by skills, preferred locations, and preferred job types. Consider skill levels and job seniority.\n\n";
        
        prompt += "Job Seeker Profile:\n---\n";
        prompt += "Skills: " + (userSkills.join(', ') || 'None specified') + "\n";
        prompt += "Preferred Locations: " + (userLocations.join(', ') || 'None specified') + "\n";
        prompt += "Preferred Job Types: " + (userJobTypes.join(', ') || 'None specified') + "\n";
        prompt += "---\n\nAvailable Jobs:\n";
        prompt += "---\n";

        candidateJobs.forEach(job => {
            prompt += "Job ID: " + job._id + "\n";
            prompt += "Title: " + (job.title || 'N/A') + "\n";
            const desc = typeof job.description === 'string' ? job.description : '';
            const reqs = typeof job.requirements === 'string' ? job.requirements : '';
            prompt += "Description: " + desc.substring(0, 300).replace(/\n/g, ' ') + "...\n";
            prompt += "Requirements: " + reqs.substring(0, 300).replace(/\n/g, ' ') + "...\n";
            prompt += "Location: " + (job.location || 'N/A') + "\n";
            prompt += "Type: " + (job.type || 'N/A') + "\n";
            prompt += "Company: " + (job.companyName || 'N/A') + "\n---\n";
        });

        prompt += "\nInstructions:\n";
        prompt += "1. Evaluate each job's relevance to the seeker's profile (skills, location, type, seniority).\n";
        prompt += '2. Return a JSON object containing a single key "recommended_job_ids".\n';
        prompt += "3. The value should be an array of up to 10 job IDs from the list, ordered MOST to LEAST relevant. Exclude poor fits.\n";
        prompt += "4. ONLY include job IDs from the provided \"Available Jobs\" list.\n";
        prompt += '5. If no jobs are relevant, return an empty array: { "recommended_job_ids": [] }.\n';
        prompt += "6. Ensure the output is valid JSON format.\n\n";
        prompt += "JSON Response:";
        // --- End Prompt Construction --- 

        console.log('[Recommendations] Sending request to Gemini AI...');

        const generationConfig = {
           responseMimeType: "application/json",
        };
        const result = await geminiModel.generateContent(prompt, generationConfig);
        const response = result.response;
        const recommendedDataRaw = response.text();

        console.log('[Recommendations] Received response from Gemini AI.');
        // console.log('Gemini Raw Response for Debug:', recommendedDataRaw); 

        // --- Clean and Parse Gemini Response ---
        let recommendedJobIds = [];
        let cleanedJsonString = ''; // Declare outside try block
        try {
            // Attempt to extract JSON block using regex
            const jsonMatch = recommendedDataRaw.match(/\{.*\}/s); // Match first '{' to last '}' across lines
            if (jsonMatch && jsonMatch[0]) {
                cleanedJsonString = jsonMatch[0];
                // Now parse the extracted JSON string
                const parsedJson = JSON.parse(cleanedJsonString); 
                
                if (parsedJson && Array.isArray(parsedJson.recommended_job_ids)) {
                    recommendedJobIds = parsedJson.recommended_job_ids;
                     console.log(`[Recommendations] Parsed ${recommendedJobIds.length} recommended job IDs from Gemini.`);
                } else {
                     console.warn('[Recommendations] Gemini response structure invalid after JSON extraction. Parsed object:', parsedJson);
                     console.warn('(Original raw response was:', recommendedDataRaw + ')');
                }
            } else {
                 // If regex didn't find a JSON block, try simple cleaning as fallback (might still fail)
                 console.warn('[Recommendations] Could not extract JSON block via regex, attempting simple clean...');
                 cleanedJsonString = recommendedDataRaw
                    .replace(/^```json\s*/, '') 
                    .replace(/^```\s*/, '')    
                    .replace(/\s*```$/, '')    
                    .trim();
                const parsedJson = JSON.parse(cleanedJsonString);
                if (parsedJson && Array.isArray(parsedJson.recommended_job_ids)) {
                    recommendedJobIds = parsedJson.recommended_job_ids;
                    console.log(`[Recommendations] Parsed ${recommendedJobIds.length} recommended job IDs from Gemini via fallback cleaning.`);
                } else {
                    console.warn('[Recommendations] Gemini response structure invalid even after fallback cleaning.');
                    console.warn('(Original raw response was:', recommendedDataRaw + ')');
                }
            }

        } catch (parseError) {
             console.error('[Recommendations] Failed to parse JSON response from Gemini:', parseError);
             // Log the string that failed parsing (either extracted or cleaned)
             console.error('String attempted for parsing:', cleanedJsonString); 
             console.error('Original Raw Response was:', recommendedDataRaw);
             console.log('[Recommendations] Falling back to recent jobs due to AI parsing error.');
             const recentJobs = await Job.find({ status: 'open' }).sort({ createdAt: -1 }).limit(10).populate('employer', 'name companyName').lean();
             return res.json({ jobs: recentJobs, message: 'Error processing AI recommendations, showing recent jobs.' });
        }

        let finalRecommendedJobs = [];
        if (recommendedJobIds.length > 0) {
            console.log(`[Recommendations] Fetching details for ${recommendedJobIds.length} recommended jobs...`);
            // Fetch jobs preserving the order recommended by Gemini
            const recommendedJobsMap = new Map();
             const jobsFromDb = await Job.find({ _id: { $in: recommendedJobIds } })
                                       .populate('employer', 'name companyName') // Populate needed fields
                                       .lean(); // Use lean for plain objects

            jobsFromDb.forEach(job => recommendedJobsMap.set(job._id.toString(), job));

            // Reconstruct the list in the order Gemini provided
            finalRecommendedJobs = recommendedJobIds
                .map(id => recommendedJobsMap.get(id))
                .filter(job => job); // Filter out any potential nulls if a job ID wasn't found
        }

        console.log(`[Recommendations] Returning ${finalRecommendedJobs.length} AI-powered recommendations.`);

        return res.json({
            jobs: finalRecommendedJobs,
            message: 'AI-powered recommendations based on your profile.'
        });

    } catch (error) {
        const errorUserId = req?.user?.id || 'unknown'; // Safely get user ID
        console.error(`[Recommendations] Error fetching AI job recommendations for user ID ${errorUserId}:`, error);
        // Check if it's a Gemini-specific error
        if (error.message.includes('GoogleGenerativeAI') || error.message.includes('generateContent')) {
             console.error('[Recommendations] Gemini API Error Details:', error);
             return res.status(502).json({ message: 'Failed to get recommendations from AI service.' });
        }
        return res.status(500).json({ message: 'Server error while fetching AI recommendations' });
    }
});

// @route   GET /api/recommendations/similar-jobs/:jobId
// @desc    Get similar jobs to a specific job
// @access  Public
router.get('/similar-jobs/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const userId = req?.user?.id || 'public'; // Get user ID if available
        console.log(`[Similar Jobs] Received request for Job ID: ${jobId} (User: ${userId})`);
        
        // Find the reference job
        const referenceJob = await Job.findById(jobId).lean();
        if (!referenceJob) {
            console.log(`[Similar Jobs] Reference job ID ${jobId} not found.`);
            return res.status(404).json({ message: 'Job not found' });
        }
        console.log(`[Similar Jobs] Found reference job: "${referenceJob.title}"`);
        
        // Extract keywords from the job title and description
        const jobText = `${referenceJob.title || ''} ${referenceJob.description || ''}`.toLowerCase();
        
        // Simple keyword extraction (for a real app, use NLP or more sophisticated methods)
        const commonWords = ['and', 'the', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'is', 'are'];
        const keywords = jobText.split(/\s+/)
            .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
            .filter(word => word.length > 3 && !commonWords.includes(word))
            .map(escapeRegex)
            .slice(0, 10); // Take top 10 keywords
        
        console.log(`[Similar Jobs] Extracted keywords for similarity: [${keywords.join(', ')}]`);

        // Find similar jobs based on keywords, location, and job type
        const query = {
            _id: { $ne: jobId }, // Exclude the reference job
            status: 'open',
            $or: [
                { title: { $regex: keywords.join('|'), $options: 'i' } },
                { description: { $regex: keywords.join('|'), $options: 'i' } },
                { location: referenceJob.location },
                { type: referenceJob.type }
            ]
        };

        console.log(`[Similar Jobs] Querying for similar jobs:`, JSON.stringify(query));

        const similarJobs = await Job.find(query)
        .limit(5)
        .populate('employer', 'name companyName');
        
        console.log(`[Similar Jobs] Found ${similarJobs.length} similar jobs.`);
        return res.json(similarJobs);
    } catch (error) {
        const errorJobId = req?.params?.jobId || 'unknown';
        console.error(`[Similar Jobs] Error fetching similar jobs for Job ID ${errorJobId}:`, error);
        return res.status(500).json({ message: 'Server error while fetching similar jobs' });
    }
});

module.exports = router; 