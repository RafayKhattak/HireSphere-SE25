const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/recommendations/jobs
// @desc    Get AI-powered job recommendations for the current user
// @access  Private
router.get('/jobs', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can access job recommendations.' });
        }

        // Get the current user with their profile details
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Extract relevant user information for matching
        const userSkills = user.skills || [];
        const userLocations = user.preferredLocations || [];
        const userJobTypes = user.preferredJobTypes || [];
        
        // If user has no skills or preferences, return some recent jobs
        if (userSkills.length === 0 && userLocations.length === 0 && userJobTypes.length === 0) {
            const recentJobs = await Job.find({ status: 'open' })
                .sort({ createdAt: -1 })
                .limit(10);
            
            return res.json({
                jobs: recentJobs,
                message: 'Based on recent listings (add skills to your profile for better matches)'
            });
        }

        // Build query for matching jobs based on user profile
        let query = { status: 'open' };
        let scoreFactors = [];
        
        // Simple scoring function to rank jobs by relevance
        const calculateJobScore = (job) => {
            let score = 0;
            let matchFactors = [];
            
            // Check for skill matches in title, description, and requirements
            if (userSkills.length > 0) {
                const jobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
                const matchedSkills = userSkills.filter(skill => 
                    jobText.includes(skill.toLowerCase())
                );
                
                if (matchedSkills.length > 0) {
                    const skillScore = (matchedSkills.length / userSkills.length) * 5;
                    score += skillScore;
                    matchFactors.push(`${matchedSkills.length} skill matches`);
                }
            }
            
            // Check for location match
            if (userLocations.length > 0 && userLocations.some(loc => 
                job.location.toLowerCase().includes(loc.toLowerCase())
            )) {
                score += 3;
                matchFactors.push('location match');
            }
            
            // Check for job type match
            if (userJobTypes.length > 0 && userJobTypes.includes(job.type)) {
                score += 2;
                matchFactors.push('job type match');
            }
            
            return { score, matchFactors };
        };

        // For skills matching, we'll use a flexible approach with regex
        if (userSkills.length > 0) {
            const skillRegexes = userSkills.map(skill => new RegExp(skill, 'i'));
            query.$or = [
                { title: { $in: skillRegexes } },
                { description: { $in: skillRegexes } },
                { requirements: { $in: skillRegexes } }
            ];
            
            scoreFactors.push('skills');
        }

        // For location matching
        if (userLocations.length > 0) {
            query.location = { 
                $in: userLocations.map(loc => new RegExp(loc, 'i')) 
            };
            
            scoreFactors.push('location');
        }

        // For job type matching
        if (userJobTypes.length > 0) {
            query.type = { $in: userJobTypes };
            scoreFactors.push('job type');
        }

        // Find matching jobs
        let matchingJobs = await Job.find(query)
            .limit(50) // Get more initially to rank them
            .populate('employer', 'name companyName');
        
        // Score and rank jobs
        const scoredJobs = matchingJobs.map(job => {
            const { score, matchFactors } = calculateJobScore(job);
            return {
                job: job.toObject(),
                score,
                matchFactors
            };
        });
        
        // Sort by score (highest first) and take top 10
        scoredJobs.sort((a, b) => b.score - a.score);
        const topJobs = scoredJobs.slice(0, 10);
        
        // Format the response
        const recommendations = topJobs.map(item => ({
            ...item.job,
            matchScore: item.score,
            matchReasons: item.matchFactors
        }));
        
        return res.json({
            jobs: recommendations,
            message: `Recommendations based on your ${scoreFactors.join(', ')}`
        });
    } catch (error) {
        console.error('Error fetching job recommendations:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/recommendations/similar-jobs/:jobId
// @desc    Get similar jobs to a specific job
// @access  Public
router.get('/similar-jobs/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId;
        
        // Find the reference job
        const referenceJob = await Job.findById(jobId);
        if (!referenceJob) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        // Extract keywords from the job title and description
        const jobText = `${referenceJob.title} ${referenceJob.description}`.toLowerCase();
        
        // Simple keyword extraction (for a real app, use NLP or more sophisticated methods)
        const commonWords = ['and', 'the', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'is', 'are'];
        const keywords = jobText.split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.includes(word))
            .slice(0, 10); // Take top 10 keywords
        
        // Find similar jobs based on keywords, location, and job type
        const similarJobs = await Job.find({
            _id: { $ne: jobId }, // Exclude the reference job
            status: 'open',
            $or: [
                { title: { $regex: keywords.join('|'), $options: 'i' } },
                { description: { $regex: keywords.join('|'), $options: 'i' } },
                { location: referenceJob.location },
                { type: referenceJob.type }
            ]
        })
        .limit(5)
        .populate('employer', 'name companyName');
        
        return res.json(similarJobs);
    } catch (error) {
        console.error('Error fetching similar jobs:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 