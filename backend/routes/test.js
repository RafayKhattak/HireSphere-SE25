const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const jobAlertService = require('../services/jobAlertService');
const JobAlert = require('../models/JobAlert');
const User = require('../models/User');

// @route   GET /api/test
// @desc    Test if the API is working
// @access  Public
router.get('/', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ message: 'API is working!' });
});

// @route   POST /api/test/echo
// @desc    Test endpoint that echoes back what it receives
// @access  Public
router.post('/echo', (req, res) => {
    console.log('Echo endpoint hit');
    console.log('Request headers:', req.headers);
    console.log('Request body keys:', Object.keys(req.body));
    
    // Echo back what we received
    res.json({
        message: 'Echo test successful',
        receivedHeaders: req.headers,
        receivedBody: req.body,
        receivedBodyKeys: Object.keys(req.body),
        receivedBodySize: JSON.stringify(req.body).length
    });
});

// @route   POST /api/test/image
// @desc    Test endpoint for base64 image upload
// @access  Public
router.post('/image', (req, res) => {
    console.log('Image test endpoint hit');
    console.log('Request headers:', req.headers);
    
    const { image } = req.body;
    
    if (!image) {
        console.log('No image data in request');
        console.log('Request body keys:', Object.keys(req.body));
        return res.status(400).json({ message: 'No image data provided' });
    }
    
    console.log('Image data received, length:', image.length);
    console.log('Image data prefix:', image.substring(0, 50));
    
    // Successfully process the image
    res.json({
        message: 'Image test successful',
        imageReceived: true,
        imageLength: image.length,
        imagePrefix: image.substring(0, 50)
    });
});

// @route   GET /api/test/job-alerts
// @desc    Test job alerts for the current user
// @access  Private
router.get('/job-alerts', auth, async (req, res) => {
  try {
    // Ensure user is a job seeker
    if (req.user.type !== 'jobseeker') {
      return res.status(403).json({ message: 'Access denied. Only job seekers can test alerts.' });
    }

    // Get all alerts for the user
    const alerts = await JobAlert.find({ jobSeeker: req.user.id, isActive: true });
    
    if (alerts.length === 0) {
      return res.json({ 
        message: 'No active job alerts found. Please create at least one job alert first.',
        alerts: []
      });
    }

    // Get user data
    const user = await User.findById(req.user.id);
    
    // For testing purposes, we'll find all matching jobs from the last month
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    // Process each alert
    const results = [];
    for (const alert of alerts) {
      const matchingJobs = await jobAlertService.findMatchingJobs(alert, lastMonth);
      
      results.push({
        alertId: alert._id,
        keywords: alert.keywords,
        locations: alert.locations,
        jobTypes: alert.jobTypes,
        frequency: alert.frequency,
        matchCount: matchingJobs.length,
        // Include sample of matching jobs (first 3)
        sampleMatches: matchingJobs.slice(0, 3).map(job => ({
          _id: job._id,
          title: job.title,
          company: job.employer?.companyName || job.company,
          location: job.location,
          type: job.type
        }))
      });
      
      // If there are matching jobs, send a test email
      if (matchingJobs.length > 0) {
        await jobAlertService.sendAlertEmail(user, alert, matchingJobs);
      }
    }
    
    return res.json({
      message: `Processed ${alerts.length} job alerts. Check your email for test notifications.`,
      alerts: results
    });
  } catch (error) {
    console.error('Error testing job alerts:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 