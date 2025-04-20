// Load environment variables first, before anything else
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const fs = require('fs');
const path = require('path');
const userRoutes = require('./routes/users');
const applicationRoutes = require('./routes/applications');
const employerRoutes = require('./routes/employer');
const jobSeekerRoutes = require('./routes/jobseeker');
const skillAssessmentRoutes = require('./routes/skillAssessment');
const screeningRoutes = require('./routes/screening');
const companyReviewsRoutes = require('./routes/companyReviews');
const interviewsRoutes = require('./routes/interviews');
const jobAlertService = require('./services/jobAlertService');

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist (for backward compatibility)
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
    fs.mkdirSync('uploads/logos', { recursive: true });
    fs.mkdirSync('uploads/profiles', { recursive: true });
    console.log('Created uploads directories');
} else {
    console.log('Uploads directories already exist');
}

// Log the full path to uploads directory
console.log('Uploads directory path:', path.resolve(__dirname, 'uploads'));

// Serve static files from uploads directory (for backward compatibility)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('Serving static files from:', path.join(__dirname, 'uploads'));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/jobseeker', jobSeekerRoutes);
app.use('/api/skill-assessments', skillAssessmentRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/bookmarks', require('./routes/bookmarks'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/job-alerts', require('./routes/jobAlerts'));
app.use('/api/assessments', require('./routes/skillAssessments'));
app.use('/api/company-reviews', companyReviewsRoutes);
app.use('/api/interviews', interviewsRoutes);

// Sprint 2 New Routes
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/test', require('./routes/test'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Initialize job alert schedulers
    if (process.env.NODE_ENV !== 'test') {
        jobAlertService.initJobAlertSchedulers();
        console.log('Job alert schedulers initialized');
    }
}); 