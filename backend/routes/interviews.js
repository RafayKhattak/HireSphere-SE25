const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Interview = require('../models/Interview');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const config = require('../config/emailConfig');

// Setup email transporter
const transporter = nodemailer.createTransport(config);

// Schedule an interview (employer only)
router.post('/schedule', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can schedule interviews.' });
        }

        const { 
            jobApplicationId, 
            scheduledDateTime, 
            duration, 
            location, 
            meetingLink, 
            address,
            interviewType,
            description
        } = req.body;

        // Validate required fields
        if (!jobApplicationId || !scheduledDateTime || !location) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check that the date is in the future
        const interviewDate = new Date(scheduledDateTime);
        if (interviewDate <= new Date()) {
            return res.status(400).json({ message: 'Interview date must be in the future' });
        }

        // Validate location-specific fields
        if (location === 'remote' && !meetingLink) {
            return res.status(400).json({ message: 'Meeting link is required for remote interviews' });
        }

        if (location === 'onsite' && !address) {
            return res.status(400).json({ message: 'Address is required for onsite interviews' });
        }

        // Fetch the application
        const application = await JobApplication.findById(jobApplicationId);
        if (!application) {
            return res.status(404).json({ message: 'Job application not found' });
        }

        // Fetch the job to verify employer ownership
        const job = await Job.findById(application.job);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Verify the employer owns this job
        if (job.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to schedule interviews for this job' });
        }

        // Check if there's already an interview scheduled for this application
        const existingInterview = await Interview.findOne({ jobApplication: jobApplicationId });
        if (existingInterview) {
            return res.status(400).json({ 
                message: 'An interview is already scheduled for this application',
                interviewId: existingInterview._id 
            });
        }

        // Check for scheduling conflicts for the employer
        const employerConflict = await Interview.findOne({
            employer: req.user.id,
            scheduledDateTime: {
                $lt: new Date(new Date(scheduledDateTime).getTime() + (duration || 60) * 60000),
                $gt: new Date(scheduledDateTime)
            }
        });

        if (employerConflict) {
            return res.status(409).json({ 
                message: 'You already have an interview scheduled during this time',
                conflictId: employerConflict._id
            });
        }

        // Check for scheduling conflicts for the job seeker
        const jobSeekerConflict = await Interview.findOne({
            jobSeeker: application.jobSeeker,
            scheduledDateTime: {
                $lt: new Date(new Date(scheduledDateTime).getTime() + (duration || 60) * 60000),
                $gt: new Date(scheduledDateTime)
            }
        });

        if (jobSeekerConflict) {
            return res.status(409).json({ 
                message: 'The job seeker already has an interview scheduled during this time',
                conflictId: jobSeekerConflict._id
            });
        }

        // Create the interview
        const interview = new Interview({
            jobApplication: jobApplicationId,
            job: job._id,
            employer: req.user.id,
            jobSeeker: application.jobSeeker,
            scheduledDateTime: interviewDate,
            duration: duration || 60,
            location,
            meetingLink: meetingLink || null,
            address: address || null,
            interviewType: interviewType || 'screening',
            description: description || ''
        });

        await interview.save();

        // Update application status and history
        application.status = 'interview';
        application.applicationHistory.push({
            status: 'interview',
            date: new Date(),
            note: `Interview scheduled for ${new Date(scheduledDateTime).toLocaleString()}`
        });

        await application.save();

        // Send email notifications
        try {
            // Get job seeker details
            const jobSeeker = await User.findById(application.jobSeeker);
            const employer = await User.findById(req.user.id);
            
            if (jobSeeker && jobSeeker.email) {
                // Send email to job seeker
                await transporter.sendMail({
                    from: config.auth.user,
                    to: jobSeeker.email,
                    subject: `Interview Scheduled: ${job.title}`,
                    html: `
                        <h1>Interview Scheduled</h1>
                        <p>Hello ${jobSeeker.firstName || jobSeeker.name},</p>
                        <p>You have been selected for an interview for the position of <strong>${job.title}</strong> at <strong>${job.company}</strong>.</p>
                        <p><strong>Date and Time:</strong> ${new Date(scheduledDateTime).toLocaleString()}</p>
                        <p><strong>Duration:</strong> ${duration || 60} minutes</p>
                        <p><strong>Interview Type:</strong> ${interviewType || 'Screening'}</p>
                        <p><strong>Location:</strong> ${location}</p>
                        ${location === 'remote' ? `<p><strong>Meeting Link:</strong> ${meetingLink}</p>` : ''}
                        ${location === 'onsite' ? `<p><strong>Address:</strong> ${address}</p>` : ''}
                        ${description ? `<p><strong>Additional Information:</strong> ${description}</p>` : ''}
                        <p>Please log in to your account to view more details or to request a reschedule if needed.</p>
                        <p>Good luck!</p>
                    `
                });
            }
        } catch (emailError) {
            console.error('Error sending interview notification email:', emailError);
            // Don't fail the request if email fails
        }

        return res.status(201).json(interview);
    } catch (error) {
        console.error('Error scheduling interview:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get all interviews for an employer
router.get('/employer', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can view their interviews.' });
        }

        const interviews = await Interview.find({ employer: req.user.id })
            .populate({
                path: 'job',
                select: 'title company location type'
            })
            .populate('jobSeeker', 'name firstName lastName email')
            .populate('jobApplication')
            .sort({ scheduledDateTime: 1 });

        return res.json(interviews);
    } catch (error) {
        console.error('Error fetching employer interviews:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get all interviews for a job seeker
router.get('/jobseeker', auth, async (req, res) => {
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Access denied. Only job seekers can view their interviews.' });
        }

        const interviews = await Interview.find({ jobSeeker: req.user.id })
            .populate({
                path: 'job',
                select: 'title company location type',
                populate: {
                    path: 'employer',
                    select: 'name companyName'
                }
            })
            .populate('employer', 'name companyName email')
            .sort({ scheduledDateTime: 1 });

        return res.json(interviews);
    } catch (error) {
        console.error('Error fetching job seeker interviews:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get interview details
router.get('/:id', auth, async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id)
            .populate({
                path: 'job',
                select: 'title company location type salary',
                populate: {
                    path: 'employer',
                    select: 'name companyName'
                }
            })
            .populate('employer', 'name companyName email')
            .populate('jobSeeker', 'name firstName lastName email')
            .populate('jobApplication');

        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        // Check authorization - only the job seeker who is being interviewed or the employer can view
        if (
            req.user.id !== interview.jobSeeker._id.toString() && 
            req.user.id !== interview.employer._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to view this interview' });
        }

        return res.json(interview);
    } catch (error) {
        console.error('Error fetching interview details:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Update interview details (employer only)
router.patch('/:id', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can update interviews.' });
        }

        const interview = await Interview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        // Check if the employer owns this interview
        if (interview.employer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this interview' });
        }

        const { 
            scheduledDateTime, 
            duration, 
            location, 
            meetingLink, 
            address,
            interviewType,
            description,
            status,
            notes,
            feedback
        } = req.body;

        // Check if this is a reschedule
        let isReschedule = false;
        if (scheduledDateTime && new Date(scheduledDateTime).getTime() !== new Date(interview.scheduledDateTime).getTime()) {
            isReschedule = true;
            
            // Check that the new date is in the future
            const newInterviewDate = new Date(scheduledDateTime);
            if (newInterviewDate <= new Date()) {
                return res.status(400).json({ message: 'Interview date must be in the future' });
            }

            // Check for scheduling conflicts
            const employerConflict = await Interview.findOne({
                _id: { $ne: req.params.id }, // Exclude current interview
                employer: req.user.id,
                scheduledDateTime: {
                    $lt: new Date(new Date(scheduledDateTime).getTime() + (duration || interview.duration) * 60000),
                    $gt: new Date(scheduledDateTime)
                }
            });

            if (employerConflict) {
                return res.status(409).json({ 
                    message: 'You already have an interview scheduled during this time',
                    conflictId: employerConflict._id
                });
            }

            const jobSeekerConflict = await Interview.findOne({
                _id: { $ne: req.params.id }, // Exclude current interview
                jobSeeker: interview.jobSeeker,
                scheduledDateTime: {
                    $lt: new Date(new Date(scheduledDateTime).getTime() + (duration || interview.duration) * 60000),
                    $gt: new Date(scheduledDateTime)
                }
            });

            if (jobSeekerConflict) {
                return res.status(409).json({ 
                    message: 'The job seeker already has an interview scheduled during this time',
                    conflictId: jobSeekerConflict._id
                });
            }

            interview.scheduledDateTime = scheduledDateTime;
            
            if (status !== 'rescheduled') {
                interview.status = 'rescheduled';
            }
        }

        // Update other fields if provided
        if (duration) interview.duration = duration;
        if (location) interview.location = location;
        if (meetingLink !== undefined) interview.meetingLink = meetingLink;
        if (address !== undefined) interview.address = address;
        if (interviewType) interview.interviewType = interviewType;
        if (description !== undefined) interview.description = description;
        if (status && !isReschedule) interview.status = status;
        if (notes !== undefined) interview.notes = notes;
        if (feedback !== undefined) interview.feedback = feedback;

        await interview.save();

        // Update application history if status changed or rescheduled
        if (isReschedule || (status && status !== interview.status)) {
            const application = await JobApplication.findById(interview.jobApplication);
            if (application) {
                // Don't change application status if interview was just rescheduled
                if (status && status !== 'rescheduled' && status !== interview.status) {
                    application.status = 'interview'; // Keep the status as interview
                }

                application.applicationHistory.push({
                    status: 'interview',
                    date: new Date(),
                    note: isReschedule 
                        ? `Interview rescheduled to ${new Date(scheduledDateTime).toLocaleString()}`
                        : `Interview status updated to ${status}`
                });

                await application.save();
            }
        }

        // Send email notification for reschedule
        if (isReschedule) {
            try {
                const jobSeeker = await User.findById(interview.jobSeeker);
                const job = await Job.findById(interview.job);
                
                if (jobSeeker && jobSeeker.email && job) {
                    await transporter.sendMail({
                        from: config.auth.user,
                        to: jobSeeker.email,
                        subject: `Interview Rescheduled: ${job.title}`,
                        html: `
                            <h1>Interview Rescheduled</h1>
                            <p>Hello ${jobSeeker.firstName || jobSeeker.name},</p>
                            <p>Your interview for the position of <strong>${job.title}</strong> at <strong>${job.company}</strong> has been rescheduled.</p>
                            <p><strong>New Date and Time:</strong> ${new Date(scheduledDateTime).toLocaleString()}</p>
                            <p><strong>Duration:</strong> ${duration || interview.duration} minutes</p>
                            <p><strong>Location:</strong> ${location || interview.location}</p>
                            ${(location === 'remote' || interview.location === 'remote') ? 
                                `<p><strong>Meeting Link:</strong> ${meetingLink || interview.meetingLink}</p>` : ''}
                            ${(location === 'onsite' || interview.location === 'onsite') ? 
                                `<p><strong>Address:</strong> ${address || interview.address}</p>` : ''}
                            <p>Please log in to your account to view more details.</p>
                        `
                    });
                }
            } catch (emailError) {
                console.error('Error sending interview reschedule email:', emailError);
                // Don't fail the request if email fails
            }
        }

        return res.json(interview);
    } catch (error) {
        console.error('Error updating interview:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Cancel an interview
router.delete('/:id', auth, async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ message: 'Interview not found' });
        }

        // Check authorization - both employer and job seeker can cancel
        if (
            req.user.id !== interview.jobSeeker.toString() && 
            req.user.id !== interview.employer.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to cancel this interview' });
        }

        // Update interview status to cancelled rather than deleting
        interview.status = 'cancelled';
        await interview.save();

        // Update application history
        const application = await JobApplication.findById(interview.jobApplication);
        if (application) {
            application.applicationHistory.push({
                status: application.status, // Keep the same status
                date: new Date(),
                note: `Interview cancelled by ${req.user.type === 'employer' ? 'employer' : 'job seeker'}`
            });

            await application.save();
        }

        // Send email notification
        try {
            const job = await Job.findById(interview.job);
            
            // If employer cancels, notify job seeker
            if (req.user.id === interview.employer.toString()) {
                const jobSeeker = await User.findById(interview.jobSeeker);
                if (jobSeeker && jobSeeker.email && job) {
                    await transporter.sendMail({
                        from: config.auth.user,
                        to: jobSeeker.email,
                        subject: `Interview Cancelled: ${job.title}`,
                        html: `
                            <h1>Interview Cancelled</h1>
                            <p>Hello ${jobSeeker.firstName || jobSeeker.name},</p>
                            <p>Your interview for the position of <strong>${job.title}</strong> at <strong>${job.company}</strong> has been cancelled by the employer.</p>
                            <p>The interview was scheduled for ${new Date(interview.scheduledDateTime).toLocaleString()}.</p>
                            <p>Please log in to your account for more details.</p>
                        `
                    });
                }
            } 
            // If job seeker cancels, notify employer
            else {
                const employer = await User.findById(interview.employer);
                const jobSeeker = await User.findById(interview.jobSeeker);
                if (employer && employer.email && job) {
                    await transporter.sendMail({
                        from: config.auth.user,
                        to: employer.email,
                        subject: `Interview Cancelled by Candidate: ${job.title}`,
                        html: `
                            <h1>Interview Cancelled by Candidate</h1>
                            <p>Hello ${employer.name},</p>
                            <p>The interview for the position of <strong>${job.title}</strong> has been cancelled by the candidate ${jobSeeker.firstName || jobSeeker.name}.</p>
                            <p>The interview was scheduled for ${new Date(interview.scheduledDateTime).toLocaleString()}.</p>
                            <p>Please log in to your account for more details.</p>
                        `
                    });
                }
            }
        } catch (emailError) {
            console.error('Error sending interview cancellation email:', emailError);
            // Don't fail the request if email fails
        }

        return res.json({ message: 'Interview cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling interview:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// Generate a Google Meet link for an interview (employer only)
router.post('/generate-meet-link', auth, async (req, res) => {
    try {
        // Ensure user is an employer
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can generate meeting links.' });
        }

        const { scheduledDateTime, duration, interviewType } = req.body;
        
        if (!scheduledDateTime) {
            return res.status(400).json({ message: 'Scheduled date and time are required' });
        }

        // If we had Google Calendar API integration, we would use it here
        // For the MVP, we'll generate a placeholder Meet link that employers can replace
        
        // This simulates generating a Google Meet link
        // In a real implementation, we would use the Google Calendar API to create an event and get the meeting link
        const generateMeetCode = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            const meetCode = [];
            
            // First part: 3 chars
            for (let i = 0; i < 3; i++) {
                meetCode.push(chars.charAt(Math.floor(Math.random() * chars.length)));
            }
            
            meetCode.push('-');
            
            // Second part: 4 chars
            for (let i = 0; i < 4; i++) {
                meetCode.push(chars.charAt(Math.floor(Math.random() * chars.length)));
            }
            
            meetCode.push('-');
            
            // Third part: 3 chars
            for (let i = 0; i < 3; i++) {
                meetCode.push(chars.charAt(Math.floor(Math.random() * chars.length)));
            }
            
            return meetCode.join('');
        };
        
        const meetCode = generateMeetCode();
        const meetingLink = `https://meet.google.com/${meetCode}`;
        
        // In a real implementation with Google Calendar API, we'd create a calendar event:
        /*
        const calendar = google.calendar({version: 'v3', auth});
        const event = {
            summary: `Interview: ${interviewType}`,
            description: 'Job interview scheduled through HireSphere',
            start: {
                dateTime: new Date(scheduledDateTime).toISOString(),
                timeZone: 'America/New_York',
            },
            end: {
                dateTime: new Date(new Date(scheduledDateTime).getTime() + duration * 60000).toISOString(),
                timeZone: 'America/New_York',
            },
            conferenceData: {
                createRequest: {
                    requestId: uuidv4(),
                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
            },
        };
        
        const calendarResponse = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
        });
        
        const meetingLink = calendarResponse.data.hangoutLink;
        */
        
        return res.json({ meetingLink });
    } catch (error) {
        console.error('Error generating Google Meet link:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 