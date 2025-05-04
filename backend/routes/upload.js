const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Import Gemini
const pdfParse = require('pdf-parse'); // Library to read PDF text
// Optional: Add library for DOCX parsing if needed, e.g., mammoth
// const mammoth = require("mammoth"); 

// --- Gemini AI Setup ---
const apiKey = process.env.GEMINI_API_KEY;
let genAI;
let geminiModel;

if (apiKey) {
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log('[Upload Route] Gemini AI client initialized successfully.');
    } catch (error) {
        console.error('[Upload Route] Failed to initialize Gemini AI client:', error);
        genAI = null; geminiModel = null;
    }
} else {
    console.warn('[Upload Route] GEMINI_API_KEY not found. Resume parsing via AI disabled.');
    genAI = null; geminiModel = null;
}
// ----------------------


// --- Directories ---
const uploadsDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const resumesDir = path.join(uploadsDir, 'resumes'); // Directory for resumes

// Ensure directories exist
[uploadsDir, profilesDir, resumesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});
// console.log('Uploads directories checked/created.'); // Less verbose log
// console.log(`Serving static files from: ${uploadsDir}`);


// --- Multer Setup for Profile Images ---
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profilesDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const imageFileFilter = (req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files allowed!'), false);
};
const profileImageUpload = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFileFilter
});

// --- Multer Setup for Resumes ---
// Using memoryStorage to parse directly without saving temp file (optional)
// Or use diskStorage if you want to save the original resume file
const resumeStorage = multer.memoryStorage(); // Store file in memory buffer
const resumeFileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.error(`[Resume Upload] Invalid file type attempted: ${file.mimetype}`);
        cb(new Error('Invalid file type. Only PDF, DOCX, DOC allowed.'), false);
    }
};
const resumeUpload = multer({
    storage: resumeStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for resumes too
    fileFilter: resumeFileFilter
});


// --- ROUTES ---

// Profile Image Upload (existing)
router.post('/profile-image', auth, profileImageUpload.single('profileImage'), async (req, res) => {
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
        const relativePath = `/uploads/profiles/${path.basename(req.file.path)}`;
        
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
router.post('/test', profileImageUpload.single('testImage'), (req, res) => {
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

// --- NEW: Resume Upload & Parse Route ---
// @route   POST /api/upload/resume
// @desc    Upload and parse resume to update user profile
// @access  Private (Job Seekers only)
router.post('/resume', auth, resumeUpload.single('resumeFile'), async (req, res) => {
    // Make sure user is a job seeker
    if (req.user.type !== 'jobseeker') {
        console.log(`[Resume Upload] Access denied for user ID: ${req.user.id} (not a job seeker).`);
        return res.status(403).json({ message: 'Access denied. Only job seekers can upload resumes.' });
    }

    console.log(`[Resume Upload] Received request for user ID: ${req.user.id}`);

    if (!req.file) {
        console.log('[Resume Upload] No file uploaded in the request.');
        return res.status(400).json({ message: 'No resume file uploaded.' });
    }

    console.log(`[Resume Upload] File received: ${req.file.originalname}, Type: ${req.file.mimetype}, Size: ${req.file.size} bytes`);

    // Check if Gemini is available for parsing
    if (!geminiModel) {
        console.warn('[Resume Upload] Gemini AI model not available. Cannot parse resume.');
        // Return error or maybe just save the file path without parsing?
        return res.status(503).json({ message: 'Resume parsing service is currently unavailable.' });
    }

    try {
        // --- Extract Text from Resume ---
        let resumeText = '';
        console.log('[Resume Upload] Attempting to extract text from resume...');
        if (req.file.mimetype === 'application/pdf') {
            const data = await pdfParse(req.file.buffer);
            resumeText = data.text;
            console.log(`[Resume Upload] Successfully extracted ${resumeText.length} characters from PDF.`);
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // Add DOCX parsing logic here if needed (e.g., using 'mammoth')
             console.warn('[Resume Upload] DOCX parsing not fully implemented yet.');
             // Example using mammoth (needs npm install mammoth):
             // const mammothResult = await mammoth.extractRawText({ buffer: req.file.buffer });
             // resumeText = mammothResult.value;
             resumeText = "DOCX parsing placeholder - text extraction needed."; // Placeholder
        } else if (req.file.mimetype === 'application/msword') {
             console.warn('[Resume Upload] .doc parsing not implemented.');
             resumeText = "Legacy .doc format parsing not supported."; // Placeholder
        } else {
            console.error(`[Resume Upload] Unexpected file type after filter: ${req.file.mimetype}`);
            return res.status(400).json({ message: 'Unsupported resume file type for parsing.' });
        }

        if (!resumeText || resumeText.trim().length < 50) { // Basic check for extracted text
             console.warn(`[Resume Upload] Extracted text seems empty or too short. Length: ${resumeText?.length}`);
             return res.status(400).json({ message: 'Could not extract sufficient text from the resume.' });
        }

        // --- Prepare Prompt for Gemini ---
        const prompt = `
            Analyze the following resume text and extract the job seeker's profile information.
            Provide the output as a valid JSON object containing the keys: "contactInfo", "summary", "workExperience", "education", and "skills".

            Rules:
            - "contactInfo": Extract name, email, phone, location/address if available. Should be an object.
            - "summary": Extract the professional summary or objective statement, if present. Should be a string.
            - "workExperience": Extract job history. Should be an array of objects, each with "jobTitle", "company", "location", "startDate", "endDate", "description". Dates can be approximate strings.
            - "education": Extract educational background. Should be an array of objects, each with "degree", "institution", "location", "graduationDate".
            - "skills": Extract a list of technical and soft skills. Should be an array of strings.
            - If a section is not found, use an empty string, empty array [], or empty object {} as appropriate for the key's value type.
            - Ensure the entire output is a single, valid JSON object.

            Resume Text:
            ---
            ${resumeText.substring(0, 30000)} 
            ---

            JSON Output:
        `; // Corrected template literal termination
        // Note: Increased substring length for Gemini context window

        console.log('[Resume Upload] Sending extracted text to Gemini for parsing...');
        // console.log('--- Gemini Prompt Start ---');
        // console.log(prompt.substring(0, 500) + '...'); // Log beginning of prompt
        // console.log('--- Gemini Prompt End ---');

        // --- Call Gemini API ---
         const generationConfig = {
           responseMimeType: "application/json", // Request JSON output
         };
         const result = await geminiModel.generateContent(prompt, generationConfig);
         const response = result.response;
         const parsedDataJson = response.text();

        console.log('[Resume Upload] Received parsing response from Gemini.');

        // --- Parse Gemini Response ---
        let parsedData;
        try {
            parsedData = JSON.parse(parsedDataJson);
            console.log('[Resume Upload] Successfully parsed JSON response from Gemini.');
             // Log extracted keys for verification
             // console.log('Gemini Extracted Data:', JSON.stringify(parsedData, null, 2));
        } catch (parseError) {
            console.error('[Resume Upload] Failed to parse JSON response from Gemini:', parseError);
            console.error('Gemini Raw Response:', parsedDataJson);
            return res.status(500).json({ message: 'Error processing parsed resume data.' });
        }

        // --- Update User Profile ---
        console.log(`[Resume Upload] Attempting to update profile for user: ${req.user.id}`);
        const user = await User.findById(req.user.id);
        if (!user) {
             console.error(`[Resume Upload] User ${req.user.id} not found for profile update.`);
            return res.status(404).json({ message: 'User not found.' });
        }

        // Map parsed data to user model fields (adjust field names if necessary)
        const updateData = {};
        // Only update name/email if user doesn't already have one set
        if (parsedData.contactInfo?.name && !user.name) updateData.name = parsedData.contactInfo.name;
        // Removed automatic email update - too risky
        // if (parsedData.contactInfo?.email && !user.email) updateData.email = parsedData.contactInfo.email; 
        if (parsedData.contactInfo?.phone) updateData.phone = parsedData.contactInfo.phone;
        if (parsedData.contactInfo?.location) updateData.location = parsedData.contactInfo.location; 
        if (parsedData.summary) updateData.summary = parsedData.summary; 
        if (parsedData.skills?.length > 0) {
            const existingSkillsLower = (user.skills || []).map(s => s.toLowerCase());
             // Ensure parsedData.skills is an array of strings
             const newSkills = Array.isArray(parsedData.skills) ? parsedData.skills.filter(s => typeof s === 'string' && s && !existingSkillsLower.includes(s.toLowerCase())) : [];
            if (newSkills.length > 0) {
                updateData.skills = [...(user.skills || []), ...newSkills];
                 console.log(`[Resume Upload] Adding ${newSkills.length} new skills: [${newSkills.join(', ')}]`);
            }
        }
         // Ensure workExperience and education are arrays before attempting to access length
        if (Array.isArray(parsedData.workExperience) && parsedData.workExperience.length > 0) {
             // Basic validation for work experience entries
             const validWorkExperience = parsedData.workExperience.filter(exp => exp && exp.jobTitle && exp.company);
             if (validWorkExperience.length > 0) {
                updateData.workExperience = validWorkExperience; // Replace or merge logic? Replacing for now.
                console.log(`[Resume Upload] Updating work experience with ${validWorkExperience.length} valid entries.`);
             }
        }
        if (Array.isArray(parsedData.education) && parsedData.education.length > 0) {
             // Basic validation for education entries
             const validEducation = parsedData.education.filter(edu => edu && edu.degree && edu.institution);
             if (validEducation.length > 0) {
                 updateData.education = validEducation; // Replace or merge logic? Replacing for now.
                 console.log(`[Resume Upload] Updating education with ${validEducation.length} valid entries.`);
             }
        }

        if (Object.keys(updateData).length > 0) {
            console.log('[Resume Upload] Applying updates to user model:', Object.keys(updateData));
            await User.findByIdAndUpdate(req.user.id, { $set: updateData });
            console.log(`[Resume Upload] User profile ${req.user.id} updated successfully.`);
        } else {
             console.log('[Resume Upload] No new information extracted/applicable to update the user profile.');
        }

        // Respond with success and maybe the parsed data (or just a success message)
        res.json({
            message: 'Resume uploaded and parsed successfully.',
            // Return the fields that were actually updated
            updatedFields: updateData // Send back what was changed
        });

    } catch (error) {
        console.error(`[Resume Upload] Error processing resume for user ${req.user.id}:`, error);
         if (error.message.includes('GoogleGenerativeAI')) {
             console.error('[Resume Upload] Gemini API Error Details:', error);
             return res.status(502).json({ message: 'Failed to parse resume via AI service.' });
         }
         // Handle specific multer errors if needed
         if (error instanceof multer.MulterError) {
             console.error('[Resume Upload] Multer error:', error);
             return res.status(400).json({ message: `File upload error: ${error.message}` });
         }
         // Check the specific error message from the resume filter
         if (error.message.includes('Invalid file type')) {
              return res.status(400).json({ message: 'Invalid file type. Only PDF, DOCX, DOC allowed.' });
         }

        res.status(500).json({ message: 'Server error during resume processing.' });
    }
});

module.exports = router; 