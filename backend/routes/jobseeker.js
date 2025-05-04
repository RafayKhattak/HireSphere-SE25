const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const JobSeeker = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const resumeParser = require('../services/resumeParser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyCKDyoST4sGKHYCNoTunjhQKk6VCXcB1fk");

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
            profileImage,
            totalYearsExperience
        } = req.body;

        // Build profile update object
        const profileFields = {};
        
        if (firstName) profileFields.firstName = firstName;
        if (lastName) profileFields.lastName = lastName;
        if (title) profileFields.title = title;
        if (phone) profileFields.phone = phone;
        if (location) profileFields.location = location;
        if (profileImage) profileFields.profileImage = profileImage;
        
        if (totalYearsExperience !== undefined && totalYearsExperience !== null) {
            const years = parseInt(totalYearsExperience);
            if (!isNaN(years) && years >= 0) {
                profileFields.totalYearsExperience = years;
            } else {
                console.warn(`[Jobseeker Profile Update] Invalid totalYearsExperience value received: ${totalYearsExperience}. Ignoring.`);
            }
        }
        
        if (skills) {
            profileFields.skills = Array.isArray(skills) ? skills : skills.split(',').map(skill => skill.trim());
        }
        
        if (education) {
            profileFields.education = education;
        }

        // Log the received experience data before processing
        console.log('[Jobseeker Profile Update] Received experience data:', JSON.stringify(experience));

        if (experience) {
            // Optional: Add validation for the received experience array here if needed
            profileFields.experience = experience; 
        }

        // Update job seeker profile
        console.log('[JobSeekerProfile Update] Attempting to update user with fields:', profileFields);
        let updatedJobSeeker;
        try {
            updatedJobSeeker = await User.findByIdAndUpdate(
                req.user.id,
                { $set: profileFields },
                { new: true, runValidators: true } // Keep runValidators
            ).select('-password');
            console.log('[JobSeekerProfile Update] User successfully updated in DB.');
        } catch (updateError) {
            console.error('[JobSeekerProfile Update] Error during User.findByIdAndUpdate:', updateError);
            // If it's a validation error, log details
            if (updateError.name === 'ValidationError') {
                console.error('[JobSeekerProfile Update] Validation Errors:', updateError.errors);
            }
             // Rethrow or return error response
            return res.status(500).json({ message: 'Error saving profile update', error: updateError.message });
        }
        
        return res.json(updatedJobSeeker);
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
    console.log(`[SalaryInsights] Received request from user ID: ${req.user.id}`);
    
    try {
        // Get the current user with detailed information
        const user = await User.findById(req.user.id);
        
        if (!user) {
            console.log(`[SalaryInsights] User not found: ${req.user.id}`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify user is a job seeker
        if (user.type !== 'jobseeker') {
            console.log(`[SalaryInsights] Access denied: User ${req.user.id} is not a job seeker (type: ${user.type})`);
            return res.status(403).json({ error: 'Access denied. Not a job seeker.' });
        }
        
        // Extract job seeker's skills and experience
        const skills = user.skills || [];
        const experience = user.experience || [];
        
        console.log(`[SalaryInsights] Processing for user with ${skills.length} skills and ${experience.length} experience entries`);
        if (skills.length > 0) {
            console.log(`[SalaryInsights] User skills: ${skills.join(', ')}`);
        }
        
        // Calculate years of experience (safely)
        let totalExperienceYears = 0;
        let validExperienceEntries = 0;
        
        experience.forEach(exp => {
            try {
                // Only process entries with valid from/to dates
                if (!exp.from) {
                    console.log(`[SalaryInsights] Skipping experience entry with missing start date: ${exp.company || 'Unknown'}`);
                    return;
                }
                
                // Parse dates safely
                let startDate = new Date(exp.from);
                let endDate = exp.current ? new Date() : (exp.to ? new Date(exp.to) : new Date());
                
                // Validate dates
                if (startDate.toString() === 'Invalid Date') {
                    console.log(`[SalaryInsights] Invalid start date: ${exp.from} for ${exp.company || 'Unknown'}`);
                    return;
                }
                
                if (endDate.toString() === 'Invalid Date') {
                    console.log(`[SalaryInsights] Invalid end date, using current date instead`);
                    endDate = new Date();
                }
                
                // Calculate duration in years
                const durationMs = endDate.getTime() - startDate.getTime();
                
                // Skip negative durations
                if (durationMs <= 0) {
                    console.log(`[SalaryInsights] Skipping invalid duration: end date is before start date for ${exp.company || 'Unknown'}`);
                    return;
                }
                
                const years = durationMs / (1000 * 60 * 60 * 24 * 365.25);
                console.log(`[SalaryInsights] Valid experience: ${Math.round(years * 10) / 10} years at ${exp.company || 'Unknown'}`);
                
                totalExperienceYears += years;
                validExperienceEntries++;
            } catch (error) {
                console.error(`[SalaryInsights] Error processing experience entry:`, error);
            }
        });
        
        // Round to nearest half year
        totalExperienceYears = Math.round(totalExperienceYears * 2) / 2;
        console.log(`[SalaryInsights] Calculated total experience: ${totalExperienceYears} years from ${validExperienceEntries} valid entries`);
        
        // Check if we should force refresh
        const forceRefresh = req.query.refresh === 'true';
        if (forceRefresh) {
            console.log(`[SalaryInsights] Force refresh requested by user`);
        }
        
        // Skip AI and directly use enhanced algorithm
        console.log(`[SalaryInsights] Using enhanced salary calculation algorithm`);
        try {
            const insights = generateEnhancedSalaryInsights(skills, totalExperienceYears);
            console.log(`[SalaryInsights] Successfully generated enhanced insights with median salary: $${insights.salaryRange.median}`);
            return res.json(insights);
        } catch (error) {
            console.error('[SalaryInsights] Error in enhanced salary calculation:', error);
            
            // Ultimate fallback to basic insights with guaranteed valid values
            console.log(`[SalaryInsights] Falling back to basic insights algorithm`);
            const basicInsights = generateBasicSalaryInsights(skills, totalExperienceYears);
            console.log(`[SalaryInsights] Basic insights generated with median salary: $${basicInsights.salaryRange.median}`);
            return res.json(basicInsights);
        }
    } catch (error) {
        console.error('[SalaryInsights] Error in salary insights:', error);
        return res.status(500).json({ error: 'Server error while generating salary insights' });
    }
});

/**
 * Generate enhanced salary insights algorithm
 */
function generateEnhancedSalaryInsights(skills, totalExperienceYears) {
    console.log(`[SalaryInsights] Generating enhanced salary insights with algorithm`);
    
    // Ensure totalExperienceYears is valid
    if (isNaN(totalExperienceYears) || totalExperienceYears < 0) {
        console.log(`[SalaryInsights] Invalid experience years (${totalExperienceYears}), defaulting to 0`);
        totalExperienceYears = 0;
    }
    
    // Basic salary calculation based on years of experience - start higher than basic
    let baseSalary = 65000; // Higher starting base
    
    // Add $7000 for each year of experience
    const experienceBonus = Math.min(totalExperienceYears * 7000, 70000); // Cap at $70k extra
    console.log(`[SalaryInsights] Experience bonus calculated: $${experienceBonus} for ${totalExperienceYears} years`);
    
    // Enhanced skills mapping with higher values
    const skillValueMap = {
        // Programming languages
        'javascript': 3000,
        'python': 4000,
        'java': 3500,
        'typescript': 3500,
        'c++': 3000,
        'c#': 3000,
        'go': 4000,
        'rust': 5000,
        'php': 2000,
        'ruby': 2500,
        'swift': 3500,
        'kotlin': 3500,
        
        // Frameworks
        'react': 4000,
        'angular': 3500,
        'vue': 3500,
        'node': 4000,
        'django': 3000,
        'flask': 3000,
        'spring': 3500,
        '.net': 3000,
        
        // Data Science & ML
        'machine learning': 5000,
        'data science': 5000,
        'ai': 5000,
        'tensorflow': 4500,
        'pytorch': 4500,
        'keras': 4000,
        'pandas': 3000,
        'numpy': 3000,
        'scikit-learn': 3500,
        
        // Cloud & DevOps
        'aws': 4500,
        'azure': 4000,
        'gcp': 4000,
        'cloud': 3500,
        'devops': 4500,
        'kubernetes': 4500,
        'docker': 4000,
        'terraform': 4000,
        'ci/cd': 3500,
        
        // Databases
        'sql': 3000,
        'nosql': 3000,
        'mongodb': 3000,
        'postgresql': 3500,
        'mysql': 3000,
        'redis': 3000,
        
        // Other
        'graphql': 3500,
        'rest api': 3000,
        'git': 2000,
        'agile': 2000,
        'scrum': 2000
    };
    
    let skillsBonus = 0;
    let matchedSkills = [];
    
    if (skills && Array.isArray(skills)) {
        skills.forEach(skill => {
            if (!skill) return;
            
            const normalizedSkill = skill.toLowerCase();
            
            // Try exact matches first
            if (skillValueMap[normalizedSkill] !== undefined) {
                skillsBonus += skillValueMap[normalizedSkill];
                matchedSkills.push(skill);
                return;
            }
            
            // Then try partial matches
            for (const [key, value] of Object.entries(skillValueMap)) {
                if (normalizedSkill.includes(key) || key.includes(normalizedSkill)) {
                    skillsBonus += value;
                    matchedSkills.push(`${skill} (matched with ${key})`);
                    return;
                }
            }
        });
    }
    
    skillsBonus = Math.min(skillsBonus, 40000); // Cap at $40k extra (higher cap)
    console.log(`[SalaryInsights] Skills bonus calculated: $${skillsBonus} for ${matchedSkills.length} valuable skills`);
    if (matchedSkills.length > 0) {
        console.log(`[SalaryInsights] Matched valuable skills: ${matchedSkills.slice(0, 5).join(', ')}${matchedSkills.length > 5 ? '...' : ''}`);
    }
    
    // Calculate location factor (simplified)
    const locationFactor = 1.0; // Default factor
    
    // Calculate final salary - with safeguard against NaN
    const medianSalaryUSD = Math.round((baseSalary + experienceBonus + skillsBonus) * locationFactor);
    const finalMedianSalaryUSD = isNaN(medianSalaryUSD) ? 65000 : medianSalaryUSD; // Fallback if calculation fails
    
    // Convert to PKR (using approximate exchange rate)
    const exchangeRate = 278; // 1 USD = 278 PKR (approx)
    const finalMedianSalaryPKR = Math.round(finalMedianSalaryUSD * exchangeRate);
    
    console.log(`[SalaryInsights] Final median salary calculated: $${finalMedianSalaryUSD} (PKR ${finalMedianSalaryPKR})`);
    
    // Generate experience impact text
    const experienceLevelText = 
        totalExperienceYears < 1 ? 'entry-level' : 
        totalExperienceYears < 3 ? 'junior' :
        totalExperienceYears < 5 ? 'mid-level' :
        totalExperienceYears < 8 ? 'senior' : 'expert';
    
    // Generate insights
    return {
        currency: "PKR",
        salaryRange: {
            low: Math.round(finalMedianSalaryPKR * 0.8),
            median: finalMedianSalaryPKR,
            high: Math.round(finalMedianSalaryPKR * 1.25)
        },
        topRoles: [
            {
                title: "Senior Software Engineer",
                medianSalary: Math.round(finalMedianSalaryPKR * 1.05),
                description: "Designs, develops, and maintains complex software systems and applications."
            },
            {
                title: "Data Scientist",
                medianSalary: Math.round(finalMedianSalaryPKR * 1.02),
                description: "Analyzes and interprets complex data to help guide strategic decisions."
            },
            {
                title: "Machine Learning Engineer",
                medianSalary: Math.round(finalMedianSalaryPKR * 1.08),
                description: "Builds AI systems that learn from data and automate predictive modeling."
            }
        ],
        valuableSkills: [
            {
                skill: "Cloud Architecture",
                impact: "Could increase salary potential by 15-20%"
            },
            {
                skill: "MLOps",
                impact: "Could increase salary potential by 12-18%"
            },
            {
                skill: "Deep Learning",
                impact: "Could increase salary potential by 10-15%"
            },
            {
                skill: "System Design",
                impact: "Could increase salary potential by 8-15% and open paths to architect roles"
            }
        ],
        experienceImpact: `With ${totalExperienceYears} years of experience, you're at the ${experienceLevelText} range. Each additional year typically adds 5-10% to your base salary in the first 5 years, with diminishing returns after 8-10 years. Specialized experience in high-demand areas can significantly increase your value.`,
        industryTrends: "The tech industry continues to see strong demand for AI/ML specialists and experienced software engineers. Remote work has expanded job opportunities globally, with companies competing for talent across borders. Cloud computing, AI, and cybersecurity remain the highest-paying specializations, with salaries increasing 8-12% annually in these domains."
    };
}

/**
 * Generate basic salary insights without AI
 */
function generateBasicSalaryInsights(skills, totalExperienceYears) {
    console.log(`[SalaryInsights] Generating basic salary insights with algorithm`);
    
    // Ensure totalExperienceYears is valid
    if (isNaN(totalExperienceYears) || totalExperienceYears < 0) {
        console.log(`[SalaryInsights] Invalid experience years (${totalExperienceYears}), defaulting to 0`);
        totalExperienceYears = 0;
    }
    
    // Basic salary calculation based on years of experience
    const baseSalary = 50000; // Starting base
    
    // Add $5000 for each year of experience
    const experienceBonus = Math.min(totalExperienceYears * 5000, 50000); // Cap at $50k extra
    console.log(`[SalaryInsights] Experience bonus calculated: $${experienceBonus} for ${totalExperienceYears} years`);
    
    // Add bonus for in-demand skills
    const inDemandSkills = [
        'javascript', 'python', 'react', 'node', 'aws', 'cloud', 'data science', 
        'machine learning', 'ai', 'devops', 'golang', 'rust'
    ];
    
    let skillsBonus = 0;
    let matchedSkills = [];
    
    if (skills && Array.isArray(skills)) {
        skills.forEach(skill => {
            if (!skill) return;
            
            const normalizedSkill = skill.toLowerCase();
            for (const demandSkill of inDemandSkills) {
                if (normalizedSkill.includes(demandSkill)) {
                    skillsBonus += 2000; // $2000 per in-demand skill
                    matchedSkills.push(skill);
                    break; // Only count once per skill
                }
            }
        });
    }
    
    skillsBonus = Math.min(skillsBonus, 20000); // Cap at $20k extra
    console.log(`[SalaryInsights] Skills bonus calculated: $${skillsBonus} for ${matchedSkills.length} in-demand skills`);
    if (matchedSkills.length > 0) {
        console.log(`[SalaryInsights] Matched in-demand skills: ${matchedSkills.join(', ')}`);
    }
    
    const medianSalaryUSD = baseSalary + experienceBonus + skillsBonus;
    const finalMedianSalaryUSD = isNaN(medianSalaryUSD) ? 50000 : medianSalaryUSD; // Fallback if calculation fails
    
    // Convert to PKR (using approximate exchange rate)
    const exchangeRate = 278; // 1 USD = 278 PKR (approx)
    const finalMedianSalaryPKR = Math.round(finalMedianSalaryUSD * exchangeRate);
    
    console.log(`[SalaryInsights] Final median salary calculated: $${finalMedianSalaryUSD} (PKR ${finalMedianSalaryPKR})`);
    
    return {
        currency: "PKR",
        salaryRange: {
            low: Math.round(finalMedianSalaryPKR * 0.8),
            median: finalMedianSalaryPKR,
            high: Math.round(finalMedianSalaryPKR * 1.2)
        },
        topRoles: [
            {
                title: "Software Developer",
                medianSalary: Math.round(finalMedianSalaryPKR * 1.0),
                description: "Develops software applications using various programming languages and frameworks."
            },
            {
                title: "System Analyst",
                medianSalary: Math.round(finalMedianSalaryPKR * 0.95),
                description: "Analyzes and designs information systems to meet business requirements."
            },
            {
                title: "Project Manager",
                medianSalary: Math.round(finalMedianSalaryPKR * 1.1),
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