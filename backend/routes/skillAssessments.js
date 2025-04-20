const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SkillAssessment = require('../models/SkillAssessment');
const User = require('../models/User');
const { generateSkillQuestions, evaluateSkillAssessment } = require('../services/aiAssessmentService');

// @route   POST /api/assessments/generate
// @desc    Generate a new skill assessment
// @access  Private (Job seekers only)
router.post('/generate', auth, async (req, res) => {
    try {
        // Check if user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can take skill assessments' });
        }

        const { skill, questionCount = 5, includeOpenEnded = true, aiProvider = 'groq' } = req.body;

        if (!skill) {
            return res.status(400).json({ message: 'Skill is required' });
        }

        // Generate questions using AI
        const questions = await generateSkillQuestions(
            skill, 
            questionCount, 
            includeOpenEnded,
            aiProvider
        );

        // Create a new assessment
        const assessment = new SkillAssessment({
            jobSeeker: req.user._id,
            skill,
            questions: questions.map(q => ({
                question: q.question,
                options: q.options || [],
                isOpenEnded: q.isOpenEnded
            })),
            status: 'pending'
        });

        await assessment.save();

        res.status(201).json(assessment);
    } catch (error) {
        console.error('Error generating skill assessment:', error);
        res.status(500).json({ message: 'Error generating skill assessment', error: error.message });
    }
});

// @route   GET /api/assessments
// @desc    Get all assessments for the current job seeker
// @access  Private (Job seekers only)
router.get('/', auth, async (req, res) => {
    try {
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can access assessments' });
        }

        const assessments = await SkillAssessment.find({ jobSeeker: req.user._id })
            .sort({ createdAt: -1 });
        
        res.json(assessments);
    } catch (error) {
        console.error('Error fetching assessments:', error);
        res.status(500).json({ message: 'Error fetching assessments' });
    }
});

// @route   GET /api/assessments/:id
// @desc    Get a specific assessment
// @access  Private (Job seekers only)
router.get('/:id', auth, async (req, res) => {
    try {
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can access assessments' });
        }

        const assessment = await SkillAssessment.findById(req.params.id);
        
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Check if the assessment belongs to the current user
        if (assessment.jobSeeker.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to access this assessment' });
        }

        res.json(assessment);
    } catch (error) {
        console.error('Error fetching assessment:', error);
        res.status(500).json({ message: 'Error fetching assessment' });
    }
});

// @route   POST /api/assessments/:id/submit
// @desc    Submit answers for an assessment
// @access  Private (Job seekers only)
router.post('/:id/submit', auth, async (req, res) => {
    try {
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can submit assessments' });
        }

        const { responses, aiProvider = 'groq' } = req.body;

        if (!responses || !Array.isArray(responses)) {
            return res.status(400).json({ message: 'Responses are required' });
        }

        const assessment = await SkillAssessment.findById(req.params.id);
        
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Check if the assessment belongs to the current user
        if (assessment.jobSeeker.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to submit this assessment' });
        }

        // Update the assessment with the responses
        assessment.responses = responses;
        assessment.status = 'completed';
        assessment.completedAt = new Date();
        
        await assessment.save();

        // Evaluate the assessment using AI
        try {
            const evaluation = await evaluateSkillAssessment(assessment, aiProvider);
            
            // Update the assessment with the evaluation
            assessment.score = evaluation.score;
            assessment.feedback = evaluation.detailedAnalysis;
            assessment.aiEvaluation = {
                strengths: evaluation.strengths,
                weaknesses: evaluation.weaknesses,
                recommendations: evaluation.recommendations,
                detailedAnalysis: evaluation.detailedAnalysis
            };
            assessment.status = 'evaluated';
            
            await assessment.save();

            // Update user's skills in profile if the score is good
            if (evaluation.score >= 70) {
                const user = await User.findById(req.user._id);
                
                // Add the skill to the user's profile if it doesn't exist already
                if (!user.skills.includes(assessment.skill)) {
                    user.skills.push(assessment.skill);
                    await user.save();
                }
            }
            
            res.json(assessment);
        } catch (evalError) {
            console.error('Error evaluating assessment:', evalError);
            // Still return the assessment even if evaluation fails
            res.json({
                ...assessment._doc,
                evaluationError: 'Could not evaluate assessment at this time. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Error submitting assessment:', error);
        res.status(500).json({ message: 'Error submitting assessment', error: error.message });
    }
});

module.exports = router; 