const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { isEmployer } = require('../middleware/roleCheck');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');
const { GoogleGenerativeAI } = require('@google/genai');

// Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @route   POST /api/screening/analyze-candidates/:jobId
 * @desc    Analyze candidates for a job using AI
 * @access  Private (Employers only)
 */
router.post('/analyze-candidates/:jobId', authenticateUser, isEmployer, async (req, res) => {
    try {
        const jobId = req.params.jobId;
        
        // Verify the job belongs to the current employer
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        if (job.employer.toString() !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to access this job' });
        }
        
        // Get all applications for this job
        const applications = await Application.find({ job: jobId })
            .populate({
                path: 'jobSeeker',
                populate: {
                    path: 'user',
                    select: 'name email'
                }
            });
            
        if (applications.length === 0) {
            return res.status(404).json({ error: 'No applications found for this job' });
        }
        
        // Get detailed job seeker information for each application
        const detailedApplications = await Promise.all(applications.map(async (application) => {
            const jobSeeker = await JobSeeker.findById(application.jobSeeker._id);
            return {
                application,
                jobSeeker
            };
        }));
        
        // Use AI to analyze applications
        let analysisResults = [];
        
        try {
            // Try to use AI for analysis
            analysisResults = await Promise.all(detailedApplications.map(async (data) => {
                return await analyzeWithAI(job, data.application, data.jobSeeker);
            }));
        } catch (error) {
            console.error('Error using AI for analysis, falling back to standard scoring', error);
            // Fallback to simple scoring method
            analysisResults = detailedApplications.map((data) => {
                return scoreApplication(job, data.application, data.jobSeeker);
            });
        }
        
        // Sort results by score descending
        analysisResults.sort((a, b) => b.overallScore - a.overallScore);
        
        return res.json({
            job: {
                id: job._id,
                title: job.title,
                company: job.company,
                location: job.location
            },
            candidateAnalysis: analysisResults
        });
    } catch (error) {
        console.error('Error in candidate analysis:', error);
        return res.status(500).json({ error: 'Server error while analyzing candidates' });
    }
});

/**
 * @route   POST /api/screening/jobs/:jobId/candidates
 * @desc    Rank candidates for a job based on match percentage
 * @access  Private (Employers only)
 */
router.post('/jobs/:jobId/candidates', authenticateUser, isEmployer, async (req, res) => {
    try {
        const jobId = req.params.jobId;
        
        // Verify the job belongs to the current employer
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        if (job.employer.toString() !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to access this job' });
        }
        
        // Get all applications for this job
        const applications = await Application.find({ job: jobId })
            .populate({
                path: 'jobSeeker',
                populate: {
                    path: 'user',
                    select: 'name email'
                }
            });
            
        if (applications.length === 0) {
            return res.status(404).json({ error: 'No applications found for this job' });
        }
        
        // Get detailed job seeker information for each application
        const detailedApplications = await Promise.all(applications.map(async (application) => {
            const jobSeeker = await JobSeeker.findById(application.jobSeeker._id);
            return {
                application,
                jobSeeker
            };
        }));
        
        // Use Gemini AI to analyze and rank candidates
        let rankingResults = [];
        const useFallback = req.query.useFallback === 'true';
        
        if (!useFallback) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                
                // Create a comprehensive job description for AI analysis
                const jobDescription = {
                    title: job.title,
                    company: job.company,
                    description: job.description,
                    requirements: job.requirements,
                    skills: job.skills?.join(', ') || 'Not specified',
                    location: job.location,
                    type: job.type
                };
                
                // Process each candidate with AI to get detailed ranking
                rankingResults = await Promise.all(detailedApplications.map(async (data, index) => {
                    const candidate = {
                        name: data.jobSeeker.user.name,
                        skills: data.jobSeeker.skills?.join(', ') || 'Not provided',
                        experience: data.jobSeeker.experience?.map(exp => 
                            `${exp.title} at ${exp.company} (${exp.startDate.substring(0, 7)} to ${
                                exp.current ? 'Present' : exp.endDate.substring(0, 7)
                            }): ${exp.description}`).join(' | ') || 'Not provided',
                        education: data.jobSeeker.education?.map(edu => 
                            `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution} (${
                                edu.startDate.substring(0, 7)} to ${edu.endDate.substring(0, 7)
                            })`).join(' | ') || 'Not provided',
                        coverLetter: data.application.coverLetter || 'Not provided'
                    };
                    
                    // Construct the prompt for candidate ranking
                    const prompt = `
                    You are an AI-powered recruiting assistant helping to rank job candidates based on their match percentage for a specific job.
                    
                    Job details:
                    - Title: ${jobDescription.title}
                    - Company: ${jobDescription.company}
                    - Description: ${jobDescription.description}
                    - Requirements: ${jobDescription.requirements}
                    - Skills needed: ${jobDescription.skills}
                    - Location: ${jobDescription.location}
                    - Job type: ${jobDescription.type}
                    
                    Candidate #${index + 1} details:
                    - Name: ${candidate.name}
                    - Skills: ${candidate.skills}
                    - Experience: ${candidate.experience}
                    - Education: ${candidate.education}
                    - Cover Letter: ${candidate.coverLetter}
                    
                    Based on the job requirements and candidate profile, provide a detailed assessment with:
                    1. A match score from 0-100
                    2. Key strengths that match the job requirements (list 3-5)
                    3. Skill gaps or areas for improvement (list 2-3)
                    4. A brief explanation of why this candidate would be a good fit
                    
                    Format your response as a valid JSON object with these exact keys: matchScore, strengths, gaps, explanation
                    The matchScore should be a number, and strengths and gaps should be arrays of strings.
                    `;
                    
                    try {
                        // Generate content
                        const result = await model.generateContent(prompt);
                        const response = result.response;
                        const text = response.text();
                        
                        // Parse the JSON from the response
                        const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
                        const ranking = JSON.parse(jsonStr);
                        
                        return {
                            applicationId: data.application._id,
                            candidate: {
                                id: data.jobSeeker._id,
                                name: data.jobSeeker.user.name,
                                email: data.jobSeeker.user.email
                            },
                            matchScore: ranking.matchScore || 0,
                            strengths: ranking.strengths || [],
                            gaps: ranking.gaps || [],
                            explanation: ranking.explanation || '',
                            appliedAt: data.application.createdAt,
                            status: data.application.status
                        };
                    } catch (error) {
                        console.error(`Error ranking candidate ${index}:`, error);
                        // Return fallback scoring for this candidate
                        const fallbackScore = calculateFallbackScore(job, data.application, data.jobSeeker);
                        return fallbackScore;
                    }
                }));
            } catch (error) {
                console.error('Error using AI for candidate ranking, falling back to standard scoring', error);
                useFallback = true;
            }
        }
        
        // Fallback to simpler scoring method if AI fails
        if (useFallback || rankingResults.length === 0) {
            rankingResults = detailedApplications.map((data) => {
                return calculateFallbackScore(job, data.application, data.jobSeeker);
            });
        }
        
        // Sort results by match score descending
        rankingResults.sort((a, b) => b.matchScore - a.matchScore);
        
        return res.json({
            jobTitle: job.title,
            totalCandidates: rankingResults.length,
            candidates: rankingResults
        });
    } catch (error) {
        console.error('Error in candidate ranking:', error);
        return res.status(500).json({ error: 'Server error while ranking candidates' });
    }
});

/**
 * Helper function to calculate a fallback match score
 */
function calculateFallbackScore(job, application, jobSeeker) {
    // Calculate skills match percentage
    let skillsMatchScore = 0;
    let matchedSkills = [];
    
    if (job.skills && job.skills.length > 0 && jobSeeker.skills && jobSeeker.skills.length > 0) {
        matchedSkills = job.skills.filter(skill => 
            jobSeeker.skills.some(seekerSkill => 
                seekerSkill.toLowerCase().includes(skill.toLowerCase()) || 
                skill.toLowerCase().includes(seekerSkill.toLowerCase())
            )
        );
        
        skillsMatchScore = Math.round((matchedSkills.length / job.skills.length) * 100);
    }
    
    // Calculate experience relevance percentage
    let experienceScore = 0;
    
    if (jobSeeker.experience && jobSeeker.experience.length > 0) {
        // Basic scoring based on number of experiences
        experienceScore = Math.min(jobSeeker.experience.length * 20, 100);
        
        // Bonus for relevant experience
        const relevantExperiences = jobSeeker.experience.filter(exp => 
            exp.title.toLowerCase().includes(job.title.toLowerCase()) ||
            job.title.toLowerCase().includes(exp.title.toLowerCase()) ||
            exp.description.toLowerCase().includes(job.title.toLowerCase())
        );
        
        if (relevantExperiences.length > 0) {
            experienceScore = Math.min(experienceScore + 20, 100);
        }
    }
    
    // Calculate cover letter quality
    let coverLetterScore = 0;
    
    if (application.coverLetter) {
        const letterLength = application.coverLetter.length;
        
        // Basic scoring based on length and content
        if (letterLength < 100) {
            coverLetterScore = 30;
        } else if (letterLength < 300) {
            coverLetterScore = 60;
        } else {
            coverLetterScore = 80;
        }
        
        // Bonus for mentioning job title or company
        if (application.coverLetter.toLowerCase().includes(job.title.toLowerCase())) {
            coverLetterScore = Math.min(coverLetterScore + 10, 100);
        }
        
        if (application.coverLetter.toLowerCase().includes(job.company.toLowerCase())) {
            coverLetterScore = Math.min(coverLetterScore + 10, 100);
        }
    }
    
    // Calculate overall match score with appropriate weighting
    const matchScore = Math.round((skillsMatchScore * 0.6) + (experienceScore * 0.3) + (coverLetterScore * 0.1));
    
    // Generate basic strengths based on match areas
    const strengths = [];
    if (skillsMatchScore > 50) strengths.push(`Matches ${matchedSkills.length} of ${job.skills.length} required skills`);
    if (experienceScore > 60) strengths.push("Has relevant work experience");
    if (coverLetterScore > 70) strengths.push("Strong application with tailored cover letter");
    
    // Generate basic gaps
    const gaps = [];
    if (skillsMatchScore < 50) gaps.push("Missing several required skills");
    if (experienceScore < 40) gaps.push("Limited relevant experience");
    
    return {
        applicationId: application._id,
        candidate: {
            id: jobSeeker._id,
            name: jobSeeker.user.name,
            email: jobSeeker.user.email
        },
        matchScore,
        strengths,
        gaps,
        explanation: `Candidate matches ${matchScore}% of job requirements based on skills, experience, and application quality.`,
        appliedAt: application.createdAt,
        status: application.status
    };
}

/**
 * Function to analyze an application using Gemini AI
 */
async function analyzeWithAI(job, application, jobSeeker) {
    // Create a model instance
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Construct the prompt for the AI
    const prompt = `
    Task: Analyze this job candidate's fit for the following position and provide a detailed assessment.
    
    JOB DETAILS:
    - Title: ${job.title}
    - Company: ${job.company}
    - Description: ${job.description}
    - Requirements: ${job.requirements}
    - Skills Required: ${job.skills ? job.skills.join(', ') : 'Not specified'}
    
    CANDIDATE DETAILS:
    - Name: ${jobSeeker.user.name}
    - Skills: ${jobSeeker.skills ? jobSeeker.skills.join(', ') : 'Not provided'}
    - Experience: ${jobSeeker.experience ? jobSeeker.experience.map(exp => 
        `${exp.title} at ${exp.company} (${exp.startDate.substring(0, 7)} to ${
            exp.current ? 'Present' : exp.endDate.substring(0, 7)
        }): ${exp.description}`).join(' | ') : 'Not provided'}
    - Education: ${jobSeeker.education ? jobSeeker.education.map(edu => 
        `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution} (${
            edu.startDate.substring(0, 7)} to ${edu.endDate.substring(0, 7)
        })`).join(' | ') : 'Not provided'}
    - Cover Letter: ${application.coverLetter || 'Not provided'}
    
    Analyze this candidate and provide:
    1. Overall match score (0-100)
    2. Skills match score (0-100) with explanation
    3. Experience relevance score (0-100) with explanation
    4. Cover letter quality score (0-100) with explanation
    5. Key strengths (list 3)
    6. Areas of concern (list 2)
    7. Interview recommendations (3 specific questions to ask)
    
    Format the response as a valid JSON object with these exact keys: overallScore, skillsMatchScore, skillsMatchReason, experienceScore, experienceReason, coverLetterScore, coverLetterReason, strengths, concerns, interviewQuestions
    `;

    try {
        // Generate content
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // Parse the JSON from the response
        // Find JSON part in the response if it's not cleanly formatted
        const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
        const analysisResult = JSON.parse(jsonStr);
        
        // Add candidate info to the result
        return {
            ...analysisResult,
            applicationId: application._id,
            jobSeekerId: jobSeeker._id,
            candidateName: jobSeeker.user.name,
            candidateEmail: jobSeeker.user.email,
            applicationDate: application.createdAt
        };
    } catch (error) {
        console.error('Error in AI analysis:', error);
        // Return standard scoring as fallback
        return scoreApplication(job, application, jobSeeker);
    }
}

/**
 * Fallback function to score applications without AI
 */
function scoreApplication(job, application, jobSeeker) {
    // Calculate skills match score
    let skillsMatchScore = 0;
    let skillsMatchReason = 'No skills provided';
    
    if (job.skills && job.skills.length > 0 && jobSeeker.skills && jobSeeker.skills.length > 0) {
        const matchingSkills = job.skills.filter(skill => 
            jobSeeker.skills.some(seekerSkill => 
                seekerSkill.toLowerCase().includes(skill.toLowerCase()) || 
                skill.toLowerCase().includes(seekerSkill.toLowerCase())
            )
        );
        
        skillsMatchScore = Math.round((matchingSkills.length / job.skills.length) * 100);
        skillsMatchReason = `Candidate has ${matchingSkills.length} of ${job.skills.length} required skills.`;
    }
    
    // Calculate experience relevance
    let experienceScore = 0;
    let experienceReason = 'No experience provided';
    
    if (jobSeeker.experience && jobSeeker.experience.length > 0) {
        // Basic scoring based on number of experiences
        experienceScore = Math.min(jobSeeker.experience.length * 20, 100);
        
        // Check for title relevance with job title
        const relevantExperiences = jobSeeker.experience.filter(exp => 
            exp.title.toLowerCase().includes(job.title.toLowerCase()) ||
            job.title.toLowerCase().includes(exp.title.toLowerCase()) ||
            exp.description.toLowerCase().includes(job.title.toLowerCase())
        );
        
        if (relevantExperiences.length > 0) {
            experienceScore = Math.min(experienceScore + 20, 100);
        }
        
        experienceReason = `Candidate has ${jobSeeker.experience.length} positions in their work history.`;
    }
    
    // Calculate cover letter quality
    let coverLetterScore = 0;
    let coverLetterReason = 'No cover letter provided';
    
    if (application.coverLetter) {
        const letterLength = application.coverLetter.length;
        
        // Basic scoring based on length
        if (letterLength < 100) {
            coverLetterScore = 30;
            coverLetterReason = 'Cover letter is very short.';
        } else if (letterLength < 300) {
            coverLetterScore = 60;
            coverLetterReason = 'Cover letter is of moderate length.';
        } else {
            coverLetterScore = 80;
            coverLetterReason = 'Cover letter is detailed.';
        }
        
        // Check for job title mention
        if (application.coverLetter.toLowerCase().includes(job.title.toLowerCase())) {
            coverLetterScore = Math.min(coverLetterScore + 10, 100);
            coverLetterReason += ' Mentions the specific job title.';
        }
        
        // Check for company mention
        if (application.coverLetter.toLowerCase().includes(job.company.toLowerCase())) {
            coverLetterScore = Math.min(coverLetterScore + 10, 100);
            coverLetterReason += ' Mentions the company name.';
        }
    }
    
    // Calculate overall score
    const overallScore = Math.round((skillsMatchScore * 0.4) + (experienceScore * 0.4) + (coverLetterScore * 0.2));
    
    return {
        applicationId: application._id,
        jobSeekerId: jobSeeker._id,
        candidateName: jobSeeker.user.name,
        candidateEmail: jobSeeker.user.email,
        applicationDate: application.createdAt,
        overallScore,
        skillsMatchScore,
        skillsMatchReason,
        experienceScore,
        experienceReason,
        coverLetterScore,
        coverLetterReason,
        strengths: ['Based on keyword matching only'],
        concerns: ['Automated scoring has limitations'],
        interviewQuestions: [
            `Tell me more about your experience with ${job.skills?.[0] || 'this field'}.`,
            'What interests you about this position?',
            'Why do you want to work with our company?'
        ]
    };
}

module.exports = router; 