const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

/**
 * Middleware to verify that a user has admin role
 */
module.exports = function(req, res, next) {
  // Check if user exists (should be added by auth middleware)
  if (!req.user) {
    return res.status(401).json({ msg: 'Authentication required' });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Admin access required' });
  }

  next();
}; 