const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const User = require('../models/User');

// Add job to bookmarks
router.post('/:jobId', auth, async (req, res) => {
    console.log(`[Bookmarks API - POST /${req.params.jobId}] Request received from user ${req.user.id}`);
    try {
        const jobId = req.params.jobId;
        const userId = req.user.id;

        // Check if job exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Add job to user's bookmarks
        const user = await User.findById(userId);
        if (!user.bookmarks.includes(jobId)) {
            user.bookmarks.push(jobId);
            await user.save();
            console.log(`[Bookmarks API - POST /${jobId}] Job added to bookmarks for user ${userId}`);
        } else {
            console.log(`[Bookmarks API - POST /${jobId}] Job ALREADY bookmarked for user ${userId}`);
        }

        res.json({ message: 'Job bookmarked successfully' });
    } catch (error) {
        console.error(`[Bookmarks API - POST /${req.params.jobId}] Error:`, error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove job from bookmarks
router.delete('/:jobId', auth, async (req, res) => {
    console.log(`[Bookmarks API - DELETE /${req.params.jobId}] Request received from user ${req.user.id}`);
    try {
        const jobId = req.params.jobId;
        const userId = req.user.id;

        // Remove job from user's bookmarks
        const user = await User.findById(userId);
        const initialLength = user.bookmarks.length;
        user.bookmarks = user.bookmarks.filter(id => id.toString() !== jobId);
        if (user.bookmarks.length < initialLength) {
            await user.save();
            console.log(`[Bookmarks API - DELETE /${jobId}] Job removed from bookmarks for user ${userId}`);
        } else {
            console.log(`[Bookmarks API - DELETE /${jobId}] Job NOT FOUND in bookmarks for user ${userId}`);
        }

        res.json({ message: 'Job removed from bookmarks' });
    } catch (error) {
        console.error(`[Bookmarks API - DELETE /${req.params.jobId}] Error:`, error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all bookmarked jobs
router.get('/', auth, async (req, res) => {
    console.log(`[Bookmarks API - GET /] Request received from user ${req.user.id}`);
    try {
        const user = await User.findById(req.user.id).populate('bookmarks');
        console.log(`[Bookmarks API - GET /] Found ${user.bookmarks.length} bookmarks for user ${req.user.id}`);
        res.json(user.bookmarks);
    } catch (error) {
        console.error('[Bookmarks API - GET /] Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 