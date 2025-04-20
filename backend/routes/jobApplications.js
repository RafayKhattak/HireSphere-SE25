const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const User = require('../models/User');
const JobAnalytics = require('../models/JobAnalytics');
const Interview = require('../models/Interview');

// Apply for a job
router.post('/:jobId', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can apply for jobs.' });
        }

        const { coverLetter, resume } = req.body;
        const jobId = req.params.jobId;
        const jobSeekerId = req.user.id;

        // Check if job exists
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if already applied
        const existingApplication = await JobApplication.findOne({
            job: jobId,
            jobSeeker: jobSeekerId
        });

        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        // Create application
        const application = new JobApplication({
            job: jobId,
            jobSeeker: jobSeekerId,
            coverLetter,
            resume,
            status: 'pending',
            applicationHistory: [
                {
                    status: 'pending',
                    date: new Date(),
                    note: 'Application submitted'
                }
            ]
        });

        await application.save();

        // Update job analytics for this application
        const jobAnalytics = await JobAnalytics.findOneAndUpdate(
            { job: jobId },
            { 
                $inc: { applications: 1 },
                $push: { 
                    dailyStats: {
                        date: new Date().setHours(0, 0, 0, 0),
                        applications: 1
                    }
                }
            },
            { upsert: true, new: true }
        );

        // Track applicant demographics for analytics
        try {
            const jobSeeker = await User.findById(req.user.id);
            
            if (jobSeeker) {
                // Track location
                if (jobSeeker.location) {
                    await JobAnalytics.findOneAndUpdate(
                        { 
                            job: jobId,
                            'demographics.locations.location': jobSeeker.location 
                        },
                        { 
                            $inc: { 'demographics.locations.$.count': 1 }
                        }
                    );
                    
                    // If location not yet in the array, add it
                    await JobAnalytics.findOneAndUpdate(
                        { 
                            job: jobId,
                            'demographics.locations.location': { $ne: jobSeeker.location } 
                        },
                        { 
                            $push: { 
                                'demographics.locations': { 
                                    location: jobSeeker.location, 
                                    count: 1 
                                } 
                            }
                        }
                    );
                }
                
                // Track skills
                if (jobSeeker.skills && jobSeeker.skills.length > 0) {
                    for (const skill of jobSeeker.skills) {
                        // Check if skill already exists in analytics
                        const skillExists = await JobAnalytics.findOne({
                            job: jobId,
                            'demographics.skills.skill': skill
                        });
                        
                        if (skillExists) {
                            // Increment count for existing skill
                            await JobAnalytics.findOneAndUpdate(
                                { 
                                    job: jobId,
                                    'demographics.skills.skill': skill 
                                },
                                { 
                                    $inc: { 'demographics.skills.$.count': 1 }
                                }
                            );
                        } else {
                            // Add new skill
                            await JobAnalytics.findOneAndUpdate(
                                { job: jobId },
                                { 
                                    $push: { 
                                        'demographics.skills': { 
                                            skill: skill, 
                                            count: 1 
                                        } 
                                    }
                                }
                            );
                        }
                    }
                }
            }
        } catch (demographicsError) {
            // Don't let demographics tracking failure affect the application
            console.error('Error tracking application demographics:', demographicsError);
        }

        return res.status(201).json(application);
    } catch (error) {
        console.error('Error applying for job:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get all applications for a job (employer only)
router.get('/job/:jobId', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can view job applications.' });
        }

        const jobId = req.params.jobId;
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if user is the employer for this job
        if (job.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view these applications' });
        }

        const applications = await JobApplication.find({ job: jobId })
            .populate('jobSeeker', 'name firstName lastName email skills')
            .sort({ appliedAt: -1 });

        // Fetch interviews for these applications
        const applicationIds = applications.map(app => app._id);
        const interviews = await Interview.find({ 
            jobApplication: { $in: applicationIds } 
        });

        // Map interviews to applications
        const applicationsWithInterviews = applications.map(app => {
            const appObj = app.toObject();
            const relatedInterview = interviews.find(interview => 
                interview.jobApplication.toString() === app._id.toString()
            );
            
            if (relatedInterview) {
                appObj.interview = {
                    _id: relatedInterview._id,
                    scheduledDateTime: relatedInterview.scheduledDateTime,
                    status: relatedInterview.status,
                    interviewType: relatedInterview.interviewType,
                    location: relatedInterview.location
                };
            }
            
            return appObj;
        });

        return res.json(applicationsWithInterviews);
    } catch (error) {
        console.error('Error fetching job applications:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get all applications for a job seeker (with detailed status tracking)
router.get('/jobseeker', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can view their applications.' });
        }

        const applications = await JobApplication.find({ jobSeeker: req.user.id })
            .populate({
                path: 'job',
                select: 'title company location type salary status',
                populate: {
                    path: 'employer',
                    select: 'name companyName'
                }
            })
            .sort({ appliedAt: -1 });

        // Fetch interviews for these applications
        const applicationIds = applications.map(app => app._id);
        const interviews = await Interview.find({ 
            jobApplication: { $in: applicationIds } 
        });

        // Format the response with status information and interview data
        const formattedApplications = applications.map(app => {
            let statusInfo = {
                color: '',
                message: ''
            };

            // Define status colors and messages for the UI
            switch (app.status) {
                case 'pending':
                    statusInfo.color = 'orange';
                    statusInfo.message = 'Your application is under review.';
                    break;
                case 'reviewed':
                    statusInfo.color = 'blue';
                    statusInfo.message = 'Your application has been reviewed.';
                    break;
                case 'interview':
                    statusInfo.color = 'purple';
                    statusInfo.message = 'You have been selected for an interview!';
                    break;
                case 'accepted':
                    statusInfo.color = 'green';
                    statusInfo.message = 'Congratulations! Your application has been accepted.';
                    break;
                case 'rejected':
                    statusInfo.color = 'red';
                    statusInfo.message = 'Unfortunately, your application was not selected.';
                    break;
                default:
                    statusInfo.color = 'grey';
                    statusInfo.message = 'Application status unknown.';
            }

            // Find related interview
            const relatedInterview = interviews.find(interview => 
                interview.jobApplication.toString() === app._id.toString()
            );
            
            // Create formatted application with interview data if available
            const formattedApp = {
                _id: app._id,
                job: app.job,
                status: app.status,
                appliedAt: app.appliedAt,
                statusInfo,
                lastUpdated: app.applicationHistory && app.applicationHistory.length > 0 
                    ? app.applicationHistory[app.applicationHistory.length - 1].date 
                    : app.appliedAt,
                applicationHistory: app.applicationHistory || []
            };
            
            if (relatedInterview) {
                formattedApp.interview = {
                    _id: relatedInterview._id,
                    scheduledDateTime: relatedInterview.scheduledDateTime,
                    status: relatedInterview.status,
                    interviewType: relatedInterview.interviewType,
                    location: relatedInterview.location,
                    duration: relatedInterview.duration,
                    meetingLink: relatedInterview.meetingLink,
                    address: relatedInterview.address
                };
                
                // Update status message if there's an interview
                if (app.status === 'interview') {
                    if (relatedInterview.status === 'scheduled') {
                        formattedApp.statusInfo.message = `Interview scheduled for ${new Date(relatedInterview.scheduledDateTime).toLocaleString()}.`;
                    } else if (relatedInterview.status === 'rescheduled') {
                        formattedApp.statusInfo.message = `Interview rescheduled to ${new Date(relatedInterview.scheduledDateTime).toLocaleString()}.`;
                    } else if (relatedInterview.status === 'cancelled') {
                        formattedApp.statusInfo.message = 'Interview was cancelled.';
                    } else if (relatedInterview.status === 'completed') {
                        formattedApp.statusInfo.message = 'Interview completed. Waiting for feedback.';
                    }
                }
            }
            
            return formattedApp;
        });

        return res.json(formattedApplications);
    } catch (error) {
        console.error('Error fetching job seeker applications:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Update application status (employer only)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can update application status.' });
        }

        const { status, note } = req.body;
        
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        // Validate status
        const validStatuses = ['pending', 'reviewed', 'interview', 'accepted', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const application = await JobApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check if the employer owns the job
        const job = await Job.findById(application.job);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if user is the employer for this job
        if (job.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this application' });
        }

        // Update application status
        application.status = status;
        
        // Add entry to application history
        application.applicationHistory.push({
            status,
            date: new Date(),
            note: note || `Status changed to "${status}"`
        });

        await application.save();

        return res.json(application);
    } catch (error) {
        console.error('Error updating application status:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get application details
router.get('/:id', auth, async (req, res) => {
    try {
        const application = await JobApplication.findById(req.params.id)
            .populate({
                path: 'job',
                select: 'title company location type salary status',
                populate: {
                    path: 'employer',
                    select: 'name companyName'
                }
            })
            .populate('jobSeeker', 'name firstName lastName email skills');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Check authorization - only the job seeker who applied or the employer can view
        if (
            req.user.id !== application.jobSeeker._id.toString() && 
            req.user.id !== application.job.employer._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to view this application' });
        }

        // Get related interview if exists
        const interview = await Interview.findOne({ jobApplication: application._id });
        
        // Convert to plain object to add interview data
        const appResponse = application.toObject();
        
        if (interview) {
            appResponse.interview = interview;
        }

        return res.json(appResponse);
    } catch (error) {
        console.error('Error fetching application details:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get count of applications for a job (employer only)
router.get('/job/:jobId/count', auth, async (req, res) => {
    try {
        // Allow both employers and job seekers to see the count
        const jobId = req.params.jobId;
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // If employer, verify they own the job
        if (req.user.type === 'employer' && job.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view these applications' });
        }

        const count = await JobApplication.countDocuments({ job: jobId });
        return res.json({ count });
    } catch (error) {
        console.error('Error counting job applications:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 