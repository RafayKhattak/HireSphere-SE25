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
console.log('Setting up email transporter with credentials:', {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD ? '****' + process.env.EMAIL_PASSWORD.slice(-4) : 'missing'
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
    },
    debug: true, // Show debug output
    logger: true  // Log information into console
});

// Verify transporter on startup
transporter.verify(function(error, success) {
    if (error) {
        console.log('Email transporter verification failed:', error);
    } else {
        console.log('Email server is ready to take our messages');
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
        console.log('Register request received. Body:', JSON.stringify(req.body, null, 2));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', JSON.stringify(errors.array()));
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, type, name, firstName, lastName, companyName, companyDescription, phone, location } = req.body;

        console.log(`Checking if user exists with email: ${email}`);
        let user = await User.findOne({ email });
        if (user) {
            console.log(`Registration failed: User already exists with email: ${email}`);
            return res.status(400).json({ message: 'User already exists' });
        }
        console.log(`User with email ${email} does not exist, proceeding with registration.`);

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

        const userToLog = { ...user.toObject() };
        delete userToLog.password;
        console.log('Attempting to create new user:', JSON.stringify(userToLog, null, 2));

        console.log('Attempting to save user to database...');
        await user.save();
        console.log(`User ${email} saved successfully to database.`);

        const payload = {
            user: {
                id: user._id,
                type: user.type
            }
        };

        console.log(`Attempting to sign JWT for user ID: ${user._id}`);
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    return res.status(500).json({ message: 'Error generating token', error: err.message });
                }
                console.log(`JWT generated successfully for user: ${email}`);
                const userResponseData = {
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
                };
                console.log('Sending successful registration response:', JSON.stringify({ token: '...', user: userResponseData }, null, 2));
                res.status(201).json({
                    token,
                    user: userResponseData
                });
            }
        );
    } catch (err) {
        console.error('Unhandled error during registration:', err);
        res.status(500).json({ message: 'Server error during registration', error: err.message });
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
        console.log('Login request received. Email:', req.body.email);
        console.log('Login request body (excluding password):', JSON.stringify({ email: req.body.email }, null, 2));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Login validation errors:', JSON.stringify(errors.array()));
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        console.log(`Attempting to find user with email: ${email}`);
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`Login failed: User not found with email: ${email}`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        console.log(`User found with email: ${email}. Verifying password...`);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`Login failed: Invalid password for user: ${email}`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        console.log(`Password verified successfully for user: ${email}`);

        const payload = {
            user: {
                id: user._id,
                type: user.type
            }
        };

        console.log(`Attempting to sign JWT for user ID: ${user._id}`);
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error during login:', err);
                    return res.status(500).json({ message: 'Error generating token during login', error: err.message });
                }
                console.log(`Login successful, JWT generated for user: ${email}`);
                const userResponseData = {
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
                };
                console.log('Sending successful login response:', JSON.stringify({ token: '...', user: userResponseData }, null, 2));
                res.json({
                    token,
                    user: userResponseData
                });
            }
        );
    } catch (err) {
        console.error('Unhandled error during login:', err);
        res.status(500).json({ message: 'Server error during login', error: err.message });
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
        // Added log: Log the email requesting reset
        console.log('Password reset requested for email:', req.body.email);

        const { email } = req.body;

        // Added log: Indicate user lookup
        console.log(`Attempting to find user for password reset with email: ${email}`);
        const user = await User.findOne({ email });

        if (!user) {
            // Added log: User not found
            console.log(`Password reset request failed: User not found with email: ${email}`);
            // Still return a generic success message to prevent email enumeration
            return res.status(200).json({ message: 'If an account with that email exists, a password reset email has been sent.' });
        }
        // Added log: User found
        console.log(`User found for password reset: ${email}. Generating reset token...`);

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        // Added log: Log the raw token (for testing/debugging ONLY - remove in production)
        // console.log(`Generated raw reset token (for debugging): ${resetToken}`); 
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Added log: Indicate saving token to user
        console.log(`Saving hashed reset token and expiry for user: ${email}`);
        await user.save();
        console.log('Reset token details saved to user record.');

        // Create reset URL (ensure FRONTEND_URL is set in .env)
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
        // Added log: Log the generated reset URL (for testing/debugging ONLY - remove in production)
        console.log(`Generated password reset URL (for debugging): ${resetUrl}`);

        // Send email
        const mailOptions = {
            from: `"HireSphere" <${process.env.EMAIL_USER}>`, // Use a sender name
            to: user.email,
            subject: 'HireSphere Password Reset Request',
            html: `
                <div style="font-family: sans-serif; line-height: 1.6;">
                    <h2>HireSphere Password Reset</h2>
                    <p>You requested a password reset for your HireSphere account associated with this email address (${user.email}).</p>
                    <p>Please click the link below to set a new password:</p>
                    <p style="text-align: center;">
                        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </p>
                    <p>This link will expire in 10 minutes.</p>
                    <p>If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
                    <hr>
                    <p><small>If you're having trouble clicking the button, copy and paste the following URL into your web browser:</small></p>
                    <p><small>${resetUrl}</small></p>
                </div>
            `
        };

        // Added log: Indicate email sending attempt
        console.log(`Attempting to send password reset email to: ${user.email}`);
        console.log('Email options (excluding HTML body):', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`Password reset email sent successfully to: ${user.email}. Message ID: ${info.messageId}`);
            res.json({ message: 'Password reset email sent successfully.' });
        } catch (emailError) {
            // Added log: Log email sending failure
            console.error(`Error sending password reset email to ${user.email}:`, emailError);
            // Important: Don't leak the token here. Indicate server error.
            // Reset the token fields on the user if email fails, so they can try again?
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            console.log('Reset token fields cleared due to email send failure.');
            res.status(500).json({
                message: 'Failed to send password reset email. Please try again later.'
            });
        }
    } catch (err) {
        // Added log: Log any other errors in the forgot-password process
        console.error('Unhandled error during forgot password request:', err);
        res.status(500).json({ message: 'Server error during password reset request', error: err.message });
    }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
    try {
        // Added log: Indicate password reset attempt with token
        console.log('Password reset attempt received for token:', req.params.token);
        const { password } = req.body;

        // Added basic password validation (should match frontend)
        if (!password || password.length < 6) {
             console.log('Password reset failed: Password too short.');
             return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        console.log('Password length validation passed.');

        // Hash the token from the URL param the same way the stored token was hashed
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // Added log: Indicate lookup for user with hashed token
        console.log(`Attempting to find user with hashed reset token: ${resetPasswordToken.substring(0, 10)}...`); // Log only prefix
        
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() } // Check if token is not expired
        });

        if (!user) {
            // Added log: Invalid or expired token
            console.log('Password reset failed: Invalid or expired token.');
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }
        // Added log: Valid token found for user
        console.log(`Valid reset token found for user: ${user.email}. Updating password...`);

        // Set new password (pre-save hook in User model will hash it)
        user.password = password;
        // Clear the reset token fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        // Added log: Indicate saving updated user
        console.log(`Attempting to save updated user record for: ${user.email}`);
        await user.save();
        console.log(`Password reset successful and user record updated for: ${user.email}`);

        // Optionally: Log the user in immediately by sending back a new JWT?
        // For now, just confirm success.
        res.json({ message: 'Password has been reset successfully.' });

    } catch (err) {
        // Added log: Log any other errors during the reset process
        console.error('Unhandled error during password reset:', err);
        res.status(500).json({ message: 'Server error during password reset', error: err.message });
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

// @route   POST /api/auth/register-admin
// @desc    Register a new admin user (requires a secret key)
// @access  Public (but secured with a secret key)
router.post('/register-admin', [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').notEmpty().withMessage('Name is required'),
    body('secretKey').notEmpty().withMessage('Secret key is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check the secret key (this should be a secure value in production)
        const { email, password, name, secretKey } = req.body;
        
        // Simple secret key for development - in production use a strong, environment-stored secret
        const validSecretKey = 'hiresphere-admin-secret'; 
        
        if (secretKey !== validSecretKey) {
            return res.status(401).json({ message: 'Invalid secret key' });
        }

        // Check if admin already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create admin user
        user = new User({
            email,
            password,
            name,
            type: 'admin'
        });

        await user.save();

        // Generate JWT
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
                if (err) throw err;
                
                res.status(201).json({
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        name: user.name,
                        type: user.type
                    }
                });
            }
        );
    } catch (err) {
        console.error('Error creating admin:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 