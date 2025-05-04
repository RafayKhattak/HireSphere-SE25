const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReportSchema = new Schema({
  reporter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityType: {
    type: String,
    enum: ['job', 'user', 'Job', 'User'],
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  reason: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'disabled', 'deleted'],
    default: 'none'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Set entityType to proper model name for refPath
ReportSchema.pre('save', function(next) {
  if (this.entityType === 'job') {
    this.entityType = 'Job';
  } else if (this.entityType === 'user') {
    this.entityType = 'User';
  }
  this.updatedAt = Date.now();
  next();
});

// Create compound index for reporter and entityId to prevent duplicate reports
ReportSchema.index({ reporter: 1, entityId: 1 }, { unique: true });

module.exports = mongoose.model('Report', ReportSchema); 