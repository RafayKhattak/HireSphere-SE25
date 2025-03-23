import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    Chip,
    IconButton,
    CircularProgress,
    Alert,
    Snackbar
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { jobService, bookmarkService } from '../services/api';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';

const JobList: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success'
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const data = await jobService.getAllJobs();
            setJobs(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleBookmark = async (jobId: string) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await bookmarkService.addBookmark(jobId);
            
            // Update the local state to reflect the bookmark change
            setJobs(jobs.map(job => {
                if (job._id === jobId) {
                    const isBookmarked = job.bookmarkedBy?.includes(user.id);
                    return {
                        ...job,
                        bookmarkedBy: isBookmarked
                            ? job.bookmarkedBy.filter((id: string) => id !== user.id)
                            : [...(job.bookmarkedBy || []), user.id]
                    };
                }
                return job;
            }));

            setSnackbar({
                open: true,
                message: 'Bookmark status updated',
                severity: 'success'
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update bookmark');
            setSnackbar({
                open: true,
                message: 'Failed to update bookmark',
                severity: 'error'
            });
        }
    };

    const formatSalary = (min: number | undefined, max: number | undefined, currency: string | undefined) => {
        if (!min || !max || !currency) return 'Salary not specified';
        return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
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

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Available Jobs
                </Typography>
                {user?.type === 'employer' && (
                    <Button
                        variant="contained"
                        onClick={() => navigate('/jobs/post')}
                    >
                        Post a Job
                    </Button>
                )}
            </Box>

            <Grid container spacing={3}>
                {jobs.map((job) => (
                    <Grid item xs={12} key={job._id}>
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
                                        <Typography variant="body2" color="textSecondary" paragraph>
                                            {job.location} • {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                                        </Typography>
                                        <Typography variant="body2" paragraph>
                                            {job.description}
                                        </Typography>
                                        <Box display="flex" gap={1} mb={2}>
                                            <Chip
                                                label={formatSalary(job.salary?.min, job.salary?.max, job.salary?.currency)}
                                                color="primary"
                                                variant="outlined"
                                            />
                                        </Box>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => navigate(`/jobs/${job._id}`)}
                                        >
                                            View Details
                                        </Button>
                                    </Box>
                                    {user?.type === 'jobseeker' && (
                                        <IconButton
                                            onClick={() => handleBookmark(job._id)}
                                            color="primary"
                                        >
                                            {job.bookmarkedBy?.includes(user.id) ? (
                                                <BookmarkIcon />
                                            ) : (
                                                <BookmarkBorderIcon />
                                            )}
                                        </IconButton>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default JobList; 