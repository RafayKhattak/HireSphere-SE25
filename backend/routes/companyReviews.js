const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CompanyReview = require('../models/CompanyReview');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/genai');

// Initialize Google Gemini AI for content moderation
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * @route   GET /api/company-reviews/:companyId
 * @desc    Get all approved reviews for a company
 * @access  Public
 */
router.get('/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 10, sort = 'recent' } = req.query;
        
        // Validate company exists and is an employer
        const company = await User.findById(companyId).select('type companyName');
        if (!company || company.type !== 'employer') {
            return res.status(404).json({ error: 'Company not found' });
        }
        
        // Set up sorting options
        let sortOption = {};
        if (sort === 'recent') {
            sortOption = { createdAt: -1 };
        } else if (sort === 'highest') {
            sortOption = { rating: -1 };
        } else if (sort === 'lowest') {
            sortOption = { rating: 1 };
        }
        
        // Fetch reviews with pagination
        const reviews = await CompanyReview.find({ 
            company: companyId,
            status: 'approved'
        })
        .sort(sortOption)
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .populate('reviewer', 'name type');
        
        // Get total count for pagination
        const totalReviews = await CompanyReview.countDocuments({ 
            company: companyId,
            status: 'approved'
        });
        
        // Calculate average ratings
        const aggregateRatings = await CompanyReview.aggregate([
            { $match: { company: mongoose.Types.ObjectId(companyId), status: 'approved' } },
            { $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                workLifeBalance: { $avg: '$categories.workLifeBalance' },
                compensation: { $avg: '$categories.compensation' },
                jobSecurity: { $avg: '$categories.jobSecurity' },
                management: { $avg: '$categories.management' },
                cultureValues: { $avg: '$categories.cultureValues' },
                totalReviews: { $sum: 1 }
            }}
        ]);
        
        const ratings = aggregateRatings.length > 0 ? aggregateRatings[0] : {
            averageRating: 0,
            workLifeBalance: 0,
            compensation: 0,
            jobSecurity: 0,
            management: 0,
            cultureValues: 0,
            totalReviews: 0
        };
        
        // Process reviews to handle anonymous ones
        const processedReviews = reviews.map(review => {
            const reviewObj = review.toObject();
            
            // If anonymous, remove reviewer details
            if (reviewObj.isAnonymous) {
                reviewObj.reviewer = { name: 'Anonymous User' };
            }
            
            return reviewObj;
        });
        
        // Return response
        res.json({
            companyName: company.companyName,
            reviews: processedReviews,
            pagination: {
                total: totalReviews,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalReviews / parseInt(limit))
            },
            ratings
        });
    } catch (error) {
        console.error('Error fetching company reviews:', error);
        res.status(500).json({ error: 'Server error while fetching reviews' });
    }
});

/**
 * @route   POST /api/company-reviews/:companyId
 * @desc    Create a new company review
 * @access  Private (Job Seekers only)
 */
router.post('/:companyId', [
    auth,
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').notEmpty().trim().isLength({ max: 100 }).withMessage('Title is required and cannot exceed 100 characters'),
    body('review').notEmpty().trim().isLength({ max: 2000 }).withMessage('Review is required and cannot exceed 2000 characters'),
    body('pros').optional().trim().isLength({ max: 1000 }).withMessage('Pros cannot exceed 1000 characters'),
    body('cons').optional().trim().isLength({ max: 1000 }).withMessage('Cons cannot exceed 1000 characters'),
    body('isCurrentEmployee').isBoolean().withMessage('Current employee status must be boolean'),
    body('isAnonymous').isBoolean().withMessage('Anonymous flag must be boolean'),
    body('employmentStatus').isIn(['full-time', 'part-time', 'contract', 'internship', 'former', 'prefer-not-to-say'])
        .withMessage('Invalid employment status')
], async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        // Check if user is a job seeker
        if (req.user.type !== 'jobseeker') {
            return res.status(403).json({ error: 'Only job seekers can submit company reviews' });
        }
        
        const { companyId } = req.params;
        
        // Validate company exists and is an employer
        const company = await User.findById(companyId);
        if (!company || company.type !== 'employer') {
            return res.status(404).json({ error: 'Company not found' });
        }
        
        // Check if user has already reviewed this company
        const existingReview = await CompanyReview.findOne({
            company: companyId,
            reviewer: req.user.id
        });
        
        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this company' });
        }
        
        // Extract data from request body
        const {
            rating,
            title,
            review,
            pros,
            cons,
            position,
            isCurrentEmployee,
            employmentStatus,
            workDuration,
            isAnonymous,
            categories
        } = req.body;
        
        // Use AI to check for policy violations or inappropriate content
        let shouldModerate = true;
        let reviewStatus = 'pending';
        
        if (shouldModerate) {
            try {
                const prompt = `
                Please review this company review for any inappropriate content, profanity, or policy violations:
                
                Title: ${title}
                Review: ${review}
                Pros: ${pros || ''}
                Cons: ${cons || ''}
                
                If the content contains any of the following, please respond "reject": 
                - Profanity or offensive language
                - Personal attacks or naming specific employees
                - Discriminatory content based on race, gender, etc.
                - Confidential company information
                - Spam or promotional content
                
                If the content appears to be appropriate, respond "approve".
                `;
                
                const result = await model.generateContent(prompt);
                const responseText = result.response.text().toLowerCase().trim();
                
                if (responseText.includes('reject')) {
                    reviewStatus = 'rejected';
                } else if (responseText.includes('approve')) {
                    reviewStatus = 'approved';
                }
            } catch (error) {
                console.error('Error in content moderation:', error);
                // Keep as pending if moderation fails
            }
        }
        
        // Create new review
        const newReview = new CompanyReview({
            company: companyId,
            reviewer: req.user.id,
            rating,
            title,
            review,
            pros,
            cons,
            position,
            isCurrentEmployee,
            employmentStatus,
            workDuration,
            isAnonymous,
            categories,
            status: reviewStatus
        });
        
        await newReview.save();
        
        res.status(201).json({
            message: reviewStatus === 'approved' 
                ? 'Review submitted and published' 
                : 'Review submitted and pending approval',
            review: newReview
        });
    } catch (error) {
        console.error('Error creating company review:', error);
        res.status(500).json({ error: 'Server error while creating review' });
    }
});

/**
 * @route   PUT /api/company-reviews/:reviewId
 * @desc    Update a company review
 * @access  Private (Owner of review only)
 */
router.put('/:reviewId', [
    auth,
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').notEmpty().trim().isLength({ max: 100 }).withMessage('Title is required and cannot exceed 100 characters'),
    body('review').notEmpty().trim().isLength({ max: 2000 }).withMessage('Review is required and cannot exceed 2000 characters')
], async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { reviewId } = req.params;
        
        // Find review
        const review = await CompanyReview.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        // Check if user is the owner
        if (review.reviewer.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this review' });
        }
        
        // Extract fields from request
        const {
            rating,
            title,
            review: reviewText,
            pros,
            cons,
            isCurrentEmployee,
            employmentStatus,
            isAnonymous,
            categories
        } = req.body;
        
        // Update review fields
        review.rating = rating;
        review.title = title;
        review.review = reviewText;
        if (pros) review.pros = pros;
        if (cons) review.cons = cons;
        if (isCurrentEmployee !== undefined) review.isCurrentEmployee = isCurrentEmployee;
        if (employmentStatus) review.employmentStatus = employmentStatus;
        if (isAnonymous !== undefined) review.isAnonymous = isAnonymous;
        if (categories) review.categories = categories;
        
        // Set back to pending for re-moderation
        review.status = 'pending';
        
        await review.save();
        
        res.json({ message: 'Review updated successfully', review });
    } catch (error) {
        console.error('Error updating company review:', error);
        res.status(500).json({ error: 'Server error while updating review' });
    }
});

/**
 * @route   DELETE /api/company-reviews/:reviewId
 * @desc    Delete a company review
 * @access  Private (Owner of review only)
 */
router.delete('/:reviewId', auth, async (req, res) => {
    try {
        const { reviewId } = req.params;
        
        // Find review
        const review = await CompanyReview.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        // Check if user is the owner
        if (review.reviewer.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this review' });
        }
        
        await review.remove();
        
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting company review:', error);
        res.status(500).json({ error: 'Server error while deleting review' });
    }
});

/**
 * @route   GET /api/company-reviews/user/my-reviews
 * @desc    Get all reviews submitted by the current user
 * @access  Private
 */
router.get('/user/my-reviews', auth, async (req, res) => {
    try {
        const reviews = await CompanyReview.find({ reviewer: req.user.id })
            .populate('company', 'companyName');
        
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ error: 'Server error while fetching reviews' });
    }
});

module.exports = router; 