const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const applicationHistorySchema = new Schema({
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'interview', 'accepted', 'rejected'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    note: String
});

// Interview rating schema
const interviewRatingSchema = new Schema({
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    technicalSkills: {
        type: Number,
        min: 1,
        max: 5
    },
    communication: {
        type: Number,
        min: 1,
        max: 5
    },
    culturalFit: {
        type: Number,
        min: 1,
        max: 5
    },
    problemSolving: {
        type: Number,
        min: 1,
        max: 5
    },
    strengths: [String],
    weaknesses: [String],
    feedback: String,
    interviewer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const jobApplicationSchema = new Schema({
    job: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    jobSeeker: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coverLetter: {
        type: String,
        required: true
    },
    resume: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'interview', 'accepted', 'rejected'],
        default: 'pending'
    },
    applicationHistory: [applicationHistorySchema],
    interviewRatings: [interviewRatingSchema],
    appliedAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String
    },
    feedback: {
        type: String
    }
});

// Ensure a job seeker can only apply once to a job
jobApplicationSchema.index({ job: 1, jobSeeker: 1 }, { unique: true });

// Update the lastUpdated timestamp before saving
jobApplicationSchema.pre('save', function(next) {
    this.lastUpdated = Date.now();
    next();
});

module.exports = mongoose.model('JobApplication', jobApplicationSchema); 