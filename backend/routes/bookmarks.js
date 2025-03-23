const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const User = require('../models/User');

// Add job to bookmarks
router.post('/:jobId', auth, async (req, res) => {
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
        }

        res.json({ message: 'Job bookmarked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove job from bookmarks
router.delete('/:jobId', auth, async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const userId = req.user.id;

        // Remove job from user's bookmarks
        const user = await User.findById(userId);
        user.bookmarks = user.bookmarks.filter(id => id.toString() !== jobId);
        await user.save();

        res.json({ message: 'Job removed from bookmarks' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all bookmarked jobs
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('bookmarks');
        res.json(user.bookmarks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 