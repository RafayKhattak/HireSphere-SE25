const mongoose = require('mongoose');

const jobAlertSchema = new mongoose.Schema({
    jobSeeker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        trim: true,
        default: 'Unnamed Alert'
    },
    keywords: [{
        type: String,
        trim: true
    }],
    locations: [{
        type: String,
        trim: true
    }],
    jobTypes: [{
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship']
    }],
    salary: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'PKR'
        }
    },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'immediate'],
        default: 'daily'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastSentAt: {
        type: Date
    }
});

module.exports = mongoose.model('JobAlert', jobAlertSchema); 