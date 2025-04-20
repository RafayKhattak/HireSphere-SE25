const mongoose = require('mongoose');

const jobAnalyticsSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    uniqueViews: {
        type: Number,
        default: 0
    },
    clickThroughs: {
        type: Number,
        default: 0
    },
    applications: {
        type: Number,
        default: 0
    },
    // To track unique viewers (stored as an array of IPs)
    viewerIps: {
        type: [String],
        default: [],
        select: false // Don't include this field when querying by default for privacy
    },
    // Track view sources and demographics for detailed analytics
    viewSources: {
        direct: { type: Number, default: 0 },
        search: { type: Number, default: 0 },
        recommendation: { type: Number, default: 0 },
        email: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    // Track viewers by demographic info (anonymized)
    demographics: {
        locations: [{
            location: String,
            count: Number
        }],
        skills: [{
            skill: String,
            count: Number
        }]
    },
    // Track daily stats for trend analysis
    dailyStats: [{
        date: Date,
        views: Number,
        applications: Number
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Create a unique index on the job field
jobAnalyticsSchema.index({ job: 1 }, { unique: true });

module.exports = mongoose.model('JobAnalytics', jobAnalyticsSchema); 