const axios = require('axios');
require('dotenv').config();

// Get API key from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Evaluate skill assessment using AI
 * @param {Object} assessment - The skill assessment with questions and responses
 * @param {String} preferredProvider - 'groq' or 'gemini'
 * @returns {Object} AI evaluation results
 */
async function evaluateSkillAssessment(assessment, preferredProvider = 'groq') {
    try {
        // Format the assessment data for the AI
        const questionsAndAnswers = assessment.questions.map((question, index) => {
            const response = assessment.responses.find(r => r.questionIndex === index);
            return {
                question: question.question,
                answer: response ? response.answer : "No answer provided",
                isOpenEnded: question.isOpenEnded
            };
        });

        // Choose API provider based on preference
        if (preferredProvider === 'gemini' && GEMINI_API_KEY) {
            return await evaluateWithGemini(assessment.skill, questionsAndAnswers);
        } else {
            return await evaluateWithGroq(assessment.skill, questionsAndAnswers);
        }
    } catch (error) {
        console.error('Error evaluating skill assessment:', error);
        throw new Error('Failed to evaluate skill assessment');
    }
}

/**
 * Evaluate skills using Groq API
 */
async function evaluateWithGroq(skill, questionsAndAnswers) {
    const prompt = `
    You are an expert evaluation system specializing in the assessment of professional skills, particularly focusing on "${skill}". 
    
    Please analyze the following skill assessment responses. For each question, the user has provided an answer.
    
    ${JSON.stringify(questionsAndAnswers, null, 2)}
    
    Based on the answers provided, please:
    1. Score the overall assessment from 0-100.
    2. Provide 3-5 key strengths demonstrated in the responses.
    3. Identify 3-5 areas for improvement.
    4. Offer 3-5 specific recommendations for skill development.
    5. Give a detailed analysis of the candidate's proficiency in "${skill}".
    
    Return your evaluation as a JSON object with the following structure:
    {
      "score": number,
      "strengths": [array of strings],
      "weaknesses": [array of strings],
      "recommendations": [array of strings],
      "detailedAnalysis": string
    }`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama3-8b-8192',
        messages: [
            {
                role: 'system',
                content: 'You are an expert evaluator for technical and professional skills assessments. You provide detailed, objective, and constructive feedback.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const completion = response.data.choices[0].message.content;
    return JSON.parse(completion);
}

/**
 * Evaluate skills using Google's Gemini API
 */
async function evaluateWithGemini(skill, questionsAndAnswers) {
    const prompt = `
    You are an expert evaluation system specializing in the assessment of professional skills, particularly focusing on "${skill}". 
    
    Please analyze the following skill assessment responses. For each question, the user has provided an answer.
    
    ${JSON.stringify(questionsAndAnswers, null, 2)}
    
    Based on the answers provided, please:
    1. Score the overall assessment from 0-100.
    2. Provide 3-5 key strengths demonstrated in the responses.
    3. Identify 3-5 areas for improvement.
    4. Offer 3-5 specific recommendations for skill development.
    5. Give a detailed analysis of the candidate's proficiency in "${skill}".
    
    Return your evaluation as a JSON object with the following structure:
    {
      "score": number,
      "strengths": [array of strings],
      "weaknesses": [array of strings],
      "recommendations": [array of strings],
      "detailedAnalysis": string
    }`;

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ],
                role: "user"
            }
        ],
        generationConfig: {
            temperature: 0.2
        }
    });

    // Parse the response from Gemini
    const textResponse = response.data.candidates[0].content.parts[0].text;
    // Extract the JSON portion from the text (Gemini might wrap it in backticks)
    const jsonStr = textResponse.match(/\{[\s\S]*\}/)[0];
    return JSON.parse(jsonStr);
}

/**
 * Generate skill assessment questions
 * @param {String} skill - The skill to generate questions for
 * @param {Number} questionCount - Number of questions to generate
 * @param {Boolean} includeOpenEnded - Whether to include open-ended questions
 * @param {String} preferredProvider - 'groq' or 'gemini'
 * @returns {Array} Generated questions
 */
async function generateSkillQuestions(skill, questionCount = 5, includeOpenEnded = true, preferredProvider = 'groq') {
    try {
        // Choose API provider based on preference
        if (preferredProvider === 'gemini' && GEMINI_API_KEY) {
            return await generateQuestionsWithGemini(skill, questionCount, includeOpenEnded);
        } else {
            return await generateQuestionsWithGroq(skill, questionCount, includeOpenEnded);
        }
    } catch (error) {
        console.error('Error generating skill questions:', error);
        throw new Error('Failed to generate skill assessment questions');
    }
}

async function generateQuestionsWithGroq(skill, questionCount, includeOpenEnded) {
    const prompt = `
    Generate ${questionCount} assessment questions for evaluating proficiency in ${skill}.
    
    ${includeOpenEnded ? 'Include a mix of multiple-choice and open-ended questions.' : 'All questions should be multiple-choice with 4 options each.'}
    
    For each question, include:
    1. The question text
    2. For multiple-choice: an array of 4 possible answers
    3. Whether the question is open-ended (true/false)
    
    Return the questions as a JSON array with the following structure:
    [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "isOpenEnded": boolean
      }
    ]
    
    The questions should test both theoretical knowledge and practical application of ${skill}.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama3-8b-8192',
        messages: [
            {
                role: 'system',
                content: 'You are an expert in creating effective skill assessment questions that evaluate both theoretical knowledge and practical abilities.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const completion = response.data.choices[0].message.content;
    return JSON.parse(completion);
}

async function generateQuestionsWithGemini(skill, questionCount, includeOpenEnded) {
    const prompt = `
    Generate ${questionCount} assessment questions for evaluating proficiency in ${skill}.
    
    ${includeOpenEnded ? 'Include a mix of multiple-choice and open-ended questions.' : 'All questions should be multiple-choice with 4 options each.'}
    
    For each question, include:
    1. The question text
    2. For multiple-choice: an array of 4 possible answers
    3. Whether the question is open-ended (true/false)
    
    Return the questions as a JSON array with the following structure:
    [
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "isOpenEnded": boolean
      }
    ]
    
    The questions should test both theoretical knowledge and practical application of ${skill}.`;

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ],
                role: "user"
            }
        ],
        generationConfig: {
            temperature: 0.5
        }
    });

    // Parse the response from Gemini
    const textResponse = response.data.candidates[0].content.parts[0].text;
    // Extract the JSON portion from the text
    const jsonStr = textResponse.match(/\[[\s\S]*\]/)[0];
    return JSON.parse(jsonStr);
}

module.exports = {
    evaluateSkillAssessment,
    generateSkillQuestions
}; 