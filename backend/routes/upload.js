const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(uploadsDir, 'profiles');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
}

// Set up multer storage for profile images
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, profilesDir);
    },
    filename: function(req, file, cb) {
        const uniquePrefix = uuidv4();
        cb(null, uniquePrefix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// @route   POST /api/upload/profile-image
// @desc    Upload profile image for user
// @access  Private
router.post('/profile-image', auth, upload.single('profileImage'), async (req, res) => {
    try {
        console.log('Upload request headers:', JSON.stringify(req.headers));
        console.log('Upload request received:', req.file ? 'File present' : 'No file');
        console.log('Request body keys:', Object.keys(req.body));
        
        if (!req.file) {
            console.log('No file in request. Files object:', req.files);
            console.log('Request body:', JSON.stringify(req.body));
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        console.log('File uploaded:', req.file.filename, 'Size:', req.file.size, 'Mimetype:', req.file.mimetype);
        console.log('File details:', JSON.stringify(req.file));
        
        // Get the file path that will be saved in the database
        const relativePath = `/uploads/profiles/${req.file.filename}`;
        
        // Update the user's profile with the new image path
        console.log('Updating user profile with image path:', relativePath);
        console.log('User ID:', req.user.id);
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, 
            { $set: { profileImage: relativePath } },
            { new: true }
        );
        
        console.log('User profile updated successfully:', updatedUser ? 'User found' : 'User not found');
        console.log('Updated profile image path:', updatedUser.profileImage);
        
        res.json({ 
            message: 'Image uploaded successfully', 
            imageUrl: relativePath 
        });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add a test route to verify uploads
// @route   POST /api/upload/test
// @desc    Test upload functionality
// @access  Public
router.post('/test', upload.single('testImage'), (req, res) => {
    try {
        console.log('Test upload request received');
        console.log('Headers:', JSON.stringify(req.headers));
        
        if (!req.file) {
            console.log('No file in test request');
            console.log('Body:', JSON.stringify(req.body));
            return res.status(400).json({ message: 'No file in test upload' });
        }
        
        console.log('Test file uploaded:', req.file.filename);
        console.log('File details:', JSON.stringify(req.file));
        
        const filePath = `/uploads/profiles/${req.file.filename}`;
        
        res.json({
            message: 'Test upload successful',
            file: req.file,
            path: filePath
        });
    } catch (error) {
        console.error('Test upload error:', error);
        res.status(500).json({ message: 'Test upload failed', error: error.message });
    }
});

// @route   POST /api/upload/profile-image-base64
// @desc    Upload profile image as base64 directly to MongoDB
// @access  Private
router.post('/profile-image-base64', auth, async (req, res) => {
    try {
        console.log('Base64 upload request received');
        
        const { image } = req.body;
        
        if (!image) {
            console.log('No image data in request');
            return res.status(400).json({ message: 'No image data provided' });
        }
        
        // Image should be in format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
        console.log('Image data received, length:', image.length);
        
        // Save the image data directly to the user profile
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                $set: { 
                    profileImage: image
                }
            },
            { new: true }
        );
        
        console.log('User profile updated with base64 image');
        
        res.json({
            message: 'Image uploaded successfully',
            imageUrl: image.substring(0, 50) + '...' // Only return a snippet for logging
        });
    } catch (error) {
        console.error('Error uploading base64 image:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 