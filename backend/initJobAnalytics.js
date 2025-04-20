require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');
const JobAnalytics = require('./models/JobAnalytics');

/**
 * Initialize job analytics for all jobs that don't have analytics records yet
 */
async function initializeJobAnalytics() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');
        
        // Find all jobs
        const jobs = await Job.find();
        console.log(`Found ${jobs.length} jobs`);
        
        // For each job, check if analytics exist and create if not
        let created = 0;
        
        for (const job of jobs) {
            const analytics = await JobAnalytics.findOne({ job: job._id });
            
            if (!analytics) {
                // Create a new analytics record with default values
                const newAnalytics = new JobAnalytics({
                    job: job._id,
                    views: 0,
                    uniqueViews: 0,
                    clickThroughs: 0,
                    applications: 0,
                    viewSources: {
                        direct: 0,
                        search: 0,
                        recommendation: 0,
                        email: 0,
                        other: 0
                    },
                    demographics: {
                        locations: [],
                        skills: []
                    },
                    dailyStats: [{
                        date: new Date(),
                        views: 0,
                        applications: 0
                    }],
                    lastUpdated: new Date()
                });
                
                await newAnalytics.save();
                created++;
                console.log(`Created analytics for job: ${job.title} (${job._id})`);
            }
        }
        
        console.log(`Created ${created} analytics records for jobs that didn't have them`);
        console.log('Job analytics initialization complete');
        
    } catch (error) {
        console.error('Error initializing job analytics:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

// Run the initialization
initializeJobAnalytics().then(() => {
    console.log('Job analytics initialization script finished');
}); 