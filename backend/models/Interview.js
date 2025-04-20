const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
    jobApplication: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobApplication',
        required: true
    },
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobSeeker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    scheduledDateTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // Duration in minutes
        default: 60
    },
    location: {
        type: String,
        enum: ['onsite', 'remote', 'phone'],
        required: true
    },
    meetingLink: {
        type: String,
        default: null
    },
    address: {
        type: String,
        default: null
    },
    interviewType: {
        type: String,
        enum: ['screening', 'technical', 'behavioral', 'final'],
        default: 'screening'
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
        default: 'scheduled'
    },
    notes: {
        type: String,
        default: ''
    },
    feedback: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Create compound index to ensure uniqueness for a specific interview time slot
interviewSchema.index({ jobSeeker: 1, scheduledDateTime: 1 }, { unique: true });
interviewSchema.index({ employer: 1, scheduledDateTime: 1 }, { unique: true });
interviewSchema.index({ jobApplication: 1 });

// Pre-save hook to update timestamps
interviewSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Interview', interviewSchema); 