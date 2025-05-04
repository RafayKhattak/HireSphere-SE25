import axios from 'axios';
import { AuthResponse, RegisterData, Job, JobFormData } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
axiosInstance.interceptors.request.use((config) => {
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
    login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
        const response = await axiosInstance.post<AuthResponse>('/auth/login', credentials);
        localStorage.setItem('token', response.data.token);
        return response.data;
    },
    
    register: async (data: RegisterData): Promise<AuthResponse> => {
        const response = await axiosInstance.post<AuthResponse>('/auth/register', data);
        localStorage.setItem('token', response.data.token);
        return response.data;
    },
    
    logout: () => {
        localStorage.removeItem('token');
    },
    
    forgotPassword: async (email: string): Promise<void> => {
        const response = await axiosInstance.post('/auth/forgot-password', { email });
        return response.data;
    },
    
    resetPassword: async (token: string, password: string): Promise<void> => {
        const response = await axiosInstance.post(`/auth/reset-password/${token}`, { password });
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
        
        const response = await axiosInstance.get(url);
        return response.data;
    },
    
    getJobById: async (id: string): Promise<Job> => {
        const response = await axiosInstance.get<Job>(`/jobs/${id}`);
        return response.data;
    },
    
    createJob: async (data: JobFormData): Promise<Job> => {
        const response = await axiosInstance.post<Job>('/jobs', data);
        return response.data;
    },
    
    updateJob: async (id: string, data: Partial<JobFormData>): Promise<Job> => {
        const response = await axiosInstance.put<Job>(`/jobs/${id}`, data);
        return response.data;
    },
    
    deleteJob: async (id: string): Promise<{ message: string }> => {
        const response = await axiosInstance.delete(`/jobs/${id}`);
        return response.data;
    },
    
    trackJobClick: async (id: string, source?: string): Promise<void> => {
        try {
            await axiosInstance.post(`/jobs/${id}/track-click`, { source });
        } catch (error) {
            // Silent fail - don't disrupt user experience if analytics fails
            console.error('Failed to track job click:', error);
        }
    },
    
    getJobAnalytics: async (id: string): Promise<any> => {
        console.log(`[JobAnalytics] Requesting analytics data for job ID: ${id}`);
        try {
            const startTime = performance.now();
            const response = await axiosInstance.get(`/employer/jobs/${id}/analytics`);
            const endTime = performance.now();
            
            console.log(`[JobAnalytics] Successfully retrieved analytics in ${Math.round(endTime - startTime)}ms`);
            // Log some metrics if available
            if (response.data) {
                console.log(`[JobAnalytics] Summary metrics - Views: ${response.data.views || 0}, Applications: ${response.data.applications || 0}, CTR: ${
                    response.data.views ? ((response.data.clickThroughs || 0) / response.data.views * 100).toFixed(1) : 0
                }%`);
            }
            
            return response.data;
        } catch (error: any) {
            console.error(`[JobAnalytics] Error retrieving analytics for job ID ${id}:`, error);
            console.error(`[JobAnalytics] Error details:`, error.response?.data || error.message);
            throw error;
        }
    }
};

export const applicationService = {
    applyForJob: async (jobId: string, applicationData: { coverLetter: string; resume: string }) => {
        const response = await axiosInstance.post(`/applications/${jobId}`, applicationData);
        return response.data;
    },
    getJobApplications: async (jobId: string) => {
        const response = await axiosInstance.get(`/applications/job/${jobId}`);
        return response.data;
    },
    getMyApplications: async () => {
        const response = await axiosInstance.get('/applications/jobseeker');
        return response.data;
    },
    updateApplicationStatus: async (applicationId: string, status: string) => {
        const response = await axiosInstance.patch(`/applications/${applicationId}/status`, { status });
        return response.data;
    },
    countJobApplications: async (jobId: string) => {
        const response = await axiosInstance.get(`/applications/job/${jobId}/count`);
        return response.data.count;
    },
    screenCandidates: async (jobId: string, queryParams = '') => {
        console.log(`[CandidateRanking] Calling screenCandidates for job ID: ${jobId}, queryParams: ${queryParams}`);
        try {
            const startTime = performance.now();
            const response = await axiosInstance.post(`/screening/analyze/${jobId}${queryParams}`);
            const endTime = performance.now();
            
            console.log(`[CandidateRanking] Received response in ${Math.round(endTime - startTime)}ms`);
            console.log(`[CandidateRanking] Candidates received: ${response.data.candidates.length}`);
            
            // Log score distribution
            if (response.data.candidates.length > 0) {
                const scores = response.data.candidates.map((c: any) => c.matchScore);
                const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
                const maxScore = Math.max(...scores);
                const minScore = Math.min(...scores);
                
                console.log(`[CandidateRanking] Score statistics - Avg: ${avgScore.toFixed(1)}%, Min: ${minScore}%, Max: ${maxScore}%`);
                console.log(`[CandidateRanking] Score distribution:
                    - High (70%+): ${scores.filter((s: number) => s >= 70).length}
                    - Medium (50-69%): ${scores.filter((s: number) => s >= 50 && s < 70).length}
                    - Low (<50%): ${scores.filter((s: number) => s < 50).length}`);
            }
            
            return response.data;
        } catch (error: any) {
            console.error(`[CandidateRanking] Error in screenCandidates:`, error);
            console.error(`[CandidateRanking] Error details:`, error.response?.data || error.message);
            throw error;
        }
    },
    getApplicationAnalysis: async (jobId: string, applicationId: string) => {
        console.log(`[CandidateRanking] Getting detailed analysis for application ID: ${applicationId}, job ID: ${jobId}`);
        try {
            const response = await axiosInstance.get(`/screening/jobs/${jobId}/applications/${applicationId}`);
            console.log(`[CandidateRanking] Analysis data received for candidate`);
            return response.data;
        } catch (error: any) {
            console.error(`[CandidateRanking] Error getting application analysis:`, error);
            throw error;
        }
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
        console.log(`[CandidateRating] Rating candidate for application ID: ${applicationId}`);
        console.log(`[CandidateRating] Rating data: Overall: ${ratingData.rating}/5, Technical: ${ratingData.technicalSkills}/5, Communication: ${ratingData.communication}/5`);
        
        try {
            const response = await axiosInstance.post(`/applications/${applicationId}/rate-interview`, ratingData);
            console.log(`[CandidateRating] Successfully rated candidate for application ID: ${applicationId}`);
            return response.data;
        } catch (error: any) {
            console.error(`[CandidateRating] Error rating candidate:`, error.response?.data || error.message);
            throw error;
        }
    },
    getInterviewRatings: async (applicationId: string) => {
        console.log(`[CandidateRating] Fetching ratings for application ID: ${applicationId}`);
        
        try {
            const response = await axiosInstance.get(`/applications/${applicationId}/interview-ratings`);
            console.log(`[CandidateRating] Received ${response.data.length || 0} ratings for application ID: ${applicationId}`);
            return response.data;
        } catch (error: any) {
            console.error(`[CandidateRating] Error fetching ratings:`, error.response?.data || error.message);
            throw error;
        }
    }
};

export const bookmarkService = {
    addBookmark: async (jobId: string) => {
        console.log(`[bookmarkService] addBookmark called for job ID: ${jobId}`);
        try {
            const response = await axiosInstance.post(`/bookmarks/${jobId}`);
            console.log(`[bookmarkService] addBookmark response for ${jobId}:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`[bookmarkService] addBookmark error for ${jobId}:`, error);
            throw error;
        }
    },
    removeBookmark: async (jobId: string) => {
        console.log(`[bookmarkService] removeBookmark called for job ID: ${jobId}`);
        try {
            const response = await axiosInstance.delete(`/bookmarks/${jobId}`);
            console.log(`[bookmarkService] removeBookmark response for ${jobId}:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`[bookmarkService] removeBookmark error for ${jobId}:`, error);
            throw error;
        }
    },
    getBookmarks: async () => {
        console.log(`[bookmarkService] getBookmarks called`);
        try {
            const response = await axiosInstance.get('/bookmarks');
            console.log(`[bookmarkService] getBookmarks response count:`, response.data?.length);
            return response.data;
        } catch (error) {
            console.error(`[bookmarkService] getBookmarks error:`, error);
            throw error;
        }
    }
};

// User profile services
export const userService = {
    getProfile: async () => {
        const response = await axiosInstance.get('/user/profile');
        return response.data;
    },
    
    updateProfile: async (profileData: any) => {
        const response = await axiosInstance.put('/user/profile', profileData);
        return response.data;
    },
    
    getUserById: async (userId: string) => {
        const response = await axiosInstance.get(`/users/${userId}`);
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
        const response = await axiosInstance.post('/jobseeker/parse-resume', formData, {
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
        const response = await axiosInstance.get('/employer/profile');
        return response.data;
    },
    
    updateProfile: async (profileData: any) => {
        const response = await axiosInstance.put('/employer/profile', profileData);
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
        
        const response = await axiosInstance.get(`/employer/search/candidates?${queryParams.toString()}`);
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
        const response = await axiosInstance.post('/assessments/generate', data);
        return response.data;
    },
    
    // Get all assessments for the current user
    getMyAssessments: async () => {
        const response = await axiosInstance.get('/assessments');
        return response.data;
    },
    
    // Get a specific assessment
    getAssessment: async (id: string) => {
        const response = await axiosInstance.get(`/assessments/${id}`);
        return response.data;
    },
    
    // Submit answers for an assessment
    submitAssessment: async (id: string, data: { 
        responses: Array<{ questionIndex: number; answer: string }>;
        aiProvider?: string;
    }) => {
        const response = await axiosInstance.post(`/assessments/${id}/submit`, data);
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
        console.log(`[Interview] Scheduling interview for application ID: ${interviewData.jobApplicationId}`);
        console.log(`[Interview] Details: ${interviewData.interviewType} interview, ${interviewData.location} location, ${new Date(interviewData.scheduledDateTime).toLocaleString()}`);
        
        try {
            const response = await axiosInstance.post('/interviews/schedule', interviewData);
            console.log(`[Interview] Successfully scheduled interview, ID: ${response.data._id || 'N/A'}`);
            return response.data;
        } catch (error: any) {
            console.error(`[Interview] Error scheduling interview:`, error.response?.data || error.message);
            throw error;
        }
    },
    
    getEmployerInterviews: async () => {
        console.log(`[Interview] Fetching all interviews for employer`);
        try {
            const response = await axiosInstance.get('/interviews/employer');
            console.log(`[Interview] Retrieved ${response.data.length} employer interviews`);
            return response.data;
        } catch (error: any) {
            console.error(`[Interview] Error fetching employer interviews:`, error.response?.data || error.message);
            throw error;
        }
    },
    
    getJobSeekerInterviews: async () => {
        console.log(`[Interview] Fetching all interviews for job seeker`);
        try {
            const response = await axiosInstance.get('/interviews/jobseeker');
            console.log(`[Interview] Retrieved ${response.data.length} job seeker interviews`);
            return response.data;
        } catch (error: any) {
            console.error(`[Interview] Error fetching job seeker interviews:`, error.response?.data || error.message);
            throw error;
        }
    },
    
    getInterviewById: async (interviewId: string) => {
        console.log(`[Interview] Fetching interview details for ID: ${interviewId}`);
        try {
            const response = await axiosInstance.get(`/interviews/${interviewId}`);
            console.log(`[Interview] Successfully retrieved interview details`);
            return response.data;
        } catch (error: any) {
            console.error(`[Interview] Error fetching interview:`, error.response?.data || error.message);
            throw error;
        }
    },
    
    updateInterview: async (interviewId: string, updateData: any) => {
        console.log(`[Interview] Updating interview ID: ${interviewId}`);
        console.log(`[Interview] Update data:`, updateData);
        try {
            const response = await axiosInstance.patch(`/interviews/${interviewId}`, updateData);
            console.log(`[Interview] Successfully updated interview`);
            return response.data;
        } catch (error: any) {
            console.error(`[Interview] Error updating interview:`, error.response?.data || error.message);
            throw error;
        }
    },
    
    cancelInterview: async (interviewId: string) => {
        console.log(`[Interview] Cancelling interview ID: ${interviewId}`);
        try {
            const response = await axiosInstance.delete(`/interviews/${interviewId}`);
            console.log(`[Interview] Successfully cancelled interview`);
            return response.data;
        } catch (error: any) {
            console.error(`[Interview] Error cancelling interview:`, error.response?.data || error.message);
            throw error;
        }
    },
    
    generateGoogleMeetLink: async (data: {
        scheduledDateTime: string;
        duration: number;
        interviewType: string;
    }) => {
        console.log(`[Interview] Generating Google Meet link for ${data.interviewType} interview`);
        try {
            const response = await axiosInstance.post('/interviews/generate-meet-link', data);
            console.log(`[Interview] Successfully generated Meet link: ${response.data.meetingLink}`);
            return response.data;
        } catch (error: any) {
            console.error(`[Interview] Error generating Meet link:`, error.response?.data || error.message);
            throw error;
        }
    }
};

// Recommendation service
export const recommendationService = {
    getJobRecommendations: async () => {
        const response = await axiosInstance.get('/recommendations/jobs');
        return response.data;
    }
};

// Message service (NEW)
export const messageService = {
    getMessages: async (conversationId: string) => {
        console.log(`[messageService] getMessages called for conversationId: ${conversationId}`);
        try {
            const response = await axiosInstance.get(`/messages/${conversationId}`);
            console.log(`[messageService] getMessages response count:`, response.data?.length);
            return response.data;
        } catch (error) {
            console.error(`[messageService] getMessages error for ${conversationId}:`, error);
            throw error;
        }
    },
    sendMessage: async (messageData: { sender: string; receiverId: string; content: string; conversationId?: string; relatedJobId?: string }) => {
        console.log(`[messageService] sendMessage called. Sender: ${messageData.sender}, ReceiverID: ${messageData.receiverId}`);
        try {
            // Construct the payload expected by the backend
            const payload = {
                receiverId: messageData.receiverId,
                content: messageData.content,
                relatedJobId: messageData.relatedJobId // Include if provided
            };
            const response = await axiosInstance.post('/messages', payload); // Send the structured payload
            console.log(`[messageService] sendMessage response:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`[messageService] sendMessage error:`, error);
            throw error;
        }
    },
    getConversations: async () => {
        console.log(`[messageService] getConversations called`);
        try {
            const response = await axiosInstance.get('/messages/conversations/list');
            console.log(`[messageService] getConversations response count:`, response.data?.length);
            return response.data;
        } catch (error) {
            console.error(`[messageService] getConversations error:`, error);
            throw error;
        }
    }
    // Add other message-related endpoints if needed
};

// Job Alert service (NEW)
export const jobAlertService = {
    getAlerts: async () => {
        const response = await axiosInstance.get('/job-alerts');
        return response.data;
    },
    createAlert: async (alertData: any) => {
        console.log('[api.ts] createAlert called with data:', alertData); // Log input
        try {
            const response = await axiosInstance.post('/job-alerts', alertData);
            console.log('[api.ts] createAlert raw response:', response); // Log the whole response object
            const dataToReturn = response.data;
            console.log('[api.ts] createAlert returning data:', dataToReturn); // Log what is actually being returned
            return dataToReturn;
        } catch (error) {
            console.error('[api.ts] createAlert error:', error);
            throw error; // Re-throw the error to be caught by the calling function
        }
    },
    updateAlert: async (alertId: string, alertData: any) => {
        const response = await axiosInstance.put(`/job-alerts/${alertId}`, alertData);
        return response.data;
    },
    deleteAlert: async (alertId: string) => {
        const response = await axiosInstance.delete(`/job-alerts/${alertId}`);
        return response.data;
    }
};

// Report service (NEW)
export const reportService = {
    getReports: async (filters?: any) => {
        console.log(`[FraudManagement] Requesting reports with filters:`, filters);
        try {
            const response = await axiosInstance.get('/reports', { params: filters });
            console.log(`[FraudManagement] Retrieved ${response.data.reports?.length || 0} reports`);
            return response.data;
        } catch (error: any) {
            console.error('[FraudManagement] Error retrieving reports:', error);
            console.error('[FraudManagement] Error details:', error.response?.data || error.message);
            throw error;
        }
    },
    getReportById: async (reportId: string) => {
        console.log(`[FraudManagement] Requesting report details for ID: ${reportId}`);
        try {
            const response = await axiosInstance.get(`/reports/${reportId}`);
            console.log(`[FraudManagement] Successfully retrieved report details`);
            return response.data;
        } catch (error: any) {
            console.error(`[FraudManagement] Error retrieving report details:`, error);
            console.error(`[FraudManagement] Error details:`, error.response?.data || error.message);
            throw error;
        }
    },
    updateReport: async (reportId: string, updateData: any) => {
        console.log(`[FraudManagement] Updating report ID: ${reportId}`, updateData);
        try {
            const response = await axiosInstance.put(`/reports/${reportId}`, updateData);
            console.log(`[FraudManagement] Report update successful:`, response.data);
            return response.data;
        } catch (error: any) {
            console.error(`[FraudManagement] Error updating report:`, error);
            console.error(`[FraudManagement] Error details:`, error.response?.data || error.message);
            throw error;
        }
    },
    createReport: async (reportData: any) => {
        console.log(`[FraudManagement] Creating new report for ${reportData.entityType}:`, reportData.entityId);
        try {
            const response = await axiosInstance.post('/reports', reportData);
            console.log(`[FraudManagement] Report creation successful:`, response.data);
            return response.data;
        } catch (error: any) {
            console.error(`[FraudManagement] Error creating report:`, error);
            console.error(`[FraudManagement] Error details:`, error.response?.data || error.message);
            throw error;
        }
    },
    getReportStatistics: async () => {
        console.log(`[FraudManagement] Requesting report statistics`);
        try {
            const response = await axiosInstance.get('/reports/statistics/summary');
            console.log(`[FraudManagement] Report statistics retrieved:`, response.data);
            return response.data;
        } catch (error: any) {
            console.error(`[FraudManagement] Error retrieving report statistics:`, error);
            console.error(`[FraudManagement] Error details:`, error.response?.data || error.message);
            throw error;
        }
    },
    analyzeReportWithAI: async (reportId: string) => {
        console.log(`[FraudManagement] Requesting AI analysis for report ID: ${reportId}`);
        try {
            const response = await axiosInstance.post(`/reports/${reportId}/analyze`);
            console.log(`[FraudManagement] AI analysis complete with fraud score: ${response.data.fraudScore || 'N/A'}`);
            return response.data;
        } catch (error: any) {
            console.error(`[FraudManagement] Error during AI analysis:`, error);
            console.error(`[FraudManagement] Error details:`, error.response?.data || error.message);
            throw error;
        }
    }
};

// Company profile service (NEW - Placeholder methods)
export const companyService = {
    getCompanyProfile: async (companyId: string) => {
        const response = await axiosInstance.get(`/company/${companyId}`);
        return response.data;
    },
    getCompanyJobs: async (companyId: string) => {
        const response = await axiosInstance.get(`/company/${companyId}/jobs`);
        return response.data;
    },
    getCompanyReviews: async (companyId: string, params?: { page?: number; sort?: string }) => {
        const response = await axiosInstance.get(`/company/${companyId}/reviews`, { params });
        return response.data;
    }
};

// Review service (NEW - Placeholder methods)
export const reviewService = {
    submitReview: async (companyId: string, reviewData: any) => {
        const response = await axiosInstance.post(`/company/${companyId}/reviews`, reviewData);
        return response.data;
    },
    getReviews: async (companyId: string) => { // Redundant with companyService but maybe useful elsewhere
        const response = await axiosInstance.get(`/reviews?companyId=${companyId}`);
        return response.data;
    }
};

// Salary service (NEW - Placeholder methods)
export const salaryService = {
    getSalaryInsights: async (params: any) => {
        console.log(`[SalaryInsights] Requesting salary insights data with params:`, params);
        try {
            const startTime = performance.now();
            const response = await axiosInstance.get(`/jobseeker/salary-insights`, { params });
            const endTime = performance.now();
            
            console.log(`[SalaryInsights] Successfully retrieved insights in ${Math.round(endTime - startTime)}ms`);
            
            // Log summary of data received
            if (response.data) {
                const data = response.data;
                console.log(`[SalaryInsights] Data summary: 
                    Salary Range: ${data.salaryRange?.low || 'N/A'} - ${data.salaryRange?.high || 'N/A'} 
                    Top Roles: ${data.topRoles?.length || 0} roles provided
                    Valuable Skills: ${data.valuableSkills?.length || 0} skills recommended`);
            }
            
            return response.data;
        } catch (error: any) {
            console.error(`[SalaryInsights] Error retrieving salary insights:`, error);
            console.error(`[SalaryInsights] Error details:`, error.response?.data || error.message);
            throw error;
        }
    }
};

// Admin service
export const adminService = {
    // ... existing code ...
};

// Export the axios instance as default
export default axiosInstance; 