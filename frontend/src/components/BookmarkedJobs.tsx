import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    IconButton,
    CircularProgress,
    Alert,
    Snackbar,
    Button
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkRemoveIcon from '@mui/icons-material/BookmarkRemove';
import { useAuth } from '../context/AuthContext';
import { bookmarkService } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface Job {
    _id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    salary: {
        min: number;
        max: number;
        currency: string;
    };
    description: string;
    bookmarkedBy?: string[];
}

const BookmarkedJobs: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchBookmarkedJobs = async () => {
            try {
                setLoading(true);
                const data = await bookmarkService.getBookmarks();
                setJobs(data);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching bookmarked jobs:', err);
                setError(err.response?.data?.message || 'Failed to load bookmarked jobs');
            } finally {
                setLoading(false);
            }
        };

        fetchBookmarkedJobs();
    }, [user, navigate]);

    const formatSalary = (min: number | undefined, max: number | undefined, currency: string | undefined) => {
        if (!min || !max || !currency) return 'Salary not specified';
        return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    };

    const handleBookmark = async (jobId: string) => {
        try {
            await bookmarkService.removeBookmark(jobId);
            
            // Remove the job from the list since it's no longer bookmarked
            setJobs(jobs.filter(job => job._id !== jobId));

            setSnackbar({
                open: true,
                message: 'Job removed from bookmarks',
                severity: 'success'
            });
        } catch (err: any) {
            console.error('Error removing bookmark:', err);
            setError(err.response?.data?.message || 'Failed to remove bookmark');
            setSnackbar({
                open: true,
                message: 'Failed to remove bookmark',
                severity: 'error'
            });
        }
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
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                My Bookmarked Jobs
            </Typography>

            {jobs.length === 0 ? (
                <Typography variant="body1" color="textSecondary">
                    You haven't bookmarked any jobs yet.
                </Typography>
            ) : (
                <Grid container spacing={3}>
                    {jobs.map((job) => (
                        <Grid component="div" sx={{ gridColumn: 'span 12' }} key={job._id}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box flex={1}>
                                            <Typography variant="h6" component="h2" gutterBottom>
                                                {job.title}
                                            </Typography>
                                            <Typography color="textSecondary" gutterBottom>
                                                {job.company}
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
                                        <IconButton
                                            onClick={() => handleBookmark(job._id)}
                                            color="primary"
                                        >
                                            <BookmarkIcon />
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
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
        </Container>
    );
};

export default BookmarkedJobs; 