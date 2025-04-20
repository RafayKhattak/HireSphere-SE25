import { Job, User } from '../types';

// Define API key - in a production app, this should be properly secured
const GROQ_API_KEY = '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';

export const aiService = {
  /**
   * Analyzes a user's profile and finds matching jobs based on skills and preferences
   */
  async getPersonalizedJobRecommendations(
    user: User, 
    availableJobs: Job[]
  ): Promise<{ jobs: Job[], reasoning: Record<string, string[]> }> {
    try {
      const userSkills = user.skills || [];
      const userPreferences = user.preferences || {};
      
      // Only process if we have enough data
      if (!userSkills.length && availableJobs.length === 0) {
        return { jobs: [], reasoning: {} };
      }

      // Prepare user profile and jobs data for the AI
      const userProfile = {
        skills: userSkills,
        preferences: userPreferences,
        experience: user.experience || [],
        education: user.education || []
      };

      const jobsData = availableJobs.map(job => ({
        id: job._id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        type: job.type
      }));

      // Call Groq API with a prompt to analyze job matches
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an AI career advisor helping to match job seekers with appropriate job opportunities. Analyze the user profile and available jobs to find the best matches based on skills, experience, and preferences.'
            },
            {
              role: 'user',
              content: `Given the following user profile and available jobs, identify the top 5 most suitable jobs for this candidate with reasoning for each match. Return the response as a JSON object with job IDs as keys and an array of matching factors as values.
              
              User Profile:
              ${JSON.stringify(userProfile, null, 2)}
              
              Available Jobs:
              ${JSON.stringify(jobsData, null, 2)}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const completion = await response.json();
      
      // Parse AI response to get job recommendations
      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Filter and sort the jobs based on AI recommendations
      const recommendedJobIds = Object.keys(aiResponse);
      const recommendedJobs = availableJobs
        .filter(job => recommendedJobIds.includes(job._id))
        .sort((a, b) => {
          const aIndex = recommendedJobIds.indexOf(a._id);
          const bIndex = recommendedJobIds.indexOf(b._id);
          return aIndex - bIndex;
        });

      return {
        jobs: recommendedJobs,
        reasoning: aiResponse
      };
    } catch (error) {
      console.error('Error getting AI job recommendations:', error);
      return { jobs: [], reasoning: {} };
    }
  },

  /**
   * Analyzes a resume and provides feedback and improvement suggestions
   */
  async analyzeResume(resumeText: string): Promise<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    score: number;
  }> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an expert resume reviewer with experience in HR and recruiting. Analyze the provided resume and give constructive feedback.'
            },
            {
              role: 'user',
              content: `Please analyze this resume and provide feedback with the following structure:
                1. Key strengths (list 3-5 bullet points)
                2. Areas for improvement (list 3-5 bullet points)
                3. Specific suggestions to enhance impact (list 3-5 actionable items)
                4. Overall score from 0-100
                
                Return the analysis as a JSON object with fields "strengths", "weaknesses", "suggestions", and "score".
                
                Resume:
                ${resumeText}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const completion = await response.json();
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        suggestions: result.suggestions || [],
        score: result.score || 0
      };
    } catch (error) {
      console.error('Error analyzing resume:', error);
      return {
        strengths: [],
        weaknesses: ['Unable to analyze resume due to an error.'],
        suggestions: ['Try again later or contact support.'],
        score: 0
      };
    }
  },

  /**
   * Generates tailored interview questions based on job description and candidate profile
   */
  async generateInterviewQuestions(
    jobDescription: string,
    candidateProfile?: Partial<User>
  ): Promise<{
    technical: string[];
    behavioral: string[];
    followup: string[];
  }> {
    try {
      const candidateContext = candidateProfile 
        ? `Consider the candidate has the following background: ${JSON.stringify(candidateProfile)}` 
        : '';

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an expert interviewer with deep knowledge of technical and behavioral interview practices.'
            },
            {
              role: 'user',
              content: `Based on the following job description, generate a set of interview questions categorized as:
                1. Technical questions (5 questions specific to skills required)
                2. Behavioral questions (3 questions about past experiences and soft skills)
                3. Follow-up questions (3 questions to probe deeper based on potential answers)
                
                ${candidateContext}
                
                Return the questions as a JSON object with fields "technical", "behavioral", and "followup", each containing an array of question strings.
                
                Job Description:
                ${jobDescription}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const completion = await response.json();
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        technical: result.technical || [],
        behavioral: result.behavioral || [],
        followup: result.followup || []
      };
    } catch (error) {
      console.error('Error generating interview questions:', error);
      return {
        technical: ['Unable to generate technical questions due to an error.'],
        behavioral: ['Unable to generate behavioral questions due to an error.'],
        followup: ['Unable to generate follow-up questions due to an error.']
      };
    }
  },

  /**
   * Optimizes job descriptions to be more effective and inclusive
   */
  async optimizeJobDescription(
    originalDescription: string,
    requirements: string,
    targetAudience?: string
  ): Promise<{
    optimizedDescription: string;
    optimizedRequirements: string;
    suggestedKeywords: string[];
    inclusivityScore: number;
  }> {
    try {
      const audienceContext = targetAudience 
        ? `The target audience for this job is: ${targetAudience}.` 
        : 'Optimize for a diverse audience.';

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an expert in writing effective and inclusive job descriptions that attract qualified and diverse candidates.'
            },
            {
              role: 'user',
              content: `Please optimize the following job description and requirements to be more effective, engaging, and inclusive. ${audienceContext}
                
                For your response, include:
                1. An optimized job description
                2. Refined job requirements (keep the same general qualifications but improve wording)
                3. A list of 5-7 keywords that would help with discoverability
                4. An inclusivity score from 0-100 for the original description with brief explanation
                
                Return the result as a JSON object with fields "optimizedDescription", "optimizedRequirements", "suggestedKeywords", and "inclusivityScore".
                
                Original Job Description:
                ${originalDescription}
                
                Original Requirements:
                ${requirements}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const completion = await response.json();
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        optimizedDescription: result.optimizedDescription || originalDescription,
        optimizedRequirements: result.optimizedRequirements || requirements,
        suggestedKeywords: result.suggestedKeywords || [],
        inclusivityScore: result.inclusivityScore || 0
      };
    } catch (error) {
      console.error('Error optimizing job description:', error);
      return {
        optimizedDescription: originalDescription,
        optimizedRequirements: requirements,
        suggestedKeywords: [],
        inclusivityScore: 0
      };
    }
  },

  /**
   * Screens job applications against job requirements
   */
  async screenApplication(
    jobRequirements: string,
    applicationData: {
      resume: string;
      coverLetter: string;
    }
  ): Promise<{
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    feedback: string;
    recommendation: 'strong_match' | 'potential_match' | 'weak_match';
  }> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI recruiter that helps screen job applications against job requirements.'
            },
            {
              role: 'user',
              content: `Analyze this job application against the requirements and provide an objective assessment of the candidate's fit.
                
                Return your analysis as a JSON object with fields:
                - "matchScore": number from 0-100
                - "matchedSkills": array of skills from the application that match requirements
                - "missingSkills": array of required skills that are missing or not clearly demonstrated
                - "feedback": brief objective assessment (max 150 words)
                - "recommendation": one of "strong_match", "potential_match", or "weak_match"
                
                Job Requirements:
                ${jobRequirements}
                
                Resume:
                ${applicationData.resume}
                
                Cover Letter:
                ${applicationData.coverLetter}`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const completion = await response.json();
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        matchScore: result.matchScore || 0,
        matchedSkills: result.matchedSkills || [],
        missingSkills: result.missingSkills || [],
        feedback: result.feedback || 'Unable to analyze application.',
        recommendation: result.recommendation || 'weak_match'
      };
    } catch (error) {
      console.error('Error screening application:', error);
      return {
        matchScore: 0,
        matchedSkills: [],
        missingSkills: [],
        feedback: 'An error occurred during application screening.',
        recommendation: 'weak_match'
      };
    }
  },

  /**
   * Parses a resume text and extracts structured profile data
   */
  async parseResume(resumeText: string): Promise<{
    skills: string[];
    experience: {
      title: string;
      company: string;
      location?: string;
      from: string;
      to?: string;
      current: boolean;
      description?: string;
    }[];
    education: {
      degree: string;
      institution: string;
      graduationYear: number;
      fieldOfStudy?: string;
    }[];
    personalInfo: {
      name?: string;
      phone?: string;
      email?: string;
      location?: string;
      title?: string;
      summary?: string;
    };
  }> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      });

      const completion = await response.json();
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      return {
        skills: result.skills || [],
        experience: result.experience || [],
        education: result.education || [],
        personalInfo: result.personalInfo || {}
      };
    } catch (error) {
      console.error('Error parsing resume:', error);
      return {
        skills: [],
        experience: [],
        education: [],
        personalInfo: {}
      };
    }
  }
};

export default aiService; 