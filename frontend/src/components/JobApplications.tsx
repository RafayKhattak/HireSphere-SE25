import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { jobService, applicationService } from '../services/api';
import { Job, JobApplication } from '../types';
import { useAuth } from '../context/AuthContext';

const JobApplications: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (id) {
            fetchJobAndApplications(id);
        }
    }, [id]);

    const fetchJobAndApplications = async (jobId: string) => {
        try {
            const [jobData, applicationsData] = await Promise.all([
                jobService.getJobById(jobId),
                applicationService.getJobApplications(jobId)
            ]);
            setJob(jobData);
            setApplications(applicationsData);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch job applications');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (applicationId: string, status: string) => {
        try {
            await applicationService.updateApplicationStatus(applicationId, status);
            if (id) {
                // Refresh applications after status update
                const data = await applicationService.getJobApplications(id);
                setApplications(data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update application status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'accepted':
                return 'success';
            case 'rejected':
                return 'error';
            case 'reviewed':
                return 'info';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error || !job) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error || 'Job not found'}
            </Alert>
        );
    }

    if (!user || user.type !== 'employer' || (typeof job.employer === 'string' ? job.employer !== user.id : job.employer._id !== user.id)) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                You are not authorized to view these applications
            </Alert>
        );
    }

    return (
        <Box>
            <Box mb={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Applications for {job.title}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                    {applications.length} application(s) received
                </Typography>
            </Box>

            {applications.length === 0 ? (
                <Box textAlign="center" py={4}>
                    <Typography variant="h6" color="textSecondary">
                        No applications received yet
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => navigate(`/jobs/${job._id}`)}
                        sx={{ mt: 2 }}
                    >
                        View Job Post
                    </Button>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {applications.map((application) => {
                        const applicant = typeof application.jobSeeker === 'object' ? application.jobSeeker : null;
                        if (!applicant) return null;

                        return (
                            <Grid item xs={12} key={application._id}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                            <Box flex={1}>
                                                <Typography variant="h6" component="h2" gutterBottom>
                                                    {applicant.firstName} {applicant.lastName}
                                                </Typography>
                                                <Typography color="textSecondary" gutterBottom>
                                                    {applicant.email}
                                                </Typography>
                                                <Box display="flex" gap={1} mb={2}>
                                                    <Chip
                                                        label={`Applied: ${new Date(application.appliedAt).toLocaleDateString()}`}
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </Box>
                                            <FormControl sx={{ minWidth: 120 }}>
                                                <InputLabel>Status</InputLabel>
                                                <Select
                                                    value={application.status}
                                                    label="Status"
                                                    onChange={(e) => handleStatusChange(application._id, e.target.value)}
                                                >
                                                    <MenuItem value="pending">Pending</MenuItem>
                                                    <MenuItem value="reviewed">Reviewed</MenuItem>
                                                    <MenuItem value="accepted">Accepted</MenuItem>
                                                    <MenuItem value="rejected">Rejected</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        <Typography variant="subtitle1" gutterBottom>
                                            Cover Letter
                                        </Typography>
                                        <Typography variant="body2" paragraph>
                                            {application.coverLetter}
                                        </Typography>

                                        <Typography variant="subtitle1" gutterBottom>
                                            Resume
                                        </Typography>
                                        <Typography variant="body2" component="a" href={application.resume} target="_blank">
                                            {application.resume}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
};

export default JobApplications; 