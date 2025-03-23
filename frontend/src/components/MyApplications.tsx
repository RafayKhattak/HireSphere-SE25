import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Divider
} from '@mui/material';
import { applicationService } from '../services/api';
import { JobApplication } from '../types';
import { useAuth } from '../context/AuthContext';

const MyApplications: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const data = await applicationService.getMyApplications();
            setApplications(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch applications');
        } finally {
            setLoading(false);
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

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
            </Alert>
        );
    }

    if (applications.length === 0) {
        return (
            <Box textAlign="center" py={4}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                    No job applications found
                </Typography>
                <Button
                    variant="contained"
                    onClick={() => navigate('/jobs')}
                    sx={{ mt: 2 }}
                >
                    Browse Jobs
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                My Applications
            </Typography>

            <Grid container spacing={3}>
                {applications.map((application) => {
                    const job = typeof application.job === 'object' ? application.job : null;
                    if (!job) return null;

                    return (
                        <Grid item xs={12} key={application._id}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box flex={1}>
                                            <Typography variant="h6" component="h2" gutterBottom>
                                                {job.title}
                                            </Typography>
                                            <Typography color="textSecondary" gutterBottom>
                                                {typeof job.employer === 'object' ? job.employer.companyName : 'Company Name'}
                                            </Typography>
                                            <Box display="flex" gap={1} mb={2}>
                                                <Chip
                                                    label={`Status: ${application.status.charAt(0).toUpperCase() + application.status.slice(1)}`}
                                                    color={getStatusColor(application.status) as any}
                                                />
                                                <Chip
                                                    label={`Applied: ${new Date(application.appliedAt).toLocaleDateString()}`}
                                                    variant="outlined"
                                                />
                                            </Box>
                                        </Box>
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

                                    <Box mt={2}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => navigate(`/jobs/${job._id}`)}
                                        >
                                            View Job Details
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

export default MyApplications; 