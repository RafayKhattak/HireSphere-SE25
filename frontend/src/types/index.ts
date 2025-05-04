export interface User {
    _id: string;
    id: string;
    name: string;
    email: string;
    type: 'jobseeker' | 'employer' | 'admin';
    firstName?: string;
    lastName?: string;
    companyName?: string;
    companyDescription?: string;
    companyLogo?: string;
    companyWebsite?: string;
    companySize?: string;
    industry?: string;
    foundedYear?: number;
    phone?: string;
    location?: string;
    profileImage?: string;
    socialMedia?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
    };
    createdAt: string;
    bookmarks: string[];
    // Additional fields for AI-powered features
    skills?: string[];
    preferences?: {
        jobTypes?: string[];
        locations?: string[];
        salary?: {
            min?: number;
            max?: number;
        };
        remote?: boolean;
        [key: string]: any;
    };
    experience?: Array<{
        title: string;
        company: string;
        location?: string;
        from: string;
        to?: string;
        current?: boolean;
        description?: string;
    }>;
    education?: Array<{
        degree: string;
        institution: string;
        location?: string;
        from: string;
        to?: string;
        current?: boolean;
        description?: string;
    }>;
}

export interface Job {
    _id: string;
    id: string;
    title: string;
    company: string;
    description: string;
    requirements: string;
    salary: {
        min: number;
        max: number;
        currency: string;
    };
    location: string;
    type: 'full-time' | 'part-time' | 'contract' | 'internship';
    employer: string | User;
    bookmarkedBy: string[];
    isBookmarked?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    name: string;
    type: 'jobseeker' | 'employer';
    userType: 'jobSeeker' | 'employer'; // For backward compatibility
    companyName?: string;
}

export interface JobFormData {
    title: string;
    company?: string;
    description: string;
    requirements: string;
    salary: {
        min: number;
        max: number;
        currency: string;
    };
    location: string;
    type: 'full-time' | 'part-time' | 'contract' | 'internship';
}

export interface JobApplication {
    _id: string;
    id: string;
    job: Job;
    jobSeeker: User;
    coverLetter: string;
    resume: string;
    status: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'interview';
    appliedAt: string;
    updatedAt: string;
    interviewRatings?: Array<{
        _id: string;
        rating: number;
        technicalSkills?: number;
        communication?: number;
        culturalFit?: number;
        problemSolving?: number;
        strengths: string[];
        weaknesses: string[];
        feedback: string;
        interviewer: string | User;
        createdAt: string;
    }>;
    applicationHistory?: Array<{
        status: string;
        date: string;
        note?: string;
    }>;
}

export interface SkillAssessmentQuestion {
    _id?: string;
    question: string;
    options?: string[];
    isOpenEnded: boolean;
}

export interface SkillAssessmentResponse {
    questionIndex: number;
    answer: string;
}

export interface SkillAssessment {
    _id: string;
    jobSeeker: string | User;
    skill: string;
    questions: SkillAssessmentQuestion[];
    responses: SkillAssessmentResponse[];
    score?: number;
    feedback?: string;
    status: 'pending' | 'completed' | 'evaluated';
    aiEvaluation?: {
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
        detailedAnalysis: string;
    };
    createdAt: string;
    completedAt?: string;
}

export interface JobAlert {
    _id: string;
    name: string;
    keywords: string[];
    locations: string[];
    jobTypes: string[];
    salary: {
        min: number;
        max: number;
        currency: string;
    };
    isActive: boolean;
    frequency: string;
    createdAt: string;
    lastSent: string | null;
} 