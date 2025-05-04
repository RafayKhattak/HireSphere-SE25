/**
 * Middleware for checking user roles
 */

// Check if user is an employer
const isEmployer = (req, res, next) => {
  if (req.user && req.user.type === 'employer') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Employer access only.' });
};

// Check if user is a job seeker
const isJobSeeker = (req, res, next) => {
  if (req.user && req.user.type === 'jobseeker') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Job seeker access only.' });
};

module.exports = {
  isEmployer,
  isJobSeeker
}; 