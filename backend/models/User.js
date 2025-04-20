const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['jobseeker', 'employer'],
        required: true
    },
    // Job Seeker specific fields
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    // Added fields for job seeker for AI recommendation
    skills: [{
        type: String,
        trim: true
    }],
    experience: [{
        title: String,
        company: String,
        location: String,
        from: Date,
        to: Date,
        current: Boolean,
        description: String
    }],
    education: [{
        institution: String,
        degree: String,
        fieldOfStudy: String,
        from: Date,
        to: Date,
        current: Boolean
    }],
    preferredJobTypes: [{
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship']
    }],
    preferredLocations: [{
        type: String,
        trim: true
    }],
    // Employer specific fields
    companyName: {
        type: String,
        trim: true,
        required: function() {
            return this.type === 'employer';
        }
    },
    companyDescription: {
        type: String,
        trim: true
    },
    // Image fields with direct storage in MongoDB
    companyLogo: {
        type: String // URL for backward compatibility
    },
    companyLogoData: {
        data: Buffer,
        contentType: String
    },
    profileImage: {
        type: String // URL for backward compatibility
    },
    profileImageData: {
        data: Buffer,
        contentType: String
    },
    // Added fields for employer company profile
    companyWebsite: {
        type: String,
        trim: true
    },
    companySize: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    industry: {
        type: String,
        trim: true
    },
    foundedYear: {
        type: Number
    },
    socialMedia: {
        linkedin: String,
        twitter: String,
        facebook: String
    },
    // Common fields
    phone: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job'
    }],
    // For job alerts
    alertSettings: {
        enabled: {
            type: Boolean,
            default: false
        },
        email: {
            type: Boolean,
            default: true
        },
        inApp: {
            type: Boolean,
            default: true
        }
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

module.exports = mongoose.model('User', userSchema); 