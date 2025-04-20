const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Report = require('../models/Report');
const User = require('../models/User');
const Job = require('../models/Job');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Admin middleware
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// All routes require both auth and admin middleware
router.use([auth, admin]);

// @route   GET api/admin/reports
// @desc    Get all reports with pagination
// @access  Private/Admin
router.get('/reports', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || 'pending';
    const entityType = req.query.entityType || null;
    
    const skip = (page - 1) * limit;
    
    const filter = { status };
    if (entityType) filter.entityType = entityType;
    
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reportedBy', 'name email')
      .populate('reviewedBy', 'name email');
    
    const total = await Report.countDocuments(filter);
    
    res.json({
      reports,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: page < Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/admin/reports/:id
// @desc    Get a specific report with related entity details
// @access  Private/Admin
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reportedBy', 'name email')
      .populate('reviewedBy', 'name email');
    
    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }

    // Get details of the reported entity
    let entityDetails = null;
    if (report.entityType === 'job') {
      entityDetails = await Job.findById(report.entityId)
        .populate('employer', 'name email companyName');
    } else if (report.entityType === 'user') {
      entityDetails = await User.findById(report.entityId)
        .select('-password');
    }

    res.json({
      report,
      entityDetails
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Report not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/admin/reports/:id
// @desc    Update a report status and take action
// @access  Private/Admin
router.put('/reports/:id', async (req, res) => {
  try {
    const { status, action, adminNotes } = req.body;
    
    if (!['pending', 'rejected', 'resolved'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    if (action && !['warning', 'disable', 'delete', 'none'].includes(action)) {
      return res.status(400).json({ msg: 'Invalid action value' });
    }
    
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    // Only update if status is changing or we're adding notes
    if (report.status === status && !adminNotes) {
      return res.status(400).json({ msg: 'No changes to make' });
    }
    
    // Update the report
    report.status = status;
    if (action) report.action = action;
    if (adminNotes) report.adminNotes = adminNotes;
    report.reviewedBy = req.user.id;
    report.reviewedAt = Date.now();
    
    // Take action on the reported entity if needed
    if (status === 'resolved' && action !== 'none') {
      if (report.entityType === 'job') {
        const job = await Job.findById(report.entityId);
        if (job) {
          if (action === 'warning') {
            // Send warning to employer (in real implementation)
            console.log(`Warning sent for job ${job._id}`);
          } else if (action === 'disable') {
            job.status = 'closed';
            await job.save();
          } else if (action === 'delete') {
            await Job.findByIdAndDelete(job._id);
          }
        }
      } else if (report.entityType === 'user') {
        const user = await User.findById(report.entityId);
        if (user) {
          if (action === 'warning') {
            // Send warning to user (in real implementation)
            console.log(`Warning sent to user ${user._id}`);
          } else if (action === 'disable') {
            user.status = 'disabled';
            await user.save();
          } else if (action === 'delete') {
            // In a real app, you might want to soft-delete instead
            await User.findByIdAndDelete(user._id);
          }
        }
      }
    }
    
    await report.save();
    
    res.json({
      msg: `Report marked as ${status}${action && action !== 'none' ? ` with action: ${action}` : ''}`,
      report
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Report not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/admin/dashboard
// @desc    Get report statistics for admin dashboard
// @access  Private/Admin
router.get('/dashboard', async (req, res) => {
  try {
    // Get counts of reports by status
    const [
      totalReports,
      pendingReports,
      resolvedReports,
      rejectedReports,
      jobReports,
      userReports,
      recentReports
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'resolved' }),
      Report.countDocuments({ status: 'rejected' }),
      Report.countDocuments({ entityType: 'job' }),
      Report.countDocuments({ entityType: 'user' }),
      Report.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('reportedBy', 'name')
    ]);

    // Get most reported jobs & users (top 5 each)
    const topReportedJobs = await Report.aggregate([
      { $match: { entityType: 'job' } },
      { $group: { _id: '$entityId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topReportedUsers = await Report.aggregate([
      { $match: { entityType: 'user' } },
      { $group: { _id: '$entityId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      counts: {
        total: totalReports,
        pending: pendingReports,
        resolved: resolvedReports,
        rejected: rejectedReports,
        jobs: jobReports,
        users: userReports
      },
      recentReports,
      topReported: {
        jobs: topReportedJobs,
        users: topReportedUsers
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Analyze report with AI
router.post('/reports/:id/analyze', [auth, admin], async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    let entityData = {};
    let prompt = '';
    
    // Get entity data
    if (report.entityType === 'job') {
      const job = await Job.findById(report.entityId)
        .populate('employer', 'name email company')
        .lean();
      
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      entityData = job;
      prompt = `Analyze this job posting for potential fraud or violations:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Requirements: ${job.requirements}
Salary: ${job.salary}

Report reason: ${report.reason}
Description: ${report.description}

Please determine if this job posting appears legitimate or potentially fraudulent. Consider:
1. Any red flags in the job description or requirements
2. Whether salary information seems realistic
3. Whether the job post contains unreasonable requirements
4. Signs of scams like requesting money or personal information upfront

Provide a score from 1-10 (1 = definitely legitimate, 10 = definitely fraudulent) and detailed reasoning.`;
    } else if (report.entityType === 'user') {
      const user = await User.findById(report.entityId).lean();
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      entityData = user;
      prompt = `Analyze this user account for potential fraud or violations:
Name: ${user.name}
Email: ${user.email}
Role: ${user.role}
Account created: ${user.createdAt}

Report reason: ${report.reason}
Description: ${report.description}

Please determine if this user account appears legitimate or potentially fraudulent. Consider:
1. Any red flags in the user's details
2. Whether the user's activity pattern seems suspicious
3. The nature of the reports against this user
4. Patterns that might indicate fake accounts or misrepresentation

Provide a score from 1-10 (1 = definitely legitimate, 10 = definitely fraudulent) and detailed reasoning.`;
    }
    
    // Generate analysis
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    res.json({
      report,
      entityData,
      analysis: text
    });
  } catch (err) {
    console.error('Error analyzing report with AI:', err);
    res.status(500).json({ 
      message: 'Error analyzing report',
      error: err.message
    });
  }
});

module.exports = router; 