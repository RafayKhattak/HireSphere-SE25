const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const JobSeeker = require('../models/JobSeeker');
const { v4: uuidv4 } = require('uuid');
const resumeParser = require('../services/resumeParser');
const { GoogleGenerativeAI } = require('@google/genai');
const { authenticateUser, isJobSeeker } = require('../middleware/auth');

// Set up multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/resumes';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const fileName = `${uuidv4()}-${file.originalname}`;
        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept PDF and Word documents
    if (
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @route   GET /api/jobseeker/profile
// @desc    Get job seeker profile
// @access  Private (job seeker only)
router.get('/profile', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can access job seeker profiles.' });
        }

        const jobSeeker = await User.findById(req.user.id).select('-password');
        
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker not found' });
        }
        
        return res.json(jobSeeker);
    } catch (error) {
        console.error('Error fetching job seeker profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/jobseeker/profile
// @desc    Update job seeker profile
// @access  Private (job seeker only)
router.put('/profile', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can update job seeker profiles.' });
        }

        const {
            firstName,
            lastName,
            title,
            phone,
            location,
            skills,
            education,
            experience,
            profileImage
        } = req.body;

        // Build profile update object
        const profileFields = {};
        
        if (firstName) profileFields.firstName = firstName;
        if (lastName) profileFields.lastName = lastName;
        if (title) profileFields.title = title;
        if (phone) profileFields.phone = phone;
        if (location) profileFields.location = location;
        if (profileImage) profileFields.profileImage = profileImage;
        
        if (skills) {
            profileFields.skills = Array.isArray(skills) ? skills : skills.split(',').map(skill => skill.trim());
        }
        
        if (education) {
            profileFields.education = education;
        }
        
        if (experience) {
            profileFields.experience = experience;
        }

        // Update job seeker profile
        const jobSeeker = await User.findByIdAndUpdate(
            req.user.id,
            { $set: profileFields },
            { new: true, runValidators: true }
        ).select('-password');
        
        return res.json(jobSeeker);
    } catch (error) {
        console.error('Error updating job seeker profile:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/jobseeker/:jobSeekerId/public
// @desc    Get public job seeker profile for employers
// @access  Public
router.get('/:jobSeekerId/public', async (req, res) => {
    try {
        const jobSeekerId = req.params.jobSeekerId;
        
        const jobSeeker = await User.findById(jobSeekerId).select(
            'firstName lastName title skills education experience location profileImage'
        );
        
        if (!jobSeeker || jobSeeker.type !== 'jobseeker') {
            return res.status(404).json({ message: 'Job seeker not found' });
        }
        
        return res.json(jobSeeker);
    } catch (error) {
        console.error('Error fetching public job seeker profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/jobseeker/parse-resume
// @desc    Parse resume and extract profile information
// @access  Private (job seeker only)
router.post('/parse-resume', auth, upload.single('resume'), async (req, res) => {
    try {
        // Check if the user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Job seeker access only.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Get file path and parse the resume
        const filePath = req.file.path;
        const fileName = req.file.filename;
        const fileUrl = `/uploads/resumes/${fileName}`;

        console.log(`Processing resume: ${fileName}`);
        
        // Check if useGemini parameter was passed from the frontend
        let useGemini = process.env.USE_GEMINI_API !== 'false'; // Default from env
        if (req.body.useGemini !== undefined) {
            // Convert string 'true'/'false' to boolean
            useGemini = req.body.useGemini === 'true';
        }
        
        console.log(`Using Gemini API: ${useGemini}`);
        
        // Parse the resume using the enhanced resume parser service
        const parsedData = await resumeParser.parseResume(filePath, useGemini);
        console.log('Resume parsed successfully');
        
        // Update job seeker profile with the extracted data
        const jobSeeker = await User.findById(req.user.id);
        
        if (!jobSeeker) {
            return res.status(404).json({ message: 'Job seeker profile not found' });
        }

        // Create update object
        const updateData = {};
        
        // Update only fields that are extracted and empty in the profile
        if (parsedData.skills && parsedData.skills.length > 0) {
            // Merge existing skills with parsed skills, remove duplicates
            const existingSkills = jobSeeker.skills || [];
            const allSkills = [...existingSkills, ...parsedData.skills];
            updateData.skills = [...new Set(allSkills)]; // Remove duplicates
        }

        if (parsedData.education && parsedData.education.length > 0) {
            // Convert education format if needed
            const formattedEducation = parsedData.education.map(edu => ({
                institution: edu.institution,
                degree: edu.degree,
                graduationYear: edu.year || 0,
                fieldOfStudy: edu.fieldOfStudy || ''
            }));

            // Only add new education entries
            if (!jobSeeker.education || !Array.isArray(jobSeeker.education)) {
                updateData.education = formattedEducation;
            } else {
                // Filter out duplicate entries
                const newEducation = formattedEducation.filter(newEdu => 
                    !jobSeeker.education.some(existingEdu => 
                        existingEdu.institution === newEdu.institution && 
                        existingEdu.degree === newEdu.degree
                    )
                );
                
                updateData.education = [...jobSeeker.education, ...newEducation];
            }
        }

        if (parsedData.experience && parsedData.experience.length > 0) {
            // Convert experience format if needed
            const formattedExperience = parsedData.experience.map(exp => {
                // Try to parse duration into start/end dates
                let startDate = '';
                let endDate = '';
                let current = false;
                
                if (exp.duration) {
                    const durationParts = exp.duration.split('-').map(p => p.trim());
                    startDate = durationParts[0] || '';
                    
                    if (durationParts.length > 1) {
                        if (durationParts[1].toLowerCase().includes('present')) {
                            current = true;
                        } else {
                            endDate = durationParts[1] || '';
                        }
                    }
                }
                
                return {
                    company: exp.company || '',
                    position: exp.position || '',
                    startDate: startDate,
                    endDate: endDate,
                    current: current,
                    description: exp.description || ''
                };
            });

            // Only add new experience entries
            if (!jobSeeker.experience || !Array.isArray(jobSeeker.experience)) {
                updateData.experience = formattedExperience;
            } else {
                // Filter out duplicate entries
                const newExperience = formattedExperience.filter(newExp => 
                    !jobSeeker.experience.some(existingExp => 
                        existingExp.company === newExp.company && 
                        existingExp.position === newExp.position
                    )
                );
                
                updateData.experience = [...jobSeeker.experience, ...newExperience];
            }
        }

        // Update personal info if available and not already set
        if (parsedData.personalInfo) {
            if (parsedData.personalInfo.title && !jobSeeker.title) {
                updateData.title = parsedData.personalInfo.title;
            }
            
            if (parsedData.personalInfo.location && !jobSeeker.location) {
                updateData.location = parsedData.personalInfo.location;
            }
            
            if (parsedData.personalInfo.phone && !jobSeeker.phone) {
                updateData.phone = parsedData.personalInfo.phone;
            }
        }

        // Save the resume URL to the jobseeker profile
        updateData.resume = fileUrl;
        
        // Update the user document
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true }
        );

        // Return the updated user profile and parsed data
        res.json({
            user: updatedUser,
            parsed: parsedData,
            message: 'Resume parsed successfully'
        });
        
    } catch (err) {
        console.error('Error parsing resume:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Helper function to parse resume text using GROQ API
async function parseResumeText(resumeText) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        throw new Error('GROQ API key not configured');
    }
    
    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama3-8b-8192',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert resume parser that extracts structured data from resumes. Extract the information carefully and format it according to the requested JSON structure.'
                },
                {
                    role: 'user',
                    content: `Parse the following resume and extract structured information. Return a JSON object with the following structure:
                        {
                            "skills": ["skill1", "skill2", ...],
                            "experience": [
                                {
                                    "title": "Job Title",
                                    "company": "Company Name",
                                    "location": "City, State",
                                    "from": "YYYY-MM",
                                    "to": "YYYY-MM",
                                    "current": false,
                                    "description": "Job description"
                                }
                            ],
                            "education": [
                                {
                                    "degree": "Degree Name",
                                    "institution": "Institution Name",
                                    "graduationYear": 2020,
                                    "fieldOfStudy": "Computer Science"
                                }
                            ],
                            "personalInfo": {
                                "name": "Full Name",
                                "phone": "Phone Number",
                                "email": "email@example.com",
                                "location": "City, State",
                                "title": "Professional Title",
                                "summary": "Professional summary"
                            }
                        }

                        Format dates as YYYY-MM. Set "current" to true for current positions. Make reasonable inferences when information isn't explicitly stated. If you can't extract a piece of information, leave it out or use null.
                        
                        Resume:
                        ${resumeText}`
                }
            ],
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = JSON.parse(response.data.choices[0].message.content || '{}');
        return {
            skills: result.skills || [],
            experience: result.experience || [],
            education: result.education || [],
            personalInfo: result.personalInfo || {}
        };
    } catch (error) {
        console.error('Error calling GROQ API:', error);
        throw new Error('Failed to parse resume: ' + (error.response?.data?.error || error.message));
    }
}

/**
 * @route   GET /api/jobseeker/salary-insights
 * @desc    Get salary insights based on job seeker's skills and experience
 * @access  Private (Job Seekers only)
 */
router.get('/salary-insights', auth, async (req, res) => {
    try {
        // Get the current user with detailed information
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify user is a job seeker
        if (user.type !== 'jobseeker') {
            return res.status(403).json({ error: 'Access denied. Not a job seeker.' });
        }
        
        // Extract job seeker's skills and experience
        const skills = user.skills || [];
        const experience = user.experience || [];
        
        // Calculate years of experience (roughly)
        let totalExperienceYears = 0;
        
        experience.forEach(exp => {
            const startDate = new Date(exp.from);
            const endDate = exp.current ? new Date() : new Date(exp.to);
            const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
            totalExperienceYears += Math.max(0, years); // Ensure no negative values
        });
        
        // Round to nearest half year
        totalExperienceYears = Math.round(totalExperienceYears * 2) / 2;
        
        try {
            // Use AI to generate salary insights
            const insights = await generateSalaryInsights(skills, experience, totalExperienceYears);
            return res.json(insights);
        } catch (error) {
            console.error('Error generating AI salary insights:', error);
            
            // Fallback to basic insights if AI fails
            return res.json(generateBasicSalaryInsights(skills, totalExperienceYears));
        }
    } catch (error) {
        console.error('Error in salary insights:', error);
        return res.status(500).json({ error: 'Server error while generating salary insights' });
    }
});

/**
 * Generate salary insights using Gemini AI
 */
async function generateSalaryInsights(skills, experience, totalExperienceYears) {
    // Create a model instance
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Format experience for prompt
    const formattedExperience = experience.map(exp => 
        `${exp.title} at ${exp.company} (${
            new Date(exp.from).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        } to ${
            exp.current ? 'Present' : new Date(exp.to).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        }): ${exp.description}`
    ).join('\n');
    
    // Construct prompt for AI
    const prompt = `
    Task: Analyze this job seeker's profile and provide detailed salary insights.
    
    JOB SEEKER DETAILS:
    - Skills: ${skills.join(', ')}
    - Total Years of Experience: ${totalExperienceYears}
    - Experience Details:
    ${formattedExperience}
    
    Please provide:
    1. Salary range based on skills and experience (provide low, median, and high estimates)
    2. Top 3 highest-paying roles this person could qualify for
    3. Skills that could increase their earning potential (identify 3-5 complementary skills)
    4. How their experience level affects salary expectations
    5. Industry insights on compensation trends related to their skill set
    
    Format the response as a valid JSON object with these exact keys:
    {
      "salaryRange": { "low": number, "median": number, "high": number },
      "topRoles": [{ "title": string, "medianSalary": number, "description": string }],
      "valuableSkills": [{ "skill": string, "impact": string }],
      "experienceImpact": string,
      "industryTrends": string
    }
    `;
    
    try {
        // Generate content
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // Parse the JSON from the response
        const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Error in AI salary analysis:', error);
        throw error;
    }
}

/**
 * Generate basic salary insights without AI
 */
function generateBasicSalaryInsights(skills, totalExperienceYears) {
    // Basic salary calculation based on years of experience
    let baseSalary = 50000; // Starting base
    
    // Add $5000 for each year of experience
    const experienceBonus = Math.min(totalExperienceYears * 5000, 50000); // Cap at $50k extra
    
    // Add bonus for in-demand skills
    const inDemandSkills = [
        'javascript', 'python', 'react', 'node', 'aws', 'cloud', 'data science', 
        'machine learning', 'ai', 'devops', 'golang', 'rust'
    ];
    
    let skillsBonus = 0;
    skills.forEach(skill => {
        if (inDemandSkills.some(s => skill.toLowerCase().includes(s))) {
            skillsBonus += 2000; // $2000 per in-demand skill
        }
    });
    
    skillsBonus = Math.min(skillsBonus, 20000); // Cap at $20k extra
    
    const medianSalary = baseSalary + experienceBonus + skillsBonus;
    
    return {
        salaryRange: {
            low: Math.round(medianSalary * 0.8),
            median: medianSalary,
            high: Math.round(medianSalary * 1.2)
        },
        topRoles: [
            {
                title: "Software Developer",
                medianSalary: Math.round(medianSalary * 1.0),
                description: "Develops software applications using various programming languages and frameworks."
            },
            {
                title: "System Analyst",
                medianSalary: Math.round(medianSalary * 0.95),
                description: "Analyzes and designs information systems to meet business requirements."
            },
            {
                title: "Project Manager",
                medianSalary: Math.round(medianSalary * 1.1),
                description: "Manages technology projects, teams, and resources to deliver results within constraints."
            }
        ],
        valuableSkills: [
            {
                skill: "Cloud Technologies",
                impact: "Could increase salary potential by 10-15%"
            },
            {
                skill: "Data Analysis",
                impact: "Could increase salary potential by 8-12%"
            },
            {
                skill: "Leadership & Management",
                impact: "Could increase salary potential by 15-20% and open paths to leadership roles"
            }
        ],
        experienceImpact: `With ${totalExperienceYears} years of experience, you're in the ${
            totalExperienceYears < 2 ? 'entry-level' : 
            totalExperienceYears < 5 ? 'junior to mid-level' : 
            totalExperienceYears < 10 ? 'mid to senior level' : 'senior level'
        } range. Each additional year typically adds 3-8% to your base salary, with diminishing returns after 10-15 years.`,
        industryTrends: "Technology salaries have been trending upward with growing demand for digital transformation. Remote work has also expanded opportunities beyond local markets, potentially increasing compensation."
    };
}

module.exports = router; 