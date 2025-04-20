const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SkillAssessmentSchema = new Schema({
    jobSeeker: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    skill: {
        type: String,
        required: true
    },
    questions: [{
        question: {
            type: String,
            required: true
        },
        options: [{
            type: String
        }],
        // For questions that don't have predefined options (coding/essay questions)
        isOpenEnded: {
            type: Boolean,
            default: false
        }
    }],
    responses: [{
        questionIndex: {
            type: Number,
            required: true
        },
        answer: {
            type: String,
            required: true
        }
    }],
    score: {
        type: Number,
        min: 0,
        max: 100
    },
    feedback: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'evaluated'],
        default: 'pending'
    },
    aiEvaluation: {
        strengths: [String],
        weaknesses: [String],
        recommendations: [String],
        detailedAnalysis: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
});

module.exports = mongoose.model('SkillAssessment', SkillAssessmentSchema); 