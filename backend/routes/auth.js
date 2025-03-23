const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// @route   POST /api/auth/register
// @desc    Register a new user (job seeker or employer)
// @access  Public
router.post('/register', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('type').isIn(['jobseeker', 'employer']).withMessage('Invalid user type'),
    body('name').notEmpty().withMessage('Name is required'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('companyName').optional().trim(),
    body('companyDescription').optional().trim(),
    body('phone').optional().trim(),
    body('location').optional().trim()
], async (req, res) => {
    try {
        console.log('Register request received:', { email: req.body.email, type: req.body.type });
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, type, name, firstName, lastName, companyName, companyDescription, phone, location } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            console.log('Registration failed: User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user (password will be hashed by pre-save middleware)
        user = new User({
            email,
            password,
            type,
            name,
            firstName,
            lastName,
            companyName,
            companyDescription,
            phone,
            location
        });

        console.log('Creating new user:', { email, type });
        await user.save();
        console.log('User saved to database');

        // Create JWT token
        const payload = {
            user: {
                id: user._id,
                type: user.type
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    throw err;
                }
                console.log('Registration successful, token generated');
                res.status(201).json({
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        type: user.type,
                        name: user.name,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        companyName: user.companyName,
                        companyDescription: user.companyDescription,
                        phone: user.phone,
                        location: user.location
                    }
                });
            }
        );
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').exists().withMessage('Password is required')
], async (req, res) => {
    try {
        console.log('Login attempt for:', req.body.email);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            console.log('Login failed: User not found:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('User found, verifying password');
        
        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Login failed: Invalid password for user:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('Password verified successfully');

        // Create JWT token
        const payload = {
            user: {
                id: user._id,
                type: user.type
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    throw err;
                }
                console.log('Login successful, token generated');
                res.json({ 
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        type: user.type,
                        name: user.name,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        companyName: user.companyName,
                        companyDescription: user.companyDescription,
                        phone: user.phone,
                        location: user.location
                    }
                });
            }
        );
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Request password reset
// @access  Public
router.post('/reset-password', [
    body('email').isEmail().withMessage('Please enter a valid email')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 3600000; // 1 hour

        await user.save();

        // TODO: Send reset email
        // For now, just return the token
        res.json({ message: 'Password reset token generated', resetToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Request Password Reset
router.post('/forgot-password', async (req, res) => {
    try {
        console.log('Password reset requested for:', req.body.email);
        
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            console.log('Password reset failed: User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();
        console.log('Reset token generated and saved');

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Send email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <h1>You requested a password reset</h1>
                <p>Click this <a href="${resetUrl}">link</a> to reset your password.</p>
                <p>This link will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Reset email sent successfully');

        res.json({ message: 'Password reset email sent' });
    } catch (err) {
        console.error('Password reset request error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
    try {
        console.log('Processing password reset');
        
        const { password } = req.body;
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            console.log('Password reset failed: Invalid or expired token');
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Set new password (will be hashed by pre-save middleware)
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();
        console.log('Password reset successful for user:', user.email);

        res.json({ message: 'Password has been reset' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get User Profile
router.get('/me', auth, async (req, res) => {
    try {
        console.log('Fetching user profile for ID:', req.user.id);
        
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            console.log('User profile not found for ID:', req.user.id);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('User profile fetched successfully');
        res.json(user);
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router; 