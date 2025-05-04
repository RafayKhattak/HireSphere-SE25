const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Report = require('../models/Report');
const Job = require('../models/Job');
const User = require('../models/User');
const { check, validationResult } = require('express-validator');
const admin = require('../middleware/admin');

// @route   POST api/reports
// @desc    Create a new report
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('entityType', 'Entity type is required').isIn(['job', 'user']),
      check('entityId', 'Entity ID is required').notEmpty(),
      check('reason', 'Reason is required').isIn([
        'spam', 
        'inappropriate', 
        'misleading', 
        'fraud', 
        'scam', 
        'duplicate', 
        'other'
      ]),
      check('description', 'Description is required').notEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { entityType, entityId, reason, description } = req.body;

      // Check if entity exists
      if (entityType === 'job') {
        const job = await Job.findById(entityId);
        if (!job) {
          return res.status(404).json({ msg: 'Job not found' });
        }
      } else if (entityType === 'user') {
        const user = await User.findById(entityId);
        if (!user) {
          return res.status(404).json({ msg: 'User not found' });
        }

        // Users cannot report themselves
        if (user._id.toString() === req.user.id) {
          return res.status(400).json({ msg: 'Cannot report yourself' });
        }
      }

      // Check if report already exists
      const existingReport = await Report.findOne({
        entityType,
        entityId,
        reporter: req.user.id
      });

      if (existingReport) {
        return res.status(400).json({
          msg: 'You have already reported this entity'
        });
      }

      // Create new report
      const newReport = new Report({
        entityType,
        entityId,
        reason,
        details: description,
        reporter: req.user.id
      });

      await newReport.save();

      res.json({
        msg: 'Report submitted successfully',
        report: newReport
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/reports/me
// @desc    Get all reports submitted by current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user.id })
      .sort({ createdAt: -1 })
      .populate('entityId', 'title company name email');

    res.json(reports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/reports
// @desc    Get all reports (with filtering options)
// @access  Admin
router.get('/', [auth, admin], async (req, res) => {
  try {
    const { status, entityType, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    console.log(`[FraudManagement] Admin ${req.user.email} requesting reports list`);
    console.log(`[FraudManagement] Query parameters: ${JSON.stringify({ status, entityType, page, limit })}`);
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (entityType) query.entityType = entityType;
    
    // Get reports with populated reporter and entity data
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('reporter', 'name email role')
      .populate({
        path: 'entityId',
        select: entityType === 'Job' ? 'title company status' : 'name email role status'
      });
    
    // Get total count for pagination
    const totalReports = await Report.countDocuments(query);
    
    console.log(`[FraudManagement] Retrieved ${reports.length} reports (${totalReports} total)`);
    
    res.json({
      reports,
      pagination: {
        total: totalReports,
        page: parseInt(page),
        pages: Math.ceil(totalReports / limit)
      }
    });
  } catch (err) {
    console.error(`[FraudManagement] Error fetching reports: ${err.message}`);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/reports/statistics/summary
// @desc    Get report statistics
// @access  Admin
router.get('/statistics/summary', [auth, admin], async (req, res) => {
  try {
    // Get counts for different report statuses
    const pending = await Report.countDocuments({ status: 'pending' });
    const approved = await Report.countDocuments({ status: 'approved' });
    const rejected = await Report.countDocuments({ status: 'rejected' });
    
    // Get counts by entity type
    const jobReports = await Report.countDocuments({ entityType: 'Job' });
    const userReports = await Report.countDocuments({ entityType: 'User' });
    
    // Get counts by action taken
    const noAction = await Report.countDocuments({ actionTaken: 'none' });
    const warnings = await Report.countDocuments({ actionTaken: 'warning' });
    const disabled = await Report.countDocuments({ actionTaken: 'disabled' });
    const deleted = await Report.countDocuments({ actionTaken: 'deleted' });
    
    res.json({
      total: pending + approved + rejected,
      byStatus: { pending, approved, rejected },
      byEntityType: { job: jobReports, user: userReports },
      byAction: { none: noAction, warning: warnings, disabled, deleted }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/reports/:id
// @desc    Get report by ID
// @access  Admin
router.get('/:id', [auth, admin], async (req, res) => {
  try {
    console.log(`[FraudManagement] Admin ${req.user.email} requesting report details for ID: ${req.params.id}`);
    
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name email role')
      .populate({
        path: 'entityId'
      });
    
    if (!report) {
      console.log(`[FraudManagement] Report not found with ID: ${req.params.id}`);
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    console.log(`[FraudManagement] Successfully retrieved report: ${report.entityType} - ${report.reason}`);
    res.json(report);
  } catch (err) {
    console.error(`[FraudManagement] Error fetching report: ${err.message}`);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Report not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/reports/:id
// @desc    Update report status and take action
// @access  Admin
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const { status, adminNotes, actionTaken } = req.body;
    
    console.log(`[FraudManagement] Admin ${req.user.email} updating report ID: ${req.params.id}`);
    console.log(`[FraudManagement] Update data: status=${status}, action=${actionTaken}`);
    
    // Find report
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      console.log(`[FraudManagement] Report not found with ID: ${req.params.id}`);
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    // Update report
    if (status) report.status = status;
    if (adminNotes) report.adminNotes = adminNotes;
    if (actionTaken) report.actionTaken = actionTaken;
    
    // Take action on the entity
    if (actionTaken && actionTaken !== 'none') {
      // Get the entity
      let entity;
      if (report.entityType === 'Job') {
        entity = await Job.findById(report.entityId);
      } else if (report.entityType === 'User') {
        entity = await User.findById(report.entityId);
      }
      
      if (!entity) {
        console.log(`[FraudManagement] Entity not found: ${report.entityType} - ${report.entityId}`);
        return res.status(404).json({ msg: 'Entity not found' });
      }
      
      console.log(`[FraudManagement] Taking action '${actionTaken}' on ${report.entityType}: ${report.entityId}`);
      
      // Apply action
      switch (actionTaken) {
        case 'warning':
          // This might involve sending an email or adding a warning flag
          console.log(`[FraudManagement] Warning issued to ${report.entityType}: ${report.entityId}`);
          // Implementation depends on business requirements
          break;
        case 'disabled':
          // Disable the job or user account
          if (report.entityType === 'Job') {
            console.log(`[FraudManagement] Disabling job listing: ${entity.title}`);
            entity.status = 'closed';
          } else if (report.entityType === 'User') {
            console.log(`[FraudManagement] Disabling user account: ${entity.email}`);
            entity.status = 'disabled';
          }
          await entity.save();
          break;
        case 'deleted':
          // Delete the job or deactivate the user
          if (report.entityType === 'Job') {
            console.log(`[FraudManagement] Deleting job listing: ${entity.title} (ID: ${entity._id})`);
            await Job.findByIdAndDelete(report.entityId);
          } else if (report.entityType === 'User') {
            console.log(`[FraudManagement] Deactivating user account: ${entity.email}`);
            entity.status = 'deactivated';
            await entity.save();
          }
          break;
      }
    }
    
    // Save the report with updates
    await report.save();
    
    console.log(`[FraudManagement] Report updated successfully: ${report._id}`);
    res.json({ msg: 'Report updated successfully', report });
  } catch (err) {
    console.error(`[FraudManagement] Error updating report: ${err.message}`);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete a report
// @access  Admin
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    await report.remove();
    
    res.json({ msg: 'Report removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Report not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 