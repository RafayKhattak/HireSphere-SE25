const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify that a user has admin role
 */
module.exports = function(req, res, next) {
  // Check if user exists (should be added by auth middleware)
  if (!req.user) {
    return res.status(401).json({ msg: 'Authentication required' });
  }

  // Check if user has admin type
  if (req.user.type !== 'admin') {
    return res.status(403).json({ msg: 'Admin access required' });
  }

  next();
}; 