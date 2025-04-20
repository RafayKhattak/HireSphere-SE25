const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companyReviewSchema = new Schema({
    company: {
        type: Schema.Types.ObjectId,
        ref: 'User', // References the employer user
        required: true
    },
    reviewer: {
        type: Schema.Types.ObjectId,
        ref: 'User', // References the job seeker who wrote the review
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    review: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    pros: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    cons: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    position: {
        type: String,
        trim: true
    },
    isCurrentEmployee: {
        type: Boolean,
        default: false
    },
    employmentStatus: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship', 'former', 'prefer-not-to-say'],
        default: 'prefer-not-to-say'
    },
    workDuration: {
        type: String,
        trim: true
    },
    categories: {
        workLifeBalance: {
            type: Number,
            min: 1,
            max: 5
        },
        compensation: {
            type: Number,
            min: 1,
            max: 5
        },
        jobSecurity: {
            type: Number,
            min: 1,
            max: 5
        },
        management: {
            type: Number,
            min: 1,
            max: 5
        },
        cultureValues: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre save hook to update updatedAt timestamp
companyReviewSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient querying
companyReviewSchema.index({ company: 1, status: 1 });
companyReviewSchema.index({ reviewer: 1 });

module.exports = mongoose.model('CompanyReview', companyReviewSchema); 