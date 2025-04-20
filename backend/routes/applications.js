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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Find the application
        const application = await JobApplication.findById(req.params.id)
            .populate('job', 'employer');
        
        if (!application) {
            return res.status(404).json({ msg: 'Application not found' });
        }

        // Verify the request is from the employer
        const job = application.job;
        if (!job || job.employer.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to rate this application' });
        }

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
        }

        await application.save();

        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/applications/:id/interview-ratings
// @desc    Get all interview ratings for a specific application
// @access  Private (employer only)
router.get('/:id/interview-ratings', auth, async (req, res) => {
    try {
        // Find the application
        const application = await JobApplication.findById(req.params.id)
            .populate('job', 'employer')
            .populate({
                path: 'interviewRatings.interviewer',
                select: 'name profileImage'
            });
        
        if (!application) {
            return res.status(404).json({ msg: 'Application not found' });
        }

        // Verify the request is from the employer
        const job = application.job;
        if (!job || job.employer.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Not authorized to view ratings for this application' });
        }

        res.json({ ratings: application.interviewRatings });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Export the router
module.exports = router; 