import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    IconButton,
    CircularProgress,
    Alert,
    Snackbar,
    Avatar,
    Pagination
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { jobService, bookmarkService } from '../services/api';
import { Job } from '../types';
import { useAuth } from '../context/AuthContext';
import JobFilters from './JobFilters';
import { Link } from 'react-router-dom';

const JobList: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [filters, setFilters] = useState<{
        keywords?: string;
        location?: string;
        minSalary?: number;
        maxSalary?: number;
        jobType?: string;
    }>({});
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 5,
        total: 0,
        pages: 1
    });
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
    }, [pagination.page, filters]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const { jobs: fetchedJobs, pagination: paginationData } = await jobService.getAllJobs({
                ...filters,
                page: pagination.page,
                limit: pagination.limit
            });
            console.log('[JobList] fetchJobs received data. Sample (first job):', fetchedJobs[0]);
            setJobs(fetchedJobs);
            setPagination(prevPagination => ({
                ...prevPagination,
                total: paginationData.total,
                pages: paginationData.pages
            }));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = (newFilters: {
        keywords?: string;
        location?: string;
        minSalary?: number;
        maxSalary?: number;
        jobType?: string;
    }) => {
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filters change
    };

    const handleChangePage = (event: React.ChangeEvent<unknown>, value: number) => {
        setPagination(prev => ({ ...prev, page: value }));
    };

    const handleBookmark = async (jobId: string) => {
        if (!user) {
            navigate('/login');
            return;
        }

        const job = jobs.find(j => j._id === jobId);
        if (!job) return; 

        // Use the new isBookmarked field for current state
        const isCurrentlyBookmarked = job.isBookmarked;
        // Optimistically toggle the isBookmarked field
        const optimisticIsBookmarked = !isCurrentlyBookmarked; 

        // Optimistic UI update using isBookmarked
        setJobs(jobs.map(j => j._id === jobId ? { ...j, isBookmarked: optimisticIsBookmarked } : j));

        try {
            if (isCurrentlyBookmarked) {
                console.log(`[JobList] Attempting to remove bookmark for job ${jobId}`);
                await bookmarkService.removeBookmark(jobId);
                setSnackbar({
                    open: true,
                    message: 'Bookmark removed',
                    severity: 'success'
                });
            } else {
                console.log(`[JobList] Attempting to add bookmark for job ${jobId}`);
                await bookmarkService.addBookmark(jobId);
                setSnackbar({
                    open: true,
                    message: 'Bookmark added',
                    severity: 'success'
                });
            }
        } catch (err: any) {
            console.error(`[JobList] Failed to ${isCurrentlyBookmarked ? 'remove' : 'add'} bookmark for job ${jobId}:`, err);
            setError(err.response?.data?.message || 'Failed to update bookmark');
            // Revert optimistic update on error
            setJobs(jobs.map(j => j._id === jobId ? { ...j, isBookmarked: isCurrentlyBookmarked } : j));
            setSnackbar({
                open: true,
                message: `Failed to ${isCurrentlyBookmarked ? 'remove' : 'add'} bookmark`,
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

            <JobFilters onApplyFilters={handleApplyFilters} />

            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            ) : jobs.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                    No jobs found matching your criteria. Try adjusting your filters.
                </Alert>
            ) : (
                <>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {jobs.map((job) => (
                            <Card key={job._id}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                                            <Avatar 
                                                src={typeof job.employer === 'object' ? job.employer.companyLogo : ''} 
                                                alt={typeof job.employer === 'object' ? job.employer.companyName : 'Company Logo'}
                                                sx={{ width: 60, height: 60, mr: 2, mt: 0.5 }}
                                            >
                                                {(typeof job.employer === 'object' && job.employer.companyName) ? 
                                                    job.employer.companyName.charAt(0).toUpperCase() : 'C'}
                                            </Avatar>
                                            <Box flex={1}>
                                                <Typography variant="h6" component="h2" gutterBottom>
                                                    {job.title}
                                                </Typography>
                                                <Typography 
                                                    color="primary" 
                                                    gutterBottom 
                                                    fontWeight="500" 
                                                    sx={{ cursor: 'pointer', textDecoration: 'none' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (typeof job.employer === 'object' && job.employer._id) {
                                                            navigate(`/company/${job.employer._id}`);
                                                        }
                                                    }}
                                                >
                                                    {typeof job.employer === 'object' ? job.employer.companyName : 'Company Name'}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary" paragraph>
                                                    {job.location} • {job.type.charAt(0).toUpperCase() + job.type.slice(1)}
                                                </Typography>
                                                <Typography variant="body2" paragraph>
                                                    {job.description.length > 150 ? 
                                                        `${job.description.substring(0, 150)}...` : 
                                                        job.description}
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
                                        </Box>
                                        {user?.type === 'jobseeker' && (
                                            <IconButton
                                                onClick={() => handleBookmark(job._id)}
                                                color="primary"
                                            >
                                                {job.isBookmarked ? (
                                                    <BookmarkIcon />
                                                ) : (
                                                    <BookmarkBorderIcon />
                                                )}
                                            </IconButton>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>

                    {pagination.pages > 1 && (
                        <Box display="flex" justifyContent="center" mt={4} mb={2}>
                            <Pagination 
                                count={pagination.pages} 
                                page={pagination.page} 
                                onChange={handleChangePage} 
                                color="primary" 
                            />
                        </Box>
                    )}
                </>
            )}

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