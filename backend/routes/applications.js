const express = require('express');
const router = express.Router();
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   POST /api/applications/:id/rate-interview
// @desc    Rate a candidate after interview
// @access  Private (employer only)
router.post('/:id/rate-interview', [
    auth,
    check('rating', 'Overall rating is required').isInt({ min: 1, max: 5 }),
    check('technicalSkills', 'Technical skills rating must be between 1-5').optional().isInt({ min: 1, max: 5 }),
    check('communication', 'Communication rating must be between 1-5').optional().isInt({ min: 1, max: 5 }),
    check('culturalFit', 'Cultural fit rating must be between 1-5').optional().isInt({ min: 1, max: 5 }),
    check('problemSolving', 'Problem solving rating must be between 1-5').optional().isInt({ min: 1, max: 5 }),
    check('feedback', 'Feedback is required').notEmpty(),
    check('strengths', 'Strengths must be an array').optional().isArray(),
    check('weaknesses', 'Weaknesses must be an array').optional().isArray()
], async (req, res) => {
    console.log(`[CandidateRating] Received request to rate candidate for application ID: ${req.params.id} from user ID: ${req.user.id}`);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(`[CandidateRating] Validation errors: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Find the application
        const application = await JobApplication.findById(req.params.id)
            .populate('job', 'employer');
        
        if (!application) {
            console.log(`[CandidateRating] Application not found: ${req.params.id}`);
            return res.status(404).json({ msg: 'Application not found' });
        }

        // Verify the request is from the employer
        const job = application.job;
        if (!job || job.employer.toString() !== req.user.id) {
            console.log(`[CandidateRating] Authorization failed - user ${req.user.id} is not the employer of this job`);
            return res.status(403).json({ msg: 'Not authorized to rate this application' });
        }

        console.log(`[CandidateRating] Rating details: Application ID: ${req.params.id}, Rating: ${req.body.rating}/5`);
        if (req.body.technicalSkills) console.log(`[CandidateRating] Technical skills: ${req.body.technicalSkills}/5`);
        if (req.body.communication) console.log(`[CandidateRating] Communication: ${req.body.communication}/5`);
        if (req.body.culturalFit) console.log(`[CandidateRating] Cultural fit: ${req.body.culturalFit}/5`);
        if (req.body.problemSolving) console.log(`[CandidateRating] Problem solving: ${req.body.problemSolving}/5`);

        // Create interview rating object
        const ratingData = {
            rating: req.body.rating,
            technicalSkills: req.body.technicalSkills,
            communication: req.body.communication,
            culturalFit: req.body.culturalFit,
            problemSolving: req.body.problemSolving,
            strengths: req.body.strengths || [],
            weaknesses: req.body.weaknesses || [],
            feedback: req.body.feedback,
            interviewer: req.user.id
        };

        // Add the rating to application
        application.interviewRatings.push(ratingData);
        
        // If status is currently "interview", update to "reviewed"
        if (application.status === 'interview') {
            application.status = 'reviewed';
            
            // Add to application history
            application.applicationHistory.push({
                status: 'reviewed',
                note: 'Interview completed and candidate rated'
            });
            console.log(`[CandidateRating] Updated application status to 'reviewed'`);
        }

        await application.save();
        console.log(`[CandidateRating] Successfully saved rating for application ID: ${req.params.id}`);

        res.json(application);
    } catch (err) {
        console.error(`[CandidateRating] Error rating candidate:`, err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/applications/:id/interview-ratings
// @desc    Get all interview ratings for a specific application
// @access  Private (employer only)
router.get('/:id/interview-ratings', auth, async (req, res) => {
    console.log(`[CandidateRating] Received request to fetch ratings for application ID: ${req.params.id} from user ID: ${req.user.id}`);
    
    try {
        // Find the application
        const application = await JobApplication.findById(req.params.id)
            .populate('job', 'employer')
            .populate({
                path: 'interviewRatings.interviewer',
                select: 'name profileImage'
            });
        
        if (!application) {
            console.log(`[CandidateRating] Application not found: ${req.params.id}`);
            return res.status(404).json({ msg: 'Application not found' });
        }

        // Verify the request is from the employer
        const job = application.job;
        if (!job || job.employer.toString() !== req.user.id) {
            console.log(`[CandidateRating] Authorization failed - user ${req.user.id} is not the employer of this job`);
            return res.status(403).json({ msg: 'Not authorized to view ratings for this application' });
        }

        console.log(`[CandidateRating] Successfully retrieved ${application.interviewRatings.length} ratings for application ID: ${req.params.id}`);
        res.json({ ratings: application.interviewRatings });
    } catch (err) {
        console.error(`[CandidateRating] Error fetching ratings:`, err.message);
        res.status(500).send('Server Error');
    }
});

// Export the router
module.exports = router; 