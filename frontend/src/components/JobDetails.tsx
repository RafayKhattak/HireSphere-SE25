import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
    Grid,
    Avatar,
    Card,
    CardContent,
    Link
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Link';
import { jobService, bookmarkService } from '../services/api';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';

const JobDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (id) {
            // Determine source of this view
            const source = new URLSearchParams(location.search).get('source') || 'direct';
            fetchJobDetails(id, source);
        }
    }, [id, location.search]);

    const fetchJobDetails = async (jobId: string, source?: string) => {
        try {
            const data = await jobService.getJobById(jobId, source);
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
            fetchJobDetails(id, 'bookmark_action');
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

    const handleApplyClick = async () => {
        if (!id) return;
        
        // Track the click before navigating
        await jobService.trackJobClick(id, 'apply_button');
        
        // Navigate to application page
        navigate(`/jobs/${id}/apply`);
    };

    const formatSalary = (min: number, max: number, currency: string) => {
        const formatter = new Intl.NumberFormat('en-PK');
        if (currency === 'PKR') {
            return `Rs. ${formatter.format(min)} - Rs. ${formatter.format(max)}`;
        }
        return `${currency} ${formatter.format(min)} - ${formatter.format(max)}`;
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
                        <Typography variant="h6" color="primary" gutterBottom>
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
                        <Typography 
                            component="div" 
                            sx={{ 
                                whiteSpace: 'pre-line',
                                mb: 3
                            }}
                        >
                            {job.description}
                        </Typography>

                        <Typography variant="h6" gutterBottom>
                            Requirements
                        </Typography>
                        <Typography 
                            component="div" 
                            sx={{ 
                                whiteSpace: 'pre-line'
                            }}
                        >
                            {job.requirements}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ mb: 3 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar 
                                        src={typeof job.employer === 'object' ? job.employer.companyLogo : ''} 
                                        alt={typeof job.employer === 'object' ? job.employer.companyName : 'Company'}
                                        sx={{ width: 80, height: 80, mr: 2 }}
                                    >
                                        {typeof job.employer === 'object' && job.employer.companyName ? 
                                            job.employer.companyName.charAt(0).toUpperCase() : <BusinessIcon />}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6">
                                            {typeof job.employer === 'object' ? job.employer.companyName : 'Company Name'}
                                        </Typography>
                                    </Box>
                                </Box>
                                
                                {typeof job.employer === 'object' && job.employer.companyDescription && (
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        {job.employer.companyDescription.length > 200 
                                            ? `${job.employer.companyDescription.substring(0, 200)}...` 
                                            : job.employer.companyDescription}
                                    </Typography>
                                )}
                                
                                <Box sx={{ mt: 1 }}>
                                    {typeof job.employer === 'object' && job.employer.companySize && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <PeopleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                            <Typography variant="body2">
                                                {job.employer.companySize} employees
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {typeof job.employer === 'object' && job.employer.industry && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                            <Typography variant="body2">
                                                {job.employer.industry}
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {typeof job.employer === 'object' && job.employer.location && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                            <Typography variant="body2">
                                                {job.employer.location}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>

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
                                    <strong>Salary:</strong> {formatSalary(job.salary.min, job.salary.max, job.salary.currency)}
                                </Typography>
                                <Typography>
                                    <strong>Posted:</strong> {new Date(job.createdAt).toLocaleDateString()}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {isJobSeeker && (
                    <Box mt={4}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleApplyClick}
                        >
                            Apply Now
                        </Button>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default JobDetails; 