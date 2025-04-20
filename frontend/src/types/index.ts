export interface User {
    _id: string;
    id: string;
    name: string;
    email: string;
    type: 'jobseeker' | 'employer';
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
    status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
    appliedAt: string;
    updatedAt: string;
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