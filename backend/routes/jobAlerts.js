const express = require('express');
const router = express.Router();
const JobAlert = require('../models/JobAlert');
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');
const jobAlertService = require('../services/jobAlertService');

// @route   GET /api/alerts
// @desc    Get all job alerts for the current user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can access alerts.' });
        }

        const alerts = await JobAlert.find({ jobSeeker: req.user.id });
        return res.json(alerts);
    } catch (error) {
        console.error('Error fetching job alerts:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/alerts
// @desc    Create a new job alert
// @access  Private
router.post('/', auth, async (req, res) => {
    console.log('[Job Alert Route - POST] Received request to create alert.'); // Log start
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            console.log(`[Job Alert Route - POST] Access denied: User ${req.user.id} is not a job seeker.`);
            return res.status(403).json({ message: 'Access denied. Only job seekers can create alerts.' });
        }

        const { name, keywords, locations, jobTypes, salary, frequency, isActive } = req.body; // Added name, isActive
        console.log('[Job Alert Route - POST] Request body:', req.body); // Log request body

        // Basic validation
        if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
            console.log('[Job Alert Route - POST] Validation failed: Keywords array is required.');
            return res.status(400).json({ message: 'Keywords are required' });
        }
        console.log('[Job Alert Route - POST] Validation passed.');

        // Create new job alert
        const newAlert = new JobAlert({
            jobSeeker: req.user.id,
            name: name || `Alert: ${keywords.join(', ').substring(0, 30)}...`, // Use provided name or generate one
            keywords: keywords,
            locations: locations || [],
            jobTypes: jobTypes || [],
            salary: salary || { min: 0, max: 0 },
            frequency: frequency || 'daily',
            isActive: isActive !== undefined ? isActive : true // Use provided isActive or default to true
        });
        console.log('[Job Alert Route - POST] New alert object prepared:', newAlert);

        const alert = await newAlert.save();
        console.log(`[Job Alert Route - POST] Alert saved successfully with ID: ${alert._id}`);
        
        // Update user alert settings if not already enabled
        const user = await User.findById(req.user.id);
        if (user && !user.alertSettings?.enabled) {
            console.log(`[Job Alert Route - POST] Enabling alert setting for user ${req.user.id}`);
            await User.findByIdAndUpdate(req.user.id, {
                'alertSettings.enabled': true
            });
        }
        
        console.log('[Job Alert Route - POST] Sending success response (201 Created).');
        return res.status(201).json(alert);
    } catch (error) {
        console.error('[Job Alert Route - POST] Error creating job alert:', error); // Log error
        return res.status(500).json({ message: 'Server error creating alert' });
    }
});

// @route   PUT /api/alerts/:id
// @desc    Update a job alert
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can update alerts.' });
        }

        const alertId = req.params.id;
        const { keywords, locations, jobTypes, salary, frequency, isActive } = req.body;

        // Check if alert exists and belongs to the user
        let alert = await JobAlert.findById(alertId);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        
        if (alert.jobSeeker.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only update your own alerts.' });
        }

        // Update alert
        alert = await JobAlert.findByIdAndUpdate(
            alertId,
            {
                keywords: keywords || alert.keywords,
                locations: locations || alert.locations,
                jobTypes: jobTypes || alert.jobTypes,
                salary: salary || alert.salary,
                frequency: frequency || alert.frequency,
                isActive: isActive !== undefined ? isActive : alert.isActive
            },
            { new: true }
        );
        
        return res.json(alert);
    } catch (error) {
        console.error('Error updating job alert:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete a job alert
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can delete alerts.' });
        }

        const alertId = req.params.id;

        // Check if alert exists and belongs to the user
        const alert = await JobAlert.findById(alertId);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        
        if (alert.jobSeeker.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only delete your own alerts.' });
        }

        // Delete alert
        await JobAlert.findByIdAndDelete(alertId);
        
        return res.json({ message: 'Alert deleted successfully' });
    } catch (error) {
        console.error('Error deleting job alert:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/alerts/matching-jobs
// @desc    Get jobs matching the user's alert criteria
// @access  Private
router.get('/matching-jobs', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can access matching jobs.' });
        }

        const alerts = await JobAlert.find({ 
            jobSeeker: req.user.id,
            isActive: true
        });

        if (alerts.length === 0) {
            return res.json([]);
        }

        // Build query for matching jobs
        let query = { status: 'open' };
        
        // Combine all alert criteria
        let keywordsList = [];
        let locationsList = [];
        let jobTypesList = [];
        
        alerts.forEach(alert => {
            if (alert.keywords && alert.keywords.length > 0) {
                keywordsList = [...keywordsList, ...alert.keywords];
            }
            if (alert.locations && alert.locations.length > 0) {
                locationsList = [...locationsList, ...alert.locations];
            }
            if (alert.jobTypes && alert.jobTypes.length > 0) {
                jobTypesList = [...jobTypesList, ...alert.jobTypes];
            }
        });

        // Remove duplicates
        keywordsList = [...new Set(keywordsList)];
        locationsList = [...new Set(locationsList)];
        jobTypesList = [...new Set(jobTypesList)];

        // Add filters to query
        if (keywordsList.length > 0) {
            const keywordRegex = keywordsList.map(keyword => new RegExp(keyword, 'i'));
            query.$or = [
                { title: { $in: keywordRegex } },
                { description: { $in: keywordRegex } },
                { requirements: { $in: keywordRegex } }
            ];
        }

        if (locationsList.length > 0) {
            query.location = { $in: locationsList.map(loc => new RegExp(loc, 'i')) };
        }

        if (jobTypesList.length > 0) {
            query.type = { $in: jobTypesList };
        }

        // Fetch matching jobs, newest first
        const matchingJobs = await Job.find(query)
            .sort({ createdAt: -1 })
            .limit(20);
        
        return res.json(matchingJobs);
    } catch (error) {
        console.error('Error fetching matching jobs:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/alerts/recent-matches
// @desc    Get recent job matches for the user's alerts
// @access  Private
router.get('/recent-matches', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can access matches.' });
        }

        // Get all active alerts for the user
        const alerts = await JobAlert.find({ 
            jobSeeker: req.user.id,
            isActive: true
        });

        if (alerts.length === 0) {
            return res.json({ matches: [] });
        }

        // Get recent matches for each alert (last 7 days)
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        let allMatches = [];
        for (const alert of alerts) {
            const matches = await jobAlertService.findMatchingJobs(alert, lastWeek);
            if (matches.length > 0) {
                allMatches = [...allMatches, ...matches];
            }
        }

        // Remove duplicates based on job ID
        const uniqueMatches = [...new Map(allMatches.map(job => [job._id.toString(), job])).values()];

        // Sort by newest first
        uniqueMatches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({ 
            matches: uniqueMatches.slice(0, 10),
            totalMatches: uniqueMatches.length
        });
    } catch (error) {
        console.error('Error fetching recent matches:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/alerts/test/:id
// @desc    Test a job alert by sending an immediate email
// @access  Private
router.post('/test/:id', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can test alerts.' });
        }

        const alertId = req.params.id;

        // Check if alert exists and belongs to the user
        const alert = await JobAlert.findById(alertId);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }
        
        if (alert.jobSeeker.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied. You can only test your own alerts.' });
        }

        // Find matching jobs (last 30 days)
        const lastMonth = new Date();
        lastMonth.setDate(lastMonth.getDate() - 30);
        
        const matchingJobs = await jobAlertService.findMatchingJobs(alert, lastMonth);
        
        if (matchingJobs.length === 0) {
            return res.json({ 
                success: false, 
                message: 'No matching jobs found in the last 30 days. Try broadening your alert criteria.' 
            });
        }

        // Get job seeker
        const jobSeeker = await User.findById(req.user.id);

        // Send test email
        const emailSent = await jobAlertService.sendAlertEmail(jobSeeker, alert, matchingJobs);
        
        if (emailSent) {
            return res.json({ 
                success: true, 
                message: `Test alert sent to ${jobSeeker.email} with ${matchingJobs.length} matches.` 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to send test alert email. Please try again later.' 
            });
        }
    } catch (error) {
        console.error('Error testing job alert:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

module.exports = router; 