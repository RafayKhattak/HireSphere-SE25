const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth'); // Assuming authentication is needed

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Private (Requires authentication)
router.get('/:id', auth, async (req, res) => {
    console.log(`[User Route] Received request to get user profile for ID: ${req.params.id}`);
    try {
        // Find user by ID, excluding the password and other sensitive fields if necessary
        const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!user) {
            console.log(`[User Route] User not found for ID: ${req.params.id}`);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[User Route] Found user: ${user.name} (${user.email})`);
        // Return the user profile data
        res.json(user);

    } catch (err) {
        console.error('[User Route] Error fetching user by ID:', err);
        // Handle potential CastError if ID format is invalid
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found (Invalid ID format)' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router; 