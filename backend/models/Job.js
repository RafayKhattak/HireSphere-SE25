const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Job title is required'],
        maxlength: [100, 'Job title cannot exceed 100 characters']
    },
    company: {
        type: String,
        required: [true, 'Company name is required']
    },
    location: {
        type: String,
        required: [true, 'Location is required']
    },
    type: {
        type: String,
        required: [true, 'Job type is required'],
        enum: ['full-time', 'part-time', 'contract', 'internship']
    },
    salary: {
        min: {
            type: Number,
            required: [true, 'Minimum salary is required']
        },
        max: {
            type: Number,
            required: [true, 'Maximum salary is required']
        },
        currency: {
            type: String,
            default: 'USD'
        }
    },
    description: {
        type: String,
        required: [true, 'Job description is required']
    },
    requirements: {
        type: String,
        required: [true, 'Job requirements are required']
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bookmarkedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
jobSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Job', jobSchema); 