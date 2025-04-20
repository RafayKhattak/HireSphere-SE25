// Application service
export const applicationService = {
    // Existing methods
    getJobApplications: async (jobId) => {
        const response = await api.get(`/applications/job/${jobId}`);
        return response.data;
    },
    
    applyToJob: async (jobId, applicationData) => {
        const response = await api.post(`/applications/apply/${jobId}`, applicationData);
        return response.data;
    },
    
    updateApplicationStatus: async (applicationId, status) => {
        const response = await api.put(`/applications/${applicationId}/status`, { status });
        return response.data;
    },
    
    screenCandidates: async (jobId, queryParams = '') => {
        const response = await api.get(`/screening/analyze-candidates/${jobId}${queryParams}`);
        return response.data;
    },
    
    // Add new method for rating interviews
    rateInterview: async (applicationId, ratingData) => {
        const response = await api.post(`/applications/${applicationId}/rate-interview`, ratingData);
        return response.data;
    },
    
    // Add new method for fetching interview ratings
    getInterviewRatings: async (applicationId) => {
        const response = await api.get(`/applications/${applicationId}/interview-ratings`);
        return response.data;
    },
    
    // ... other existing methods
}; 