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
    phone?: string;
    location?: string;
    createdAt: string;
    bookmarks: string[];
}

export interface Job {
    _id: string;
    id: string;
    title: string;
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