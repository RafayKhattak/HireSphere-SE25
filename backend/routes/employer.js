const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const JobAnalytics = require('../models/JobAnalytics');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { body, validationResult } = require('express-validator');

// Import the Google AI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configure multer for memory storage (not file system)
const storage = multer.memoryStorage();

// File filter to only allow certain image formats
const fileFilter = (req, file, cb) => {
    // Add logging to debug the image upload
    console.log('Uploading file:', file.originalname, 'Mimetype:', file.mimetype);
    
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Create a single upload instance for all image uploads
const upload = multer({
    storage: storage, // Use memory storage for MongoDB
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Initialize Google Gemini API
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCKDyoST4sGKHYCNoTunjhQKk6VCXcB1fk";
const genAI = new GoogleGenerativeAI(apiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// @route   GET /api/employer/profile
// @desc    Get employer profile
// @access  Private (employer only)
router.get('/profile', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can access employer profiles.' });
        }

        const employer = await User.findById(req.user.id).select('-password');
        
        if (!employer) {
            return res.status(404).json({ message: 'Employer not found' });
        }
        
        return res.json(employer);
    } catch (error) {
        console.error('Error fetching employer profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/employer/profile
// @desc    Update employer profile
// @access  Private (employer only)
router.put('/profile', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can update employer profiles.' });
        }

        const {
            name,
            phone,
            company,
            companyDescription,
            website,
            location,
            industry,
            companySize,
            yearFounded,
            contactEmail,
            contactPhone,
            logoImage
        } = req.body;

        // Build profile update object
        const profileFields = {};
        
        if (name) profileFields.name = name;
        if (phone) profileFields.phone = phone;
        if (company) profileFields.company = company;
        if (companyDescription) profileFields.companyDescription = companyDescription;
        if (website) profileFields.website = website;
        if (location) profileFields.location = location;
        if (industry) profileFields.industry = industry;
        if (companySize) profileFields.companySize = companySize;
        if (yearFounded) profileFields.yearFounded = yearFounded;
        if (contactEmail) profileFields.contactEmail = contactEmail;
        if (contactPhone) profileFields.contactPhone = contactPhone;
        if (logoImage) profileFields.logoImage = logoImage;

        // Update employer profile
        const employer = await User.findByIdAndUpdate(
            req.user.id,
            { $set: profileFields },
            { new: true, runValidators: true }
        ).select('-password');
        
        return res.json(employer);
    } catch (error) {
        console.error('Error updating employer profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/employer/dashboard
// @desc    Get employer dashboard stats
// @access  Private (employer only)
router.get('/dashboard', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can access the dashboard.' });
        }

        // Get summary of job postings
        const jobCount = await Job.countDocuments({ employer: req.user.id });
        const activeJobCount = await Job.countDocuments({ employer: req.user.id, status: 'open' });
        const closedJobCount = await Job.countDocuments({ employer: req.user.id, status: 'closed' });
        
        // Get recent jobs
        const recentJobs = await Job.find({ employer: req.user.id })
            .sort({ createdAt: -1 })
            .limit(5);
        
        // Get analytics summary for all jobs
        const jobIds = await Job.find({ employer: req.user.id }).distinct('_id');
        
        const analyticsData = await JobAnalytics.aggregate([
            { $match: { job: { $in: jobIds } } },
            { $group: {
                _id: null,
                totalViews: { $sum: '$views' },
                totalApplications: { $sum: '$applications' },
                totalJobs: { $sum: 1 }
            }}
        ]);
        
        const analytics = analyticsData.length > 0 ? analyticsData[0] : {
            totalViews: 0,
            totalApplications: 0,
            totalJobs: 0
        };
        
        // Compile dashboard data
        const dashboardData = {
            jobs: {
                total: jobCount,
                active: activeJobCount,
                closed: closedJobCount
            },
            analytics: {
                totalViews: analytics.totalViews,
                totalApplications: analytics.totalApplications,
                viewsPerJob: jobCount > 0 ? (analytics.totalViews / jobCount).toFixed(2) : 0,
                applicationsPerJob: jobCount > 0 ? (analytics.totalApplications / jobCount).toFixed(2) : 0
            },
            recentJobs
        };
        
        return res.json(dashboardData);
    } catch (error) {
        console.error('Error fetching employer dashboard:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/employer/jobs/:jobId/analytics
// @desc    Get analytics for a specific job
// @access  Private (employer only)
router.get('/jobs/:jobId/analytics', auth, async (req, res) => {
    console.log(`[JobAnalytics] Request received for job ID: ${req.params.jobId} from user ID: ${req.user.id}`);
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            console.log(`[JobAnalytics] Access denied - user type is ${req.user.type}, not employer`);
            return res.status(403).json({ message: 'Access denied. Only employers can access job analytics.' });
        }

        const jobId = req.params.jobId;
        
        // Check if job exists and belongs to this employer
        const job = await Job.findById(jobId);
        if (!job) {
            console.log(`[JobAnalytics] Job not found with ID: ${jobId}`);
            return res.status(404).json({ message: 'Job not found' });
        }
        
        if (job.employer.toString() !== req.user.id) {
            console.log(`[JobAnalytics] Authorization failure - job belongs to ${job.employer.toString()}, not ${req.user.id}`);
            return res.status(403).json({ message: 'Not authorized to view analytics for this job' });
        }
        
        console.log(`[JobAnalytics] Fetching analytics for job: "${job.title}" (ID: ${jobId})`);
        
        // Get analytics for this job
        const analytics = await JobAnalytics.findOne({ job: jobId });
        if (!analytics) {
            console.log(`[JobAnalytics] No analytics record found for job ID: ${jobId}, returning default empty values`);
            return res.json({
                views: 0,
                uniqueViews: 0,
                applications: 0,
                clickThroughs: 0,
                viewSources: {},
                demographics: {},
                dailyStats: []
            });
        }
        
        console.log(`[JobAnalytics] Retrieved analytics - Views: ${analytics.views}, Applications: ${analytics.applications}`);
        
        // Log additional data for debugging
        if (analytics.dailyStats && analytics.dailyStats.length > 0) {
            const latestDate = new Date(Math.max(...analytics.dailyStats.map(stat => new Date(stat.date).getTime())));
            console.log(`[JobAnalytics] Daily stats available from ${analytics.dailyStats.length} days, most recent: ${latestDate.toISOString().split('T')[0]}`);
        }
        
        if (analytics.demographics && analytics.demographics.locations) {
            const locationsCount = analytics.demographics.locations.length;
            console.log(`[JobAnalytics] Demographics include ${locationsCount} distinct locations`);
            if (locationsCount > 0) {
                // Sort locations by count and get top locations
                const topLocations = [...analytics.demographics.locations]
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)
                    .map(loc => `${loc.location} (${loc.count})`);
                console.log(`[JobAnalytics] Top locations: ${topLocations.join(', ')}`);
            }
        }
        
        return res.json(analytics);
    } catch (error) {
        console.error('[JobAnalytics] Error fetching job analytics:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/employer/:employerId/public
// @desc    Get public employer profile for job seekers
// @access  Public
router.get('/:employerId/public', async (req, res) => {
    try {
        const employerId = req.params.employerId;
        
        const employer = await User.findById(employerId).select(
            'companyName companyDescription companyLogo companyWebsite companySize industry foundedYear socialMedia location'
        );
        
        if (!employer || employer.type !== 'employer') {
            return res.status(404).json({ message: 'Employer not found' });
        }
        
        // Count active jobs for this employer
        const jobCount = await Job.countDocuments({ 
            employer: employerId,
            status: 'open'
        });
        
        // Get a few active jobs as preview
        const activeJobs = await Job.find({ 
            employer: employerId,
            status: 'open'
        })
        .select('title location type')
        .sort({ createdAt: -1 })
        .limit(3);
        
        const publicProfile = {
            ...employer.toObject(),
            jobCount,
            featuredJobs: activeJobs
        };
        
        return res.json(publicProfile);
    } catch (error) {
        console.error('Error fetching public employer profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/employer/upload-logo
// @desc    Upload company logo
// @access  Private (employer only)
router.post('/upload-logo', auth, (req, res, next) => {
    console.log('*** LOGO UPLOAD REQUEST RECEIVED ***');
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Call multer middleware with memory storage
    upload.single('logo')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: err.message });
        }
        
        console.log('Multer processed request');
        console.log('File after multer:', req.file ? 'File received' : 'No file');
        next();
    });
}, async (req, res) => {
    try {
        console.log('Starting upload handler function');
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            console.log('User type is not employer:', req.user.type);
            return res.status(403).json({ message: 'Access denied. Only employers can upload logos.' });
        }

        // Check if file was uploaded
        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ message: 'Please upload an image file.' });
        }

        console.log('File uploaded successfully:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Store the image data in MongoDB
        const employer = await User.findByIdAndUpdate(
            req.user.id,
            { 
                $set: { 
                    companyLogoData: {
                        data: req.file.buffer,
                        contentType: req.file.mimetype
                    }
                } 
            },
            { new: true }
        ).select('-password');

        console.log('Employer profile updated with new logo data');
        console.log('*** LOGO UPLOAD COMPLETED SUCCESSFULLY ***');

        // Return an ID that can be used to reference the logo
        const logoId = employer._id.toString();
        const logoUrl = `/api/employer/logo/${logoId}`;

        // Update the companyLogo field with the URL
        await User.findByIdAndUpdate(
            req.user.id,
            { $set: { companyLogo: logoUrl } }
        );

        return res.json({ 
            logoUrl,
            message: 'Logo uploaded successfully' 
        });
    } catch (error) {
        console.error('Error in upload handler:', error);
        console.log('*** LOGO UPLOAD FAILED ***');
        return res.status(500).json({ message: 'Server error while uploading logo' });
    }
});

// @route   GET /api/employer/logo/:id
// @desc    Get company logo
// @access  Public
router.get('/logo/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user || !user.companyLogoData || !user.companyLogoData.data) {
            return res.status(404).send('Logo not found');
        }
        
        res.set('Content-Type', user.companyLogoData.contentType);
        return res.send(user.companyLogoData.data);
    } catch (error) {
        console.error('Error fetching logo:', error);
        return res.status(500).send('Server error');
    }
});

// @route   PUT /api/employer/personal-profile
// @desc    Update employer personal profile
// @access  Private (employer only)
router.put('/personal-profile', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can update employer profiles.' });
        }

        const {
            name,
            phone,
            location,
            profileImage
        } = req.body;

        // Build personal profile update object
        const profileFields = {};
        
        if (name) profileFields.name = name;
        if (phone) profileFields.phone = phone;
        if (location) profileFields.location = location;
        if (profileImage) profileFields.profileImage = profileImage;

        // Update employer profile
        const employer = await User.findByIdAndUpdate(
            req.user.id,
            { $set: profileFields },
            { new: true, runValidators: true }
        ).select('-password');
        
        return res.json(employer);
    } catch (error) {
        console.error('Error updating employer personal profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/employer/upload-profile-image
// @desc    Upload employer profile image
// @access  Private (employer only)
router.post('/upload-profile-image', auth, (req, res, next) => {
    console.log('*** PROFILE IMAGE UPLOAD REQUEST RECEIVED ***');
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    
    // Call multer middleware with memory storage
    upload.single('profile')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: err.message });
        }
        
        console.log('Multer processed request');
        console.log('File after multer:', req.file ? 'File received' : 'No file');
        next();
    });
}, async (req, res) => {
    try {
        console.log('Starting profile image upload handler function');
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            console.log('User type is not employer:', req.user.type);
            return res.status(403).json({ message: 'Access denied. Only employers can upload profile images.' });
        }

        // Check if file was uploaded
        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ message: 'Please upload an image file.' });
        }

        console.log('File uploaded successfully:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Store the image data in MongoDB
        const employer = await User.findByIdAndUpdate(
            req.user.id,
            { 
                $set: { 
                    profileImageData: {
                        data: req.file.buffer,
                        contentType: req.file.mimetype
                    }
                } 
            },
            { new: true }
        ).select('-password');

        console.log('Employer profile updated with new profile image data');
        console.log('*** PROFILE IMAGE UPLOAD COMPLETED SUCCESSFULLY ***');

        // Return an ID that can be used to reference the profile image
        const profileId = employer._id.toString();
        const profileImageUrl = `/api/employer/profile-image/${profileId}`;

        // Update the profileImage field with the URL
        await User.findByIdAndUpdate(
            req.user.id,
            { $set: { profileImage: profileImageUrl } }
        );

        return res.json({ 
            profileImageUrl,
            message: 'Profile image uploaded successfully' 
        });
    } catch (error) {
        console.error('Error in profile image upload handler:', error);
        console.log('*** PROFILE IMAGE UPLOAD FAILED ***');
        return res.status(500).json({ message: 'Server error while uploading profile image' });
    }
});

// @route   GET /api/employer/profile-image/:id
// @desc    Get profile image
// @access  Public
router.get('/profile-image/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user || !user.profileImageData || !user.profileImageData.data) {
            return res.status(404).send('Profile image not found');
        }
        
        res.set('Content-Type', user.profileImageData.contentType);
        return res.send(user.profileImageData.data);
    } catch (error) {
        console.error('Error fetching profile image:', error);
        return res.status(500).send('Server error');
    }
});

// @route   GET /api/employer/search/candidates
// @desc    Search for candidates based on skills and experience
// @access  Private (employer only)
router.get('/search/candidates', auth, async (req, res) => {
    // Added log: Start of request
    console.log(`[Candidate Search] Received request from employer ${req.user.id}. Query:`, req.query);
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            // Added log: Access denied
            console.log(`[Candidate Search] Access denied for user ${req.user.id} (not an employer).`);
            return res.status(403).json({ message: 'Access denied. Only employers can search for candidates.' });
        }

        const { skills, experience, location, useAI } = req.query;
        
        // Build the search query
        const searchQuery = { type: 'jobseeker' };
        
        // Add skills to search query if provided
        if (skills) {
            const skillsArray = skills.split(',').map(skill => skill.trim()).filter(Boolean); // Filter out empty strings
            // Added log: Log the skills array before creating regex
            console.log(`[Candidate Search] Filtered skills array:`, skillsArray);
            if (skillsArray.length > 0) { // Only add skills query if array is not empty
                searchQuery.skills = { $in: skillsArray.map(skill => new RegExp(`^${skill}$`, 'i')) };
            } else {
                 console.log(`[Candidate Search] Skills query skipped as skills array was empty after trim/filter.`);
            }
        }
        
        // Add location to search query if provided
        if (location) {
            searchQuery.location = { $regex: location, $options: 'i' };
        }
        
        // Added log: Constructed MongoDB query (before experience filter)
        console.log(`[Candidate Search] Base MongoDB Query:`, JSON.stringify(searchQuery));

        // Add experience filter directly to the MongoDB query if provided
        if (experience) {
            const experienceYears = parseInt(experience);
            if (!isNaN(experienceYears) && experienceYears >= 0) {
                 // Query the new numeric field
                searchQuery.totalYearsExperience = { $gte: experienceYears }; 
                console.log(`[Candidate Search] Added experience filter to query: totalYearsExperience >= ${experienceYears}`);
            } else {
                console.log(`[Candidate Search] Invalid or no experience year value provided: ${experience}. Skipping experience filter.`);
            }
        }

        // Execute the final query
        let candidates = await User.find(searchQuery)
            .select('firstName lastName title skills education experience location profileImage totalYearsExperience') // Select the new field too
            .sort({ createdAt: -1 })
            .lean(); 
        
        // Added log: Number of candidates found after ALL filters
        console.log(`[Candidate Search] Found ${candidates.length} candidates matching final query.`);

        // If AI-enhanced search is requested...
        if (useAI === 'true' && candidates.length > 0) {
             console.log(`[Candidate Search] Attempting AI-enhanced ranking for ${candidates.length} candidates...`);
            try {
                // Get the employer's active job listings for context
                const employerJobs = await Job.find({ employer: req.user.id, active: true })
                    .select('title description requirements')
                    .limit(3);
                
                // Create prompt for Gemini
                const prompt = `
                As a hiring AI, analyze these job seeker profiles and rank them based on their fit for my company's needs. 
                Consider their skills, experience, and education. My company has the following job openings:
                
                ${employerJobs.map(job => `
                Job Title: ${job.title}
                Description: ${job.description}
                Requirements: ${job.requirements}
                `).join('\n')}
                
                Here are the candidate profiles to analyze:
                
                ${candidates.map((candidate, index) => `
                Candidate ${index + 1}:
                Name: ${candidate.firstName} ${candidate.lastName}
                Title: ${candidate.title || 'Not specified'}
                Location: ${candidate.location || 'Not specified'}
                Skills: ${candidate.skills ? candidate.skills.join(', ') : 'None listed'}
                Experience: ${candidate.experience ? JSON.stringify(candidate.experience) : 'None listed'}
                Education: ${candidate.education ? JSON.stringify(candidate.education) : 'None listed'}
                `).join('\n')}
                
                For each candidate, provide:
                1. A match score from 0-100
                2. A list of strengths (what makes them a good fit)
                3. A list of gaps (where they might not meet requirements)
                
                Return the response as a JSON object with this structure:
                {
                  "rankedCandidates": [
                    {
                      "candidateIndex": 0,
                      "matchScore": 85,
                      "strengths": ["relevant skill 1", "relevant experience"],
                      "gaps": ["missing skill 1"]
                    }
                  ]
                }
                
                Sort candidates by matchScore in descending order. Include only the candidateIndex, matchScore, strengths, and gaps fields in your response.
                `;
                
                // Call Gemini API
                const result = await geminiModel.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
                const response = await result.response;
                const textResponse = response.text();
                
                // Parse the JSON response
                try {
                    // Extract JSON from the response text
                    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
                    const jsonStr = jsonMatch ? jsonMatch[0] : textResponse;
                    const aiAnalysis = JSON.parse(jsonStr);
                    
                    if (aiAnalysis.rankedCandidates && Array.isArray(aiAnalysis.rankedCandidates)) {
                        // Reorder candidates based on AI ranking
                        const rankedCandidates = [];
                        
                        aiAnalysis.rankedCandidates.forEach(ranking => {
                            const candidateIndex = ranking.candidateIndex;
                            if (candidateIndex >= 0 && candidateIndex < candidates.length) {
                                const candidate = candidates[candidateIndex];
                                rankedCandidates.push({
                                    ...candidate, // Remove .toObject() as candidate is already a plain object due to .lean()
                                    matchScore: ranking.matchScore || 0,
                                    strengths: ranking.strengths || [],
                                    gaps: ranking.gaps || []
                                });
                            }
                        });
                        
                        // Added log: Successful AI ranking
                        console.log(`[Candidate Search] AI ranking applied. Returning ${rankedCandidates.length} ranked candidates.`);
                        return res.json({
                            candidates: rankedCandidates,
                            totalCount: rankedCandidates.length,
                            aiEnhanced: true
                        });
                    }
                } catch (jsonError) {
                    console.error('Error parsing AI response:', jsonError);
                    // Added log: AI parsing error
                    console.log('[Candidate Search] AI response parsing failed. Falling back to regular results.');
                }
            } catch (aiError) {
                console.error('Error using AI for candidate ranking:', aiError);
                // Added log: AI API error
                console.log('[Candidate Search] AI API call failed. Falling back to regular results.');
            }
        }
        
        // Regular search results without AI enhancement
        // Added log: Returning regular results
        console.log(`[Candidate Search] Returning ${candidates.length} candidates (AI not used or failed).`);
        return res.json({
            candidates, // Already filtered by experience if applicable
            totalCount: candidates.length,
            aiEnhanced: false
        });
        
    } catch (error) {
        // Added log: General error
        console.error('[Candidate Search] Error searching for candidates:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 