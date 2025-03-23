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
        config.headers['Content-Type'] = 'application/json';
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
    getAllJobs: async (): Promise<Job[]> => {
        const response = await api.get<Job[]>('/jobs');
        return response.data;
    },

    getJobById: async (id: string): Promise<Job> => {
        const response = await api.get<Job>(`/jobs/${id}`);
        return response.data;
    },

    createJob: async (data: JobFormData): Promise<Job> => {
        const response = await api.post<Job>('/jobs', data);
        return response.data;
    },

    updateJob: async (id: string, data: Partial<JobFormData>): Promise<Job> => {
        const response = await api.put<Job>(`/jobs/${id}`, data);
        return response.data;
    },

    deleteJob: async (id: string): Promise<{ message: string }> => {
        const response = await api.delete(`/jobs/${id}`);
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

export default api; 