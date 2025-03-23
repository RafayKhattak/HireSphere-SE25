const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    jobSeeker: {
        type: mongoose.Schema.Types.ObjectId,
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
        enum: ['pending', 'reviewed', 'accepted', 'rejected'],
        default: 'pending'
    },
    appliedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure a job seeker can only apply once to a job
jobApplicationSchema.index({ job: 1, jobSeeker: 1 }, { unique: true });

module.exports = mongoose.model('JobApplication', jobApplicationSchema); 