import axios from 'axios';
import { AuthResponse, LoginCredentials, RegisterData, Job, JobFormData, JobApplication } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        
        // Don't override Content-Type if it's already set (for file uploads)
        if (!config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Auth services
export const authService = {
    register: async (data: RegisterData): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/register', data);
        localStorage.setItem('token', response.data.token);
        return response.data;
    },

    login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/login', credentials);
        localStorage.setItem('token', response.data.token);
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
    },

    resetPassword: async (token: string, password: string): Promise<void> => {
        const response = await api.post(`/auth/reset-password/${token}`, { password });
        return response.data;
    },

    forgotPassword: async (email: string): Promise<void> => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    }
};

// Job services
export const jobService = {
    getAllJobs: async (filters?: {
        location?: string;
        minSalary?: number;
        maxSalary?: number;
        jobType?: string;
        keywords?: string;
        page?: number;
        limit?: number;
    }): Promise<{jobs: Job[], pagination: any}> => {
        let url = '/jobs';
        
        // Add query parameters if filters are provided
        if (filters) {
            const params = new URLSearchParams();
            if (filters.location) params.append('location', filters.location);
            if (filters.minSalary) params.append('minSalary', filters.minSalary.toString());
            if (filters.maxSalary) params.append('maxSalary', filters.maxSalary.toString());
            if (filters.jobType) params.append('jobType', filters.jobType);
            if (filters.keywords) params.append('keywords', filters.keywords);
            if (filters.page) params.append('page', filters.page.toString());
            if (filters.limit) params.append('limit', filters.limit.toString());
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }
        
        const response = await api.get(url);
        return response.data;
    },

    getJobById: async (id: string): Promise<Job> => {
        const response = await api.get<Job>(`/jobs/${id}`);
        return response.data;
    },

    createJob: async (data: JobFormData): Promise<Job> => {
        // Include company field but it will be overridden by backend if needed
        const postData = {
            title: data.title,
            company: data.company, // Include company field 
            description: data.description,
            requirements: data.requirements,
            salary: data.salary,
            location: data.location,
            type: data.type
        };
        const response = await api.post<Job>('/jobs', postData);
        return response.data;
    },

    updateJob: async (id: string, data: Partial<JobFormData>): Promise<Job> => {
        // Company field is excluded as it's managed by the backend
        const response = await api.put<Job>(`/jobs/${id}`, {
            title: data.title,
            description: data.description,
            requirements: data.requirements,
            salary: data.salary,
            location: data.location,
            type: data.type
        });
        return response.data;
    },

    deleteJob: async (id: string): Promise<{ message: string }> => {
        const response = await api.delete(`/jobs/${id}`);
        return response.data;
    },
    
    trackJobClick: async (id: string, source?: string): Promise<void> => {
        try {
            await api.post(`/jobs/${id}/track-click`, { source });
        } catch (error) {
            // Silent fail - don't disrupt user experience if analytics fails
            console.error('Failed to track job click:', error);
        }
    },
    
    getJobAnalytics: async (id: string): Promise<any> => {
        const response = await api.get(`/employer/jobs/${id}/analytics`);
        return response.data;
    }
};

export const applicationService = {
    applyForJob: async (jobId: string, applicationData: { coverLetter: string; resume: string }) => {
        const response = await api.post(`/applications/${jobId}`, applicationData);
        return response.data;
    },
    getJobApplications: async (jobId: string) => {
        const response = await api.get(`/applications/job/${jobId}`);
        return response.data;
    },
    getMyApplications: async () => {
        const response = await api.get('/applications/jobseeker');
        return response.data;
    },
    updateApplicationStatus: async (applicationId: string, status: string) => {
        const response = await api.patch(`/applications/${applicationId}/status`, { status });
        return response.data;
    },
    countJobApplications: async (jobId: string) => {
        const response = await api.get(`/applications/job/${jobId}/count`);
        return response.data.count;
    },
    screenCandidates: async (jobId: string, queryParams = '') => {
        const response = await api.post(`/screening/jobs/${jobId}/candidates${queryParams}`);
        return response.data;
    },
    getApplicationAnalysis: async (jobId: string, applicationId: string) => {
        const response = await api.get(`/screening/jobs/${jobId}/applications/${applicationId}`);
        return response.data;
    },
    rateInterview: async (applicationId: string, ratingData: {
        rating: number;
        technicalSkills?: number;
        communication?: number;
        culturalFit?: number;
        problemSolving?: number;
        strengths?: string[];
        weaknesses?: string[];
        feedback: string;
    }) => {
        const response = await api.post(`/applications/${applicationId}/rate-interview`, ratingData);
        return response.data;
    },
    getInterviewRatings: async (applicationId: string) => {
        const response = await api.get(`/applications/${applicationId}/interview-ratings`);
        return response.data;
    }
};

export const bookmarkService = {
    addBookmark: async (jobId: string) => {
        const response = await api.post(`/bookmarks/${jobId}`);
        return response.data;
    },
    removeBookmark: async (jobId: string) => {
        const response = await api.delete(`/bookmarks/${jobId}`);
        return response.data;
    },
    getBookmarks: async () => {
        const response = await api.get('/bookmarks');
        return response.data;
    }
};

// User profile services
export const userService = {
    getProfile: async () => {
        const response = await api.get('/jobseeker/profile');
        return response.data;
    },
    
    updateProfile: async (profileData: any) => {
        const response = await api.put('/jobseeker/profile', profileData);
        return response.data;
    },
    
    uploadResume: async (file: File, useGemini: boolean = true): Promise<any> => {
        const formData = new FormData();
        formData.append('resume', file);
        
        // Add option to control Gemini API usage
        if (useGemini !== undefined) {
            formData.append('useGemini', useGemini.toString());
        }
        
        // We need to override the Content-Type header for file uploads
        const response = await api.post('/jobseeker/parse-resume', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        return response.data;
    }
};

// Employer services
export const employerService = {
    getProfile: async () => {
        const response = await api.get('/employer/profile');
        return response.data;
    },
    
    updateProfile: async (profileData: any) => {
        const response = await api.put('/employer/profile', profileData);
        return response.data;
    },
    
    // New method for candidate search
    searchCandidates: async (params: {
        skills?: string;
        experience?: number;
        location?: string;
        useAI?: boolean;
    }) => {
        // Convert params object to query string
        const queryParams = new URLSearchParams();
        if (params.skills) queryParams.append('skills', params.skills);
        if (params.experience) queryParams.append('experience', params.experience.toString());
        if (params.location) queryParams.append('location', params.location);
        if (params.useAI !== undefined) queryParams.append('useAI', params.useAI.toString());
        
        const response = await api.get(`/employer/search/candidates?${queryParams.toString()}`);
        return response.data;
    }
};

// Skill Assessment services
export const assessmentService = {
    // Generate a new skill assessment
    generateAssessment: async (data: { 
        skill: string; 
        questionCount?: number; 
        includeOpenEnded?: boolean; 
        aiProvider?: string; 
    }) => {
        const response = await api.post('/assessments/generate', data);
        return response.data;
    },
    
    // Get all assessments for the current user
    getMyAssessments: async () => {
        const response = await api.get('/assessments');
        return response.data;
    },
    
    // Get a specific assessment
    getAssessment: async (id: string) => {
        const response = await api.get(`/assessments/${id}`);
        return response.data;
    },
    
    // Submit answers for an assessment
    submitAssessment: async (id: string, data: { 
        responses: Array<{ questionIndex: number; answer: string }>;
        aiProvider?: string;
    }) => {
        const response = await api.post(`/assessments/${id}/submit`, data);
        return response.data;
    }
};

// Interview services
export const interviewService = {
    scheduleInterview: async (interviewData: {
        jobApplicationId: string;
        scheduledDateTime: string;
        duration: number;
        location: 'onsite' | 'remote' | 'phone';
        meetingLink?: string;
        address?: string;
        interviewType: 'screening' | 'technical' | 'behavioral' | 'final';
        description: string;
    }) => {
        const response = await api.post('/interviews/schedule', interviewData);
        return response.data;
    },
    
    getEmployerInterviews: async () => {
        const response = await api.get('/interviews/employer');
        return response.data;
    },
    
    getJobSeekerInterviews: async () => {
        const response = await api.get('/interviews/jobseeker');
        return response.data;
    },
    
    getInterviewById: async (interviewId: string) => {
        const response = await api.get(`/interviews/${interviewId}`);
        return response.data;
    },
    
    updateInterview: async (interviewId: string, updateData: any) => {
        const response = await api.put(`/interviews/${interviewId}`, updateData);
        return response.data;
    },
    
    cancelInterview: async (interviewId: string) => {
        const response = await api.delete(`/interviews/${interviewId}`);
        return response.data;
    },
    
    generateGoogleMeetLink: async (data: {
        scheduledDateTime: string;
        duration: number;
        interviewType: string;
    }) => {
        const response = await api.post('/interviews/generate-meet-link', data);
        return response.data;
    }
};

export default api; 