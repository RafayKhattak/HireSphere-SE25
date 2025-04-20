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

        // Fetch the employer to get company name
        const employer = await User.findById(req.user._id);
        if (!employer || !employer.companyName) {
            return res.status(400).json({ message: 'Please complete your company profile before posting jobs' });
        }

        const job = new Job({
            ...req.body,
            company: employer.companyName, // Use the company name from employer profile
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
// @desc    Get all job postings with optional filters
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { 
            location, 
            minSalary, 
            maxSalary, 
            jobType, 
            keywords,
            page = 1,
            limit = 10
        } = req.query;
        
        // Build query filters
        const query = { status: 'open' };
        
        // Filter by location
        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        
        // Filter by salary range
        if (minSalary || maxSalary) {
            query.salary = {};
            if (minSalary) query.salary['min'] = { $gte: Number(minSalary) };
            if (maxSalary) query.salary['max'] = { $lte: Number(maxSalary) };
        }
        
        // Filter by job type
        if (jobType) {
            query.type = jobType;
        }
        
        // Filter by keywords (search in title, description, requirements)
        if (keywords) {
            const keywordRegex = { $regex: keywords, $options: 'i' };
            query.$or = [
                { title: keywordRegex },
                { description: keywordRegex },
                { requirements: keywordRegex }
            ];
        }
        
        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Execute query with filters
        const jobs = await Job.find(query)
            .populate('employer', 'name email companyName companyLogo companyDescription')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        // Get total count for pagination
        const total = await Job.countDocuments(query);
        
        res.json({
            jobs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
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
            .populate('employer', 'name email companyName companyLogo companyDescription')
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
            .populate('employer', 'name email companyName companyLogo companyDescription industry companySize location');
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Track this view in job analytics
        if (job.status === 'open') {
            try {
                const JobAnalytics = require('../models/JobAnalytics');
                const source = req.query.source || 'direct';
                const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Try to find existing analytics for this job
                let analytics = await JobAnalytics.findOne({ job: job._id });
                
                if (!analytics) {
                    // Create new analytics if none exists
                    analytics = new JobAnalytics({
                        job: job._id,
                        views: 1,
                        uniqueViews: 1,
                        viewSources: {
                            [source]: 1
                        },
                        dailyStats: [{
                            date: today,
                            views: 1,
                            applications: 0
                        }],
                        lastUpdated: new Date(),
                        viewerIps: [userIp] // Track IP to count unique views
                    });
                    await analytics.save();
                } else {
                    // Update existing analytics
                    analytics.views += 1;
                    
                    // Track unique viewers by IP
                    let isNewViewer = false;
                    if (!analytics.viewerIps) {
                        analytics.viewerIps = [];
                    }
                    
                    if (!analytics.viewerIps.includes(userIp)) {
                        analytics.viewerIps.push(userIp);
                        analytics.uniqueViews += 1;
                        isNewViewer = true;
                    }
                    
                    // Update view source count
                    if (analytics.viewSources[source] !== undefined) {
                        analytics.viewSources[source] += 1;
                    } else {
                        analytics.viewSources.other += 1;
                    }
                    
                    // Update daily stats
                    const todayStats = analytics.dailyStats.find(
                        stat => new Date(stat.date).toDateString() === today.toDateString()
                    );
                    
                    if (todayStats) {
                        todayStats.views += 1;
                    } else {
                        analytics.dailyStats.push({
                            date: today,
                            views: 1,
                            applications: 0
                        });
                    }
                    
                    analytics.lastUpdated = new Date();
                    await analytics.save();
                }
            } catch (analyticsError) {
                // Don't let analytics error affect the job fetch
                console.error('Error tracking job view:', analyticsError);
            }
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
                currency: req.body.salary?.currency || 'PKR'
            }
            // Company field is not included here to prevent manual changes
            // Company name should always match the employer's profile
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
// @desc    Bookmark or unbookmark a job
// @access  Private (Job Seekers only)
router.post('/:id/bookmark', auth, async (req, res) => {
    try {
        // Only job seekers can bookmark jobs
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can bookmark jobs' });
        }

        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if already bookmarked
        const bookmarkIndex = job.bookmarkedBy.indexOf(req.user._id);
        
        if (bookmarkIndex === -1) {
            // Add bookmark
            job.bookmarkedBy.push(req.user._id);
            await job.save();
            res.json({ message: 'Job bookmarked', isBookmarked: true });
        } else {
            // Remove bookmark
            job.bookmarkedBy.splice(bookmarkIndex, 1);
            await job.save();
            res.json({ message: 'Job unbookmarked', isBookmarked: false });
        }
    } catch (error) {
        console.error('Error bookmarking job:', error);
        res.status(500).json({ message: 'Error bookmarking job', error: error.message });
    }
});

// @route   POST /api/jobs/:id/track-click
// @desc    Track when a user clicks on a job listing (e.g., "Apply Now" button)
// @access  Public
router.post('/:id/track-click', async (req, res) => {
    try {
        const jobId = req.params.id;
        const source = req.body.source || 'direct';
        
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        // Track this click in job analytics
        if (job.status === 'open') {
            try {
                const JobAnalytics = require('../models/JobAnalytics');
                
                // Update click-through count
                await JobAnalytics.findOneAndUpdate(
                    { job: jobId },
                    { 
                        $inc: { clickThroughs: 1 },
                        $set: { lastUpdated: new Date() }
                    },
                    { upsert: true }
                );
                
                return res.status(200).json({ success: true });
            } catch (analyticsError) {
                console.error('Error tracking job click:', analyticsError);
                return res.status(500).json({ message: 'Error tracking analytics' });
            }
        }
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error tracking job click:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 