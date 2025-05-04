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
    const jobId = req.params.jobId;
    const userId = req.user.id;
    console.log(`[App Apply] Received application submission request for job ID: ${jobId} from job seeker ID: ${userId}`); // Log start
    
    try {
        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            console.log(`[App Apply] Access denied: User ${userId} is not a job seeker.`);
            return res.status(403).json({ message: 'Access denied. Only job seekers can apply for jobs.' });
        }

        const { coverLetter, resume } = req.body;
        console.log(`[App Apply] Request body:`, { coverLetter: coverLetter ? 'Present' : 'Missing', resume: resume ? 'Present' : 'Missing' }); // Log presence, not content
        // You might want more validation here (e.g., ensure resume URL is valid)

        // Check if job exists
        console.log(`[App Apply] Checking if job ${jobId} exists...`);
        const job = await Job.findById(jobId);
        if (!job) {
            console.log(`[App Apply] Job ${jobId} not found.`);
            return res.status(404).json({ message: 'Job not found' });
        }
        console.log(`[App Apply] Job ${jobId} found.`);

        // Check if already applied
        console.log(`[App Apply] Checking for existing application by ${userId} for job ${jobId}...`);
        const existingApplication = await JobApplication.findOne({
            job: jobId,
            jobSeeker: userId
        });

        if (existingApplication) {
            console.log(`[App Apply] User ${userId} already applied for job ${jobId}.`);
            return res.status(400).json({ message: 'You have already applied for this job' });
        }
        console.log(`[App Apply] No existing application found. Proceeding...`);

        // Create application
        console.log(`[App Apply] Creating new JobApplication document...`);
        const application = new JobApplication({
            job: jobId,
            jobSeeker: userId,
            coverLetter, // Assuming this is a string
            resume,      // Assuming this is a URL string
            status: 'pending',
            applicationHistory: [
                {
                    status: 'pending',
                    date: new Date(),
                    note: 'Application submitted'
                }
            ]
        });

        console.log(`[App Apply] Attempting to save application...`);
        await application.save();
        console.log(`[App Apply] Application saved successfully with ID: ${application._id}`);

        // Update job analytics for this application
        console.log(`[App Apply] Updating analytics for job ${jobId}...`);
        const todayDate = new Date().setHours(0, 0, 0, 0);
        
        // Attempt to increment the application count for today's date entry
        const updateResult = await JobAnalytics.findOneAndUpdate(
            { job: jobId, "dailyStats.date": todayDate }, // Find doc with job ID and today's date in array
            {
                $inc: { 
                    applications: 1,                 // Increment total applications
                    "dailyStats.$.applications": 1 // Increment today's application count
                }
            },
            { new: true } // Return the updated document if found
        );

        // If no document was found and updated (meaning no entry for today existed), upsert one.
        if (!updateResult) {
            console.log(`[App Apply] No analytics entry for today found. Creating/updating entry for job ${jobId}...`);
            await JobAnalytics.findOneAndUpdate(
                { job: jobId },
                { 
                    $inc: { applications: 1 }, // Increment total applications
                    $push: { // Push a NEW object for today
                        dailyStats: { 
                            date: todayDate,
                            views: 0, // Initialize views for the new day
                            applications: 1 
                        }
                    }
                 },
                 { upsert: true, new: true } // Create if doesn't exist, return updated
            );
        }
        console.log(`[App Apply] Job analytics updated.`);

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
            console.error('[App Apply] Error tracking application demographics:', demographicsError);
        }

        console.log(`[App Apply] Sending success response (201 Created).`);
        return res.status(201).json(application);
    } catch (error) {
        // Added log: Error during application submission
        console.error(`[App Apply] Error applying for job ${jobId} by user ${userId}:`, error);
        return res.status(500).json({ message: 'Server error during application submission' }); // Generic error for client
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
    const userId = req.user.id;
    try {
        // Added log: Start request
        console.log(`[App Tracking] Received request to get applications for job seeker ID: ${userId}`);

        // Ensure user is a job seeker
        if (req.user.type !== 'jobseeker') {
            console.log(`[App Tracking] Access denied: User ${userId} is not a job seeker.`);
            return res.status(403).json({ message: 'Access denied. Only job seekers can view their applications.' });
        }

        // Added log: Querying applications
        console.log(`[App Tracking] Finding applications for jobSeeker: ${userId}`);
        const applications = await JobApplication.find({ jobSeeker: userId })
            .populate({
                path: 'job',
                select: 'title company location type salary status',
                populate: {
                    path: 'employer',
                    select: 'name companyName' // Select necessary fields
                }
            })
            .sort({ appliedAt: -1 }); // Sort by application date
        
        // Added log: Found applications
        console.log(`[App Tracking] Found ${applications.length} applications for user ${userId}.`);

        // Fetch interviews for these applications (existing logic)
        const applicationIds = applications.map(app => app._id);
        const interviews = await Interview.find({ 
            jobApplication: { $in: applicationIds } 
        });
        // Added log: Found interviews
        console.log(`[App Tracking] Found ${interviews.length} interviews related to these applications.`);

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
                    statusInfo.message = 'Application reviewed by employer.'; // Clearer message
                    break;
                case 'shortlisted':
                    statusInfo.color = 'purple';
                    statusInfo.message = 'Congratulations! You have been shortlisted.';
                    break;
                case 'interview':
                    statusInfo.color = 'cyan';
                    statusInfo.message = 'Interview scheduled.';
                    break;
                case 'rejected':
                    statusInfo.color = 'red';
                    statusInfo.message = 'Application not selected.';
                    break;
                case 'hired':
                    statusInfo.color = 'green';
                    statusInfo.message = 'Congratulations! You have been hired.';
                    break;
                default:
                    statusInfo.color = 'gray';
                    statusInfo.message = 'Unknown status.';
            }

            // Find related interview data (existing logic)
            const relatedInterview = interviews.find(interview => 
                interview.jobApplication.toString() === app._id.toString()
            );

            // Return a structured object for the frontend
            return {
                _id: app._id,
                job: app.job, // Populated job details
                status: app.status,
                statusInfo: statusInfo, // Include color/message for UI
                appliedAt: app.appliedAt,
                applicationHistory: app.applicationHistory, // Include history if needed
                coverLetter: app.coverLetter, // Add cover letter
                resume: app.resume,          // Add resume URL
                interview: relatedInterview ? { // Include interview details if exists
                     _id: relatedInterview._id,
                     scheduledDateTime: relatedInterview.scheduledDateTime,
                     status: relatedInterview.status,
                     interviewType: relatedInterview.interviewType,
                     location: relatedInterview.location
                 } : null
            };
        });
        
        // Added log: Log the IDs being sent back
        const responseAppIds = formattedApplications.map(app => app._id);
        console.log(`[App Tracking] Application IDs being sent in response for user ${userId}:`, responseAppIds);

        // Added log: Sending response
        console.log(`[App Tracking] Sending ${formattedApplications.length} formatted applications for user ${userId}.`);
        res.json(formattedApplications);

    } catch (error) {
        // Added log: Error fetching applications
        console.error(`[App Tracking] Error fetching applications for job seeker ${userId}:`, error);
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