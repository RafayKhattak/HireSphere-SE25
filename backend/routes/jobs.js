const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/jobs
// @desc    Create a new job posting
// @access  Private (Employers only)
router.post('/', auth, async (req, res) => {
    try {
        // Check if user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Only employers can post jobs' });
        }

        const job = new Job({
            ...req.body,
            employer: req.user._id
        });

        await job.save();
        res.status(201).json(job);
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ message: 'Error creating job posting' });
    }
});

// @route   GET /api/jobs
// @desc    Get all job postings
// @access  Public
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.find({ status: 'open' })
            .populate('employer', 'name email')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Error fetching job postings' });
    }
});

// @route   GET /api/jobs/employer
// @desc    Get all jobs posted by the current employer
// @access  Private (Employers only)
router.get('/employer', auth, async (req, res) => {
    try {
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Only employers can access this route' });
        }

        const jobs = await Job.find({ employer: req.user._id })
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching employer jobs:', error);
        res.status(500).json({ message: 'Error fetching job postings' });
    }
});

// @route   GET /api/jobs/bookmarks/me
// @desc    Get all bookmarked jobs for the current job seeker
// @access  Private (Job Seekers only)
router.get('/bookmarks/me', auth, async (req, res) => {
    try {
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can access this route' });
        }

        const jobs = await Job.find({ bookmarkedBy: req.user._id })
            .populate('employer', 'name email')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching bookmarked jobs:', error);
        res.status(500).json({ message: 'Error fetching bookmarked jobs' });
    }
});

// @route   GET /api/jobs/:id
// @desc    Get a specific job posting
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('employer', 'name email');
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json(job);
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ message: 'Error fetching job posting' });
    }
});

// @route   PUT /api/jobs/:id
// @desc    Update a job posting
// @access  Private (Employers only)
router.put('/:id', auth, async (req, res) => {
    try {
        // Check if user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Only employers can update jobs' });
        }

        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if the user is the employer who posted the job
        if (job.employer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this job' });
        }

        // Update fields individually to handle nested objects properly
        const updateFields = {
            title: req.body.title,
            description: req.body.description,
            requirements: req.body.requirements,
            location: req.body.location,
            type: req.body.type,
            salary: {
                min: req.body.salary?.min,
                max: req.body.salary?.max,
                currency: req.body.salary?.currency || 'USD'
            }
        };

        // Remove undefined fields
        Object.keys(updateFields).forEach(key => {
            if (updateFields[key] === undefined) {
                delete updateFields[key];
            }
        });

        // Update the job
        Object.assign(job, updateFields);
        await job.save();

        res.json(job);
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ 
            message: 'Error updating job posting', 
            error: error.message,
            details: error.errors ? Object.values(error.errors).map(err => err.message) : undefined
        });
    }
});

// @route   DELETE /api/jobs/:id
// @desc    Delete a job posting
// @access  Private (Employers only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if the user is the employer who posted the job
        if (job.employer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this job' });
        }

        await Job.deleteOne({ _id: req.params.id });
        res.json({ message: 'Job removed' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Error deleting job posting', error: error.message });
    }
});

// @route   POST /api/jobs/:id/bookmark
// @desc    Bookmark/unbookmark a job
// @access  Private (Job Seekers only)
router.post('/:id/bookmark', auth, async (req, res) => {
    try {
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can bookmark jobs' });
        }

        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        const bookmarkIndex = job.bookmarkedBy.indexOf(req.user._id);
        if (bookmarkIndex === -1) {
            job.bookmarkedBy.push(req.user._id);
        } else {
            job.bookmarkedBy.splice(bookmarkIndex, 1);
        }

        await job.save();
        res.json(job);
    } catch (error) {
        console.error('Error bookmarking job:', error);
        res.status(500).json({ message: 'Error bookmarking job' });
    }
});

module.exports = router; 