const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Resume Parser Service
 * This service parses resume files (PDF and Word) and extracts structured data
 * Leverages both local pattern matching and Google's Gemini API for enhanced parsing
 */
class ResumeParser {
  constructor() {
    // Initialize Google Gemini API
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyCKDyoST4sGKHYCNoTunjhQKk6VCXcB1fk");
    this.geminiModel = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  /**
   * Parse a resume file and extract structured data
   * @param {string} filePath - Path to the resume file
   * @param {boolean} useGemini - Whether to use Gemini API (defaults to true if API key is available)
   * @returns {Object} Parsed resume data
   */
  async parseResume(filePath, useGemini = true) {
    try {
      // Determine file type and extract text
      const extension = path.extname(filePath).toLowerCase();
      
      // Check if Gemini API should be used and is available
      if (useGemini && this.genAI) {
        return await this.parseWithGemini(filePath, extension);
      } else {
        // Fallback to local parsing
        return await this.parseWithLocalMethods(filePath, extension);
      }
    } catch (error) {
      console.error('Error parsing resume:', error);
      // If Gemini parsing fails, try local methods as fallback
      if (useGemini) {
        console.log('Falling back to local parsing methods...');
        const extension = path.extname(filePath).toLowerCase();
        return await this.parseWithLocalMethods(filePath, extension);
      }
      throw error;
    }
  }

  /**
   * Parse resume with Gemini API
   * @param {string} filePath - Path to the resume file
   * @param {string} extension - File extension
   * @returns {Object} Parsed resume data
   */
  async parseWithGemini(filePath, extension) {
    try {
      console.log('Parsing resume with Gemini API');
      
      // Create file part for model
      const fileBuffer = fs.readFileSync(filePath);
      let mimeType;
      
      if (extension === '.pdf') {
        mimeType = 'application/pdf';
      } else if (extension === '.doc') {
        mimeType = 'application/msword';
      } else if (extension === '.docx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
        throw new Error('Unsupported file format for Gemini API');
      }

      // Create part from data
      const filePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType
        }
      };
      
      // Create the prompt for the model
      const prompt = `
        Please analyze this resume and extract the following information in JSON format:
        
        {
          "personalInfo": {
            "name": "", 
            "email": "",
            "phone": "",
            "location": "",
            "title": ""
          },
          "skills": ["skill1", "skill2", ...],
          "experience": [
            {
              "company": "Company Name",
              "position": "Job Title",
              "duration": "Start Date - End Date",
              "description": "Brief job description"
            }
          ],
          "education": [
            {
              "institution": "University/College Name",
              "degree": "Degree Name",
              "year": "Graduation Year"
            }
          ]
        }
        
        Extract as much information as you can accurately detect from the resume. If you cannot find certain information, leave it as an empty string or array. For experience and education, create a new object for each entry.
        
        IMPORTANT: Return ONLY the JSON object with no additional text or explanation.
      `;

      // Generate content with the model
      const result = await this.geminiModel.generateContent({
        contents: [
          {
            role: "user",
            parts: [filePart, { text: prompt }]
          }
        ]
      });
      
      const response = await result.response;
      const textResponse = response.text();
      
      // Parse the JSON response
      try {
        // Extract JSON from the response text (in case there's additional text)
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : textResponse;
        const parsedData = JSON.parse(jsonStr);
        
        return {
          personalInfo: parsedData.personalInfo || {},
          skills: parsedData.skills || [],
          experience: parsedData.experience || [],
          education: parsedData.education || []
        };
      } catch (jsonError) {
        console.error('Error parsing Gemini response as JSON:', jsonError);
        console.log('Raw response:', textResponse);
        throw new Error('Invalid JSON response from Gemini API');
      }
    } catch (error) {
      console.error('Error using Gemini API for resume parsing:', error);
      throw error;
    }
  }

  /**
   * Parse resume with local methods
   * @param {string} filePath - Path to the resume file
   * @param {string} extension - File extension
   * @returns {Object} Parsed resume data
   */
  async parseWithLocalMethods(filePath, extension) {
    let text = '';
    
    if (extension === '.pdf') {
      text = await this.extractTextFromPDF(filePath);
    } else if (extension === '.doc' || extension === '.docx') {
      text = await this.extractTextFromWord(filePath);
    } else {
      throw new Error('Unsupported file format');
    }

    // Parse the extracted text
    return this.parseText(text);
  }

  /**
   * Extract text from a PDF file
   * @param {string} filePath - Path to the PDF file
   * @returns {string} Extracted text
   */
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  /**
   * Extract text from a Word document
   * @param {string} filePath - Path to the Word document
   * @returns {string} Extracted text
   */
  async extractTextFromWord(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from Word document:', error);
      throw error;
    }
  }

  /**
   * Parse extracted text into structured data
   * @param {string} text - Extracted text from resume
   * @returns {Object} Structured resume data
   */
  parseText(text) {
    // Initialize parsed data structure
    const parsed = {
      personalInfo: {},
      skills: [],
      experience: [],
      education: []
    };

    // Extract personal information
    parsed.personalInfo = this.extractPersonalInfo(text);
    
    // Extract skills
    parsed.skills = this.extractSkills(text);
    
    // Extract work experience
    parsed.experience = this.extractExperience(text);
    
    // Extract education
    parsed.education = this.extractEducation(text);

    return parsed;
  }

  /**
   * Extract personal information from text
   * @param {string} text - Resume text
   * @returns {Object} Personal information
   */
  extractPersonalInfo(text) {
    const personalInfo = {};
    
    // Extract email
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const emailMatch = text.match(emailRegex);
    if (emailMatch && emailMatch.length > 0) {
      personalInfo.email = emailMatch[0];
    }
    
    // Extract phone number
    const phoneRegex = /(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch && phoneMatch.length > 0) {
      personalInfo.phone = phoneMatch[0];
    }
    
    // Extract location (city, state)
    const locationRegex = /([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})/g;
    const locationMatch = text.match(locationRegex);
    if (locationMatch && locationMatch.length > 0) {
      personalInfo.location = locationMatch[0];
    }
    
    // Extract job title (attempt to find common job titles)
    const titleRegex = /(Software Engineer|Web Developer|Data Scientist|Product Manager|UX Designer|Frontend Developer|Backend Developer|Full Stack Developer|DevOps Engineer|QA Engineer)/i;
    const titleMatch = text.match(titleRegex);
    if (titleMatch && titleMatch.length > 0) {
      personalInfo.title = titleMatch[0];
    }
    
    return personalInfo;
  }

  /**
   * Extract skills from text
   * @param {string} text - Resume text
   * @returns {Array} List of skills
   */
  extractSkills(text) {
    // Common programming languages, frameworks, and technologies
    const techSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Ruby', 'PHP', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Spring', 'ASP.NET', 'Laravel',
      'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Oracle', 'Firebase', 'AWS', 'Azure', 'Google Cloud',
      'Docker', 'Kubernetes', 'Git', 'GitHub', 'GitLab', 'CI/CD', 'Jenkins', 'Travis CI',
      'HTML', 'CSS', 'SASS', 'LESS', 'Bootstrap', 'Tailwind', 'Material UI', 'Redux', 'GraphQL',
      'REST API', 'WebSocket', 'RabbitMQ', 'Kafka', 'Redis', 'Elasticsearch',
      'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Machine Learning', 'AI'
    ];
    
    // Common soft skills
    const softSkills = [
      'Communication', 'Teamwork', 'Problem Solving', 'Critical Thinking', 'Leadership',
      'Time Management', 'Adaptability', 'Creativity', 'Collaboration', 'Project Management',
      'Agile', 'Scrum', 'Kanban', 'Presentation', 'Customer Service', 'Conflict Resolution'
    ];
    
    const allSkills = [...techSkills, ...softSkills];
    const foundSkills = [];
    
    // Look for each skill in the text
    for (const skill of allSkills) {
      // Create a regex to find the skill as a whole word (not part of another word)
      const regex = new RegExp(`\\b${skill}\\b`, 'i');
      if (regex.test(text)) {
        foundSkills.push(skill);
      }
    }
    
    return foundSkills;
  }

  /**
   * Extract work experience from text
   * @param {string} text - Resume text
   * @returns {Array} List of work experiences
   */
  extractExperience(text) {
    const experiences = [];
    
    // Look for sections with common work experience headers
    const experienceSectionRegex = /(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|PROFESSIONAL EXPERIENCE)([\s\S]*?)(?:EDUCATION|SKILLS|PROJECTS|$)/i;
    const experienceMatch = text.match(experienceSectionRegex);
    
    if (experienceMatch && experienceMatch[1]) {
      const experienceText = experienceMatch[1];
      
      // Try to identify individual job entries
      // Look for patterns like "Company Name, Position, Date Range"
      const jobEntryRegex = /([A-Za-z0-9\s&.,]+)[,|\n]([A-Za-z0-9\s&.,]+)[,|\n]([A-Za-z0-9\s&.,-]+)/g;
      let jobMatch;
      
      while ((jobMatch = jobEntryRegex.exec(experienceText)) !== null) {
        if (jobMatch.length >= 4) {
          experiences.push({
            company: jobMatch[1].trim(),
            position: jobMatch[2].trim(),
            duration: jobMatch[3].trim(),
            description: ''
          });
        }
      }
      
      // If no matches found, use a simpler approach
      if (experiences.length === 0) {
        // Split by newlines and look for lines that might be job titles or companies
        const lines = experienceText.split('\n').filter(line => line.trim().length > 0);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Look for lines that might indicate job positions (typically contain words like "Engineer", "Developer", etc.)
          if (/Engineer|Developer|Manager|Designer|Analyst|Consultant|Director|Lead/i.test(line)) {
            const position = line;
            let company = '';
            let duration = '';
            
            // Check if the next line might contain the company name
            if (i + 1 < lines.length) {
              company = lines[i + 1].trim();
            }
            
            // Check if the next line might contain the duration
            if (i + 2 < lines.length && /\d{4}/.test(lines[i + 2])) {
              duration = lines[i + 2].trim();
            }
            
            experiences.push({
              company,
              position,
              duration,
              description: ''
            });
          }
        }
      }
    }
    
    return experiences;
  }

  /**
   * Extract education information from text
   * @param {string} text - Resume text
   * @returns {Array} List of education entries
   */
  extractEducation(text) {
    const education = [];
    
    // Look for sections with common education headers
    const educationSectionRegex = /(?:EDUCATION|ACADEMIC BACKGROUND|QUALIFICATIONS)([\s\S]*?)(?:EXPERIENCE|SKILLS|PROJECTS|$)/i;
    const educationMatch = text.match(educationSectionRegex);
    
    if (educationMatch && educationMatch[1]) {
      const educationText = educationMatch[1];
      
      // Look for university/college names
      const institutionRegex = /(University|College|Institute|School) of ([A-Za-z\s]+)|(([A-Za-z\s]+) University|College|Institute|School)/gi;
      let institutionMatch;
      
      while ((institutionMatch = institutionRegex.exec(educationText)) !== null) {
        const institution = institutionMatch[0].trim();
        let degree = '';
        let year = '';
        
        // Look for degree information near the institution
        const startPos = Math.max(0, institutionMatch.index - 50);
        const endPos = Math.min(educationText.length, institutionMatch.index + institution.length + 100);
        const surroundingText = educationText.substring(startPos, endPos);
        
        // Check for degree patterns
        const degreeRegex = /(Bachelor|Master|Ph\.D\.|MBA|BS|BA|MS|MA|B\.S\.|M\.S\.|B\.A\.|M\.A\.) (?:of|in) ([A-Za-z\s]+)|(Bachelor|Master|Ph\.D\.|MBA|BS|BA|MS|MA|B\.S\.|M\.S\.|B\.A\.|M\.A\.)/i;
        const degreeMatch = surroundingText.match(degreeRegex);
        if (degreeMatch) {
          degree = degreeMatch[0].trim();
        }
        
        // Check for graduation year
        const yearRegex = /(19|20)\d{2}/;
        const yearMatch = surroundingText.match(yearRegex);
        if (yearMatch) {
          year = yearMatch[0];
        }
        
        education.push({
          institution,
          degree,
          year
        });
      }
      
      // If no matches found, try a simpler approach
      if (education.length === 0) {
        // Split by newlines and look for lines that might be education entries
        const lines = educationText.split('\n').filter(line => line.trim().length > 0);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Look for lines that might contain institution names
          if (/University|College|Institute|School/i.test(line)) {
            const institution = line;
            let degree = '';
            let year = '';
            
            // Check if the next line might contain the degree
            if (i + 1 < lines.length) {
              degree = lines[i + 1].trim();
            }
            
            // Check if any nearby line contains a year
            for (let j = i; j < Math.min(i + 3, lines.length); j++) {
              const yearMatch = lines[j].match(/(19|20)\d{2}/);
              if (yearMatch) {
                year = yearMatch[0];
                break;
              }
            }
            
            education.push({
              institution,
              degree,
              year
            });
          }
        }
      }
    }
    
    return education;
  }
}

module.exports = new ResumeParser(); 