import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    Chip,
    IconButton,
    CircularProgress,
    Alert,
    Divider,
    Grid
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { jobService, bookmarkService } from '../services/api';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';

const JobDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (id) {
            fetchJobDetails(id);
        }
    }, [id]);

    const fetchJobDetails = async (jobId: string) => {
        try {
            const data = await jobService.getJobById(jobId);
            setJob(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    };

    const handleBookmark = async () => {
        if (!id) return;
        try {
            if (job?.bookmarkedBy?.includes(user?.id || '')) {
                await bookmarkService.removeBookmark(id);
            } else {
                await bookmarkService.addBookmark(id);
            }
            // Refresh job details to update bookmark status
            fetchJobDetails(id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update bookmark');
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await jobService.deleteJob(id);
            navigate('/jobs');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete job');
        }
    };

    const formatSalary = (min: number, max: number, currency: string) => {
        return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
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

    const isEmployer = user?.type === 'employer';
    const isJobOwner = isEmployer && user.id === job.employer;
    const isJobSeeker = user?.type === 'jobseeker';

    return (
        <Box>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                    <Box>
                        <Typography variant="h4" component="h1" gutterBottom>
                            {job.title}
                        </Typography>
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                            {typeof job.employer === 'object' ? job.employer.companyName : 'Company Name'}
                        </Typography>
                        <Box display="flex" gap={1} alignItems="center">
                            <Chip
                                label={job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                                color="primary"
                                variant="outlined"
                            />
                            <Chip
                                label={formatSalary(job.salary.min, job.salary.max, job.salary.currency)}
                                color="primary"
                                variant="outlined"
                            />
                            <Chip
                                label={job.location}
                                color="primary"
                                variant="outlined"
                            />
                        </Box>
                    </Box>
                    <Box>
                        {isJobSeeker && (
                            <IconButton
                                onClick={handleBookmark}
                                color="primary"
                                size="large"
                            >
                                {job?.bookmarkedBy?.includes(user?.id || '') ? (
                                    <BookmarkIcon />
                                ) : (
                                    <BookmarkBorderIcon />
                                )}
                            </IconButton>
                        )}
                        {isJobOwner && (
                            <Box display="flex" gap={1}>
                                <IconButton
                                    onClick={() => navigate(`/jobs/${job._id}/edit`)}
                                    color="primary"
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    onClick={handleDelete}
                                    color="error"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Typography variant="h6" gutterBottom>
                            Job Description
                        </Typography>
                        <Typography paragraph>
                            {job.description}
                        </Typography>

                        <Typography variant="h6" gutterBottom>
                            Requirements
                        </Typography>
                        <Typography paragraph>
                            {job.requirements}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Job Details
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1}>
                                <Typography>
                                    <strong>Type:</strong> {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                                </Typography>
                                <Typography>
                                    <strong>Location:</strong> {job.location}
                                </Typography>
                                <Typography>
                                    <strong>Salary Range:</strong> {formatSalary(job.salary.min, job.salary.max, job.salary.currency)}
                                </Typography>
                                <Typography>
                                    <strong>Posted:</strong> {new Date(job.createdAt).toLocaleDateString()}
                                </Typography>
                            </Box>
                            {isJobSeeker && (
                                <Button
                                    variant="contained"
                                    fullWidth
                                    sx={{ mt: 2 }}
                                    onClick={() => navigate(`/jobs/${job._id}/apply`)}
                                >
                                    Apply Now
                                </Button>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

export default JobDetails; 