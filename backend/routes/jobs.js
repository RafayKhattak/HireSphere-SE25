const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');

console.log('[DIAGNOSTIC] backend/routes/jobs.js loaded successfully (minimal).');

// @route   POST /api/jobs
// @desc    Create a new job posting
// @access  Private (Employers only)
router.post('/', auth, async (req, res) => {
    try {
        // Added log: Received request
        console.log(`[Job Post] Received request to create job from employer ID: ${req.user.id}`);
        console.log(`[Job Post] Request body:`, JSON.stringify(req.body));

        // Check if user is an employer
        if (req.user.type !== 'employer') {
            console.log(`[Job Post] Access denied: User ${req.user.id} is not an employer.`);
            return res.status(403).json({ message: 'Only employers can post jobs' });
        }

        // Added log: Fetching employer details
        console.log(`[Job Post] Fetching employer details for user ID: ${req.user.id}`);
        const employer = await User.findById(req.user.id); // Use req.user.id consistently
        if (!employer) {
             console.error(`[Job Post] Employer not found in database for ID: ${req.user.id}`);
             return res.status(404).json({ message: 'Employer account not found.' });
        }
        if (!employer.companyName) {
             console.warn(`[Job Post] Employer ${employer.email} needs to complete company profile (missing companyName).`);
            return res.status(400).json({ message: 'Please complete your company profile before posting jobs' });
        }
        console.log(`[Job Post] Employer found: ${employer.email}, Company: ${employer.companyName}`);

        // Added log: Creating Job object
        console.log(`[Job Post] Creating new Job document...`);
        const job = new Job({
            ...req.body,
            company: employer.companyName, // Use the company name from employer profile
            employer: req.user.id // Use req.user.id consistently
        });

        // Added log: Saving job to database
        console.log(`[Job Post] Attempting to save job titled "${job.title}" to database...`);
        await job.save();
        console.log(`[Job Post] Job saved successfully with ID: ${job._id}`);

        // Added log: Sending response
        console.log(`[Job Post] Sending success response (201 Created).`);
        res.status(201).json(job);
    } catch (error) {
        // Added log: Error during job creation
        console.error(`[Job Post] Error creating job for employer ID ${req?.user?.id}:`, error);
         // Check for validation errors
        if (error.name === 'ValidationError') {
             console.error('[Job Post] Validation Errors:', error.errors);
            return res.status(400).json({ 
                message: 'Validation failed', 
                errors: error.errors 
            });
        }
        res.status(500).json({ message: 'Error creating job posting' });
    }
});

// @route   GET /api/jobs
// @desc    Get all job postings with optional filters
// @access  Public (but adds bookmark status if authenticated)
router.get('/', async (req, res) => {
    try {
        // Added log: Received request with query params
        console.log(`[Job Search] Received job search request. Query params:`, JSON.stringify(req.query));

        // --- Try to get logged-in user's bookmarks --- 
        let userBookmarks = new Set();
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.user?.id) {
                    const user = await User.findById(decoded.user.id).select('bookmarks');
                    if (user && user.bookmarks) {
                        userBookmarks = new Set(user.bookmarks.map(id => id.toString()));
                        console.log(`[Job Search] Found ${userBookmarks.size} bookmarks for user ${decoded.user.id}`);
                    }
                }
            } catch (err) {
                console.log('[Job Search] Invalid or expired token found, ignoring bookmarks.', err.message);
                // Ignore error if token is invalid/expired, proceed as unauthenticated
            }
        }
        // --- End bookmark fetching ---

        const { 
            location, 
            minSalary, // Now assumed to be PKR
            maxSalary, // Now assumed to be PKR
            jobType, 
            keywords,
            skills, 
            experienceLevel, 
            page = 1,
            limit = 10
        } = req.query;
        
        // Build query filters
        const query = { status: 'open' };
        
        if (location) {
            query.location = { $regex: location, $options: 'i' };
             console.log(`[Job Search] Applied filter: Location contains "${location}"`);
        }
        
        // --- Salary Filter (Assuming PKR) ---
        if (minSalary || maxSalary) {
            const salaryFilter = {};
            const filterMin = minSalary ? Number(minSalary) : 0; // Use 0 if no min filter
            const filterMax = maxSalary ? Number(maxSalary) : Infinity; // Use Infinity if no max filter

            // Logic: A job's range (jobMin-jobMax) overlaps with the filter range (filterMin-filterMax) if:
            // jobMin <= filterMax AND jobMax >= filterMin
            // We need to query based on the fields in the database (`salary.min`, `salary.max`)
            salaryFilter['$and'] = [
                { 'salary.min': { $lte: filterMax } }, // Job's min salary must be less than or equal to filter's max
                { 'salary.max': { $gte: filterMin } }  // Job's max salary must be greater than or equal to filter's min
            ];
            
            // Add this $and condition to the main query
            if (!query.$and) {
                query.$and = [];
            }
            query.$and.push(salaryFilter);

            console.log(`[Job Search] Applied filter: Salary range PKR overlaps with (${filterMin === 0 ? 'any' : filterMin} - ${filterMax === Infinity ? 'any' : filterMax})`);
        }
        // --- End Salary Filter ---
        
        if (jobType) {
            query.type = jobType;
            console.log(`[Job Search] Applied filter: Job Type is "${jobType}"`);
        }
        
        // Handle keywords filter
        if (keywords) {
            const keywordRegex = { $regex: keywords, $options: 'i' };
            query.$or = [
                { title: keywordRegex },
                { description: keywordRegex },
                { requirements: keywordRegex },
                { company: keywordRegex } // Also search company name
            ];
            console.log(`[Job Search] Applied filter: Keywords contain "${keywords}" (in title, desc, reqs, company)`);
        }

        // Handle skills filter (assuming comma-separated string)
        if (skills) {
            const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
            if (skillsArray.length > 0) {
                const skillRegexes = skillsArray.map(skill => new RegExp(skill, 'i'));
                 // Add to $and if other conditions exist, or set directly
                 if (query.$and) {
                     query.$and.push({ skills: { $in: skillRegexes } }); 
                 } else if (query.$or) {
                    // If keywords created an $or, we need to wrap both in $and
                    query.$and = [ { $or: query.$or }, { skills: { $in: skillRegexes } } ];
                    delete query.$or;
                 } else {
                    query.skills = { $in: skillRegexes };
                 }
                console.log(`[Job Search] Applied filter: Skills include any of [${skillsArray.join(', ')}]`);
            }
        }

        // Handle experience level filter
        if (experienceLevel) {
            // Assuming 'experienceLevel' field exists in the Job model
            query.experienceLevel = experienceLevel;
            console.log(`[Job Search] Applied filter: Experience Level is "${experienceLevel}"`);
        }
        
        // IMPORTANT: Combine keyword $or with other $and conditions if both exist
        const keywordOrCondition = query.$or;
        delete query.$or; // Temporarily remove $or

        // Now, if we have both keyword conditions and other $and conditions (like salary or skills),
        // nest the $or inside the main $and array.
        if (keywordOrCondition) {
            if (!query.$and) { query.$and = []; }
            query.$and.push({ $or: keywordOrCondition });
            console.log(`[Job Search] Combined keyword search ($or) with other filters ($and).`);
        }

        // Added log: Final generated query
        console.log(`[Job Search] Final DB Query:`, JSON.stringify(query));
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const jobs = await Job.find(query)
            .populate('employer', 'name email companyName companyLogo companyDescription')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Job.countDocuments(query);

        // Added log: Number of results found
        console.log(`[Job Search] Found ${total} total matching jobs. Returning page ${page} with ${jobs.length} jobs.`);

        // --- Add isBookmarked field --- 
        const jobsWithBookmarkStatus = jobs.map(job => {
            const jobObject = job.toObject(); // Convert Mongoose doc to plain object
            jobObject.isBookmarked = userBookmarks.has(jobObject._id.toString());
            // delete jobObject.bookmarkedBy; // Optional: remove the potentially misleading field
            return jobObject;
        });
        // --- End adding isBookmarked ---
        
        // Explicitly log the first job again to check for isBookmarked
        if (jobsWithBookmarkStatus.length > 0) {
            console.log('[Job Search] Sample job data being sent (first job with isBookmarked):', jobsWithBookmarkStatus[0]);
        }

        res.json({
            jobs: jobsWithBookmarkStatus, // Send modified array
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) { // Added error log
        console.error('[Job Search] Error fetching jobs:', error);
        console.error('[Job Search] Request Query:', req.query); // Log query params on error
        res.status(500).json({ message: 'Error fetching job postings' });
    }
});

// @route   GET /api/jobs/employer
// @desc    Get all jobs posted by the current employer
// @access  Private (Employers only)
router.get('/employer', auth, async (req, res) => {
    try {
        if (req.user.type !== 'employer') {
            return res.status(403).json({ message: 'Only employers can access this route' });
        }

        const jobs = await Job.find({ employer: req.user._id })
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching employer jobs:', error);
        res.status(500).json({ message: 'Error fetching job postings' });
    }
});

// @route   GET /api/jobs/bookmarks/me
// @desc    Get all bookmarked jobs for the current job seeker
// @access  Private (Job Seekers only)
router.get('/bookmarks/me', auth, async (req, res) => {
    try {
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can access this route' });
        }

        const jobs = await Job.find({ bookmarkedBy: req.user._id })
            .populate('employer', 'name email companyName companyLogo companyDescription')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching bookmarked jobs:', error);
        res.status(500).json({ message: 'Error fetching bookmarked jobs' });
    }
});

// @route   GET /api/jobs/:id
// @desc    Get a specific job posting
// @access  Public (but adds bookmark status if authenticated)
// RESTORED original async and try/catch block
router.get('/:id', async (req, res) => { 
    try {
        // --- Try to get logged-in user's bookmarks --- 
        let userBookmarks = new Set();
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.user?.id) {
                    const user = await User.findById(decoded.user.id).select('bookmarks');
                    if (user && user.bookmarks) {
                        userBookmarks = new Set(user.bookmarks.map(id => id.toString()));
                    }
                }
            } catch (err) {
                // Ignore error
            }
        }
        // --- End bookmark fetching ---

        const job = await Job.findById(req.params.id)
            .populate('employer', 'name email companyName companyLogo companyDescription industry companySize location');
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Track this view in job analytics
        if (job.status === 'open') {
            try {
                console.log(`[JobAnalytics] Tracking view for job: "${job.title}" (ID: ${job._id})`);
                const source = req.query.source || 'direct';
                const userIp = req.ip || req.connection.remoteAddress;
                console.log(`[JobAnalytics] View source: ${source}, Viewer IP: ${userIp.substring(0, 7)}...`);

                const JobAnalytics = require('../models/JobAnalytics');
                
                // Try to find existing analytics for this job
                let analytics = await JobAnalytics.findOne({ job: job._id });
                
                if (!analytics) {
                    // Create new analytics if none exists
                    console.log(`[JobAnalytics] No analytics record found for job ID: ${job._id}, creating new record`);
                    analytics = new JobAnalytics({
                        job: job._id,
                        views: 0,
                        uniqueViews: 0,
                        applications: 0,
                        clickThroughs: 0,
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
                        dailyStats: []
                    });
                    await analytics.save();
                }

                // Update existing analytics
                console.log(`[JobAnalytics] Incrementing view count for job ID: ${job._id}`);
                analytics.views += 1;
                
                // Handle unique views
                if (!analytics.viewerIps) {
                    analytics.viewerIps = [];
                }
                
                if (!analytics.viewerIps.includes(userIp)) {
                    console.log(`[JobAnalytics] New unique viewer detected for job ID: ${job._id}`);
                    analytics.viewerIps.push(userIp);
                    analytics.uniqueViews += 1;
                }
                
                // Track view source
                if (source) {
                    if (analytics.viewSources[source] !== undefined) {
                        analytics.viewSources[source] += 1;
                    } else {
                        analytics.viewSources.other += 1;
                    }
                    console.log(`[JobAnalytics] View source "${source}" recorded for job ID: ${job._id}`);
                }
                
                // Update or create daily stats
                const today = new Date().toISOString().split('T')[0];
                const todayStats = analytics.dailyStats.find(
                    (stat) => new Date(stat.date).toISOString().split('T')[0] === today
                );
                
                if (todayStats) {
                    console.log(`[JobAnalytics] Updating existing daily stats for ${today}`);
                    todayStats.views += 1;
                } else {
                    console.log(`[JobAnalytics] Creating new daily stats entry for ${today}`);
                    analytics.dailyStats.push({
                        date: new Date(),
                        views: 1,
                        applications: 0
                    });
                }
                
                analytics.lastUpdated = new Date();
                await analytics.save();
                console.log(`[JobAnalytics] Successfully updated analytics for job ID: ${job._id}`);
                
            } catch (analyticsError) {
                // Don't let analytics error affect the job fetch
                console.error('[JobAnalytics] Error tracking job view:', analyticsError);
            }
        }

        // --- Add isBookmarked field --- 
        const jobObject = job.toObject();
        jobObject.isBookmarked = userBookmarks.has(jobObject._id.toString());
        // delete jobObject.bookmarkedBy; // Optional
        // --- End adding isBookmarked ---

        console.log(`[Job Details Fetch] Sending job data for ${req.params.id}:`, jobObject); // Log data being sent

        res.json(jobObject); // Send modified object
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ message: 'Error fetching job posting' });
    }
});

// @route   PUT /api/jobs/:id
// @desc    Update a job posting
// @access  Private (Employers only)
router.put('/:id', auth, async (req, res) => {
    const jobId = req.params.id;
    const userId = req.user.id;
    try {
        // Added log: Received request
        console.log(`[Job Update] Received PUT request for job ID: ${jobId} from user ID: ${userId}`);
        console.log(`[Job Update] Request body:`, JSON.stringify(req.body));

        // Check if user is an employer
        if (req.user.type !== 'employer') {
            console.log(`[Job Update] Access denied: User ${userId} is not an employer.`);
            return res.status(403).json({ message: 'Only employers can update jobs' });
        }

        // Added log: Finding job
        console.log(`[Job Update] Finding job with ID: ${jobId}`);
        const job = await Job.findById(jobId);
        
        if (!job) {
            console.log(`[Job Update] Job not found with ID: ${jobId}`);
            return res.status(404).json({ message: 'Job not found' });
        }
        console.log(`[Job Update] Found job titled: "${job.title}"`);

        // Check if the user is the employer who posted the job
        console.log(`[Job Update] Verifying ownership: Job Employer=${job.employer}, Requesting User=${userId}`);
        if (job.employer.toString() !== userId.toString()) {
             console.log(`[Job Update] Authorization failed: User ${userId} does not own job ${jobId}.`);
            return res.status(403).json({ message: 'Not authorized to update this job' });
        }
        console.log(`[Job Update] Ownership verified.`);

        // Update fields individually to handle nested objects properly
        const updateFields = {
            title: req.body.title,
            description: req.body.description,
            requirements: req.body.requirements,
            location: req.body.location,
            type: req.body.type,
            // Ensure salary object exists and handle optional fields
            salary: {
                min: req.body.salary?.min,
                max: req.body.salary?.max,
                currency: req.body.salary?.currency || job.salary?.currency || 'PKR' // Keep existing or default
            },
            status: req.body.status || job.status // Allow updating status if provided
            // Company field should not be updated manually
        };

        // Remove undefined fields from the update object
        Object.keys(updateFields).forEach(key => {
            if (updateFields[key] === undefined) {
                delete updateFields[key];
            }
            // Special handling for salary - remove if min/max are both undefined
            if (key === 'salary' && updateFields.salary.min === undefined && updateFields.salary.max === undefined) {
                 delete updateFields.salary;
            }
        });
        console.log(`[Job Update] Applying update fields:`, JSON.stringify(updateFields));

        // Update the job using findByIdAndUpdate for atomicity (optional but good practice)
        const updatedJob = await Job.findByIdAndUpdate(jobId, { $set: updateFields }, { new: true, runValidators: true });
        
        // Re-populate employer details if needed for response (usually not necessary for update confirmation)
        // await updatedJob.populate('employer', 'name email companyName'); 

        console.log(`[Job Update] Job ${jobId} updated successfully.`);
        res.json(updatedJob); // Return the updated job document

    } catch (error) {
        console.error(`[Job Update] Error updating job ${jobId} for user ${userId}:`, error);
        // Check for validation errors
        if (error.name === 'ValidationError') {
             console.error('[Job Update] Validation Errors:', error.errors);
            return res.status(400).json({ 
                message: 'Validation failed', 
                errors: error.errors 
            });
        }
        res.status(500).json({ 
            message: 'Error updating job posting',
            error: error.message
        });
    }
});

// @route   DELETE /api/jobs/:id
// @desc    Delete a job posting
// @access  Private (Employers only)
router.delete('/:id', auth, async (req, res) => {
    const jobId = req.params.id;
    const userId = req.user.id;
    try {
        // Added log: Received request
        console.log(`[Job Delete] Received DELETE request for job ID: ${jobId} from user ID: ${userId}`);

        // Check if user is an employer (redundant if auth middleware handles roles, but safe)
         if (req.user.type !== 'employer') {
            console.log(`[Job Delete] Access denied: User ${userId} is not an employer.`);
            return res.status(403).json({ message: 'Only employers can delete jobs' });
        }

        // Added log: Finding job
        console.log(`[Job Delete] Finding job with ID: ${jobId}`);
        const job = await Job.findById(jobId);
        
        if (!job) {
            console.log(`[Job Delete] Job not found with ID: ${jobId}`);
            return res.status(404).json({ message: 'Job not found' });
        }
        console.log(`[Job Delete] Found job titled: "${job.title}"`);

        // Check if the user is the employer who posted the job
        console.log(`[Job Delete] Verifying ownership: Job Employer=${job.employer}, Requesting User=${userId}`);
        if (job.employer.toString() !== userId.toString()) {
            console.log(`[Job Delete] Authorization failed: User ${userId} does not own job ${jobId}.`);
            return res.status(403).json({ message: 'Not authorized to delete this job' });
        }
        console.log(`[Job Delete] Ownership verified.`);

        // Added log: Deleting job
        console.log(`[Job Delete] Attempting to delete job ${jobId} from database...`);
        await Job.deleteOne({ _id: jobId });
        console.log(`[Job Delete] Job ${jobId} deleted successfully.`);

        // Added log: Sending response
        console.log(`[Job Delete] Sending success response.`);
        res.json({ message: 'Job removed' });
    } catch (error) {
         // Added log: Error during job deletion
        console.error(`[Job Delete] Error deleting job ${jobId} for user ${userId}:`, error);
        res.status(500).json({ message: 'Error deleting job posting', error: error.message });
    }
});

// @route   POST /api/jobs/:id/bookmark
// @desc    Bookmark or unbookmark a job
// @access  Private (Job Seekers only)
router.post('/:id/bookmark', auth, async (req, res) => {
    try {
        // Only job seekers can bookmark jobs
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ message: 'Only job seekers can bookmark jobs' });
        }

        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check if already bookmarked
        const bookmarkIndex = job.bookmarkedBy.indexOf(req.user._id);
        
        if (bookmarkIndex === -1) {
            // Add bookmark
            job.bookmarkedBy.push(req.user._id);
            await job.save();
            res.json({ message: 'Job bookmarked', isBookmarked: true });
        } else {
            // Remove bookmark
            job.bookmarkedBy.splice(bookmarkIndex, 1);
            await job.save();
            res.json({ message: 'Job unbookmarked', isBookmarked: false });
        }
    } catch (error) {
        console.error('Error bookmarking job:', error);
        res.status(500).json({ message: 'Error bookmarking job', error: error.message });
    }
});

// @route   POST /api/jobs/:id/track-click
// @desc    Track when a user clicks on a job listing (e.g., "Apply Now" button)
// @access  Public
router.post('/:id/track-click', async (req, res) => {
    try {
        const jobId = req.params.id;
        const source = req.body.source || 'direct';
        
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        // Track this click in job analytics
        if (job.status === 'open') {
            try {
                console.log(`[JobAnalytics] Tracking click for job ID: ${jobId}`);
                const JobAnalytics = require('../models/JobAnalytics');
                
                await JobAnalytics.findOneAndUpdate(
                    { job: jobId },
                    { 
                        $inc: { clickThroughs: 1 },
                        $set: { lastUpdated: new Date() }
                    },
                    { upsert: true }
                );
                
                console.log(`[JobAnalytics] Successfully recorded click for job ID: ${jobId}`);
                
                return res.status(200).json({ message: 'Click tracked successfully' });
            } catch (analyticsError) {
                console.error('[JobAnalytics] Error tracking job click:', analyticsError);
                return res.status(500).json({ message: 'Error tracking analytics' });
            }
        }
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error tracking job click:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 