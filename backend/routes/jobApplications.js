const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');

// Apply for a job
router.post('/:jobId', auth, async (req, res) => {
    try {
        const { coverLetter, resume } = req.body;
        const jobId = req.params.jobId;
        const jobSeekerId = req.user.id;

        // Check if job exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Create application
        const application = new JobApplication({
            job: jobId,
            jobSeeker: jobSeekerId,
            coverLetter,
            resume
        });

        await application.save();

        // Add application to job's applications array
        job.applications.push({
            jobSeeker: jobSeekerId,
            appliedAt: new Date(),
            status: 'pending'
        });
        await job.save();

        res.status(201).json(application);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all applications for a job (employer only)
router.get('/job/:jobId', auth, async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if user is the employer
        if (job.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const applications = await JobApplication.find({ job: jobId })
            .populate('jobSeeker', 'firstName lastName email')
            .sort({ appliedAt: -1 });

        res.json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all applications for a job seeker
router.get('/jobseeker', auth, async (req, res) => {
    try {
        const applications = await JobApplication.find({ jobSeeker: req.user.id })
            .populate('job', 'title companyName')
            .sort({ appliedAt: -1 });

        res.json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update application status (employer only)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const application = await JobApplication.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const job = await Job.findById(application.job);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if user is the employer
        if (job.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        application.status = status;
        await application.save();

        // Update status in job's applications array
        const jobApplication = job.applications.find(
            app => app.jobSeeker.toString() === application.jobSeeker.toString()
        );
        if (jobApplication) {
            jobApplication.status = status;
            await job.save();
        }

        res.json(application);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 