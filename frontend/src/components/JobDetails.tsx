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
    Avatar,
    Card,
    CardContent,
    Link,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Link';
import FlagIcon from '@mui/icons-material/Flag';
import { jobService, bookmarkService, reportService } from '../services/api';
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
    
    // Report dialog state
    const [openReportDialog, setOpenReportDialog] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState('');
    const [reportSuccess, setReportSuccess] = useState(false);

    useEffect(() => {
        if (id) {
            // Determine source of this view
            const source = new URLSearchParams(location.search).get('source') || 'direct';
            fetchJobDetails(id, source);
        }
    }, [id, location.search]);

    const fetchJobDetails = async (jobId: string, source?: string) => {
        try {
            const data = await jobService.getJobById(jobId);
            console.log(`[JobDetails] fetchJobDetails received data for ${jobId}:`, data);
            setJob(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    };

    const handleBookmark = async () => {
        if (!id || !job) return; // Need job state to exist
        if (!user) { navigate('/login'); return; } // Check user

        // Use isBookmarked field for current state
        const isCurrentlyBookmarked = job.isBookmarked;
        // Optimistically toggle the state for immediate UI feedback
        setJob({ ...job, isBookmarked: !isCurrentlyBookmarked }); 

        try {
            if (isCurrentlyBookmarked) {
                await bookmarkService.removeBookmark(id);
            } else {
                await bookmarkService.addBookmark(id);
            }
            // Re-fetch to confirm and get latest data (optional but safer)
            // fetchJobDetails(id, 'bookmark_action'); 
            // Or rely on the optimistic update and potential future refresh
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update bookmark');
            // Revert optimistic update on error
            setJob({ ...job, isBookmarked: isCurrentlyBookmarked }); 
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

    const handleOpenReportDialog = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setOpenReportDialog(true);
        setReportReason('');
        setReportDetails('');
        setReportError('');
        setReportSuccess(false);
    };

    const handleCloseReportDialog = () => {
        setOpenReportDialog(false);
    };

    const handleSubmitReport = async () => {
        if (!id || !user) return;
        
        if (!reportReason) {
            setReportError('Please select a reason for reporting');
            return;
        }
        
        if (!reportDetails || reportDetails.length < 10) {
            setReportError('Please provide more details about the issue');
            return;
        }
        
        setReportLoading(true);
        setReportError('');
        
        try {
            await reportService.createReport({
                entityType: 'job',
                entityId: id,
                reason: reportReason,
                description: reportDetails
            });
            
            setReportSuccess(true);
            setTimeout(() => {
                setOpenReportDialog(false);
            }, 3000);
        } catch (err: any) {
            setReportError(err.response?.data?.message || 'Failed to submit report');
        } finally {
            setReportLoading(false);
        }
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
                        {user && (
                            <Box display="flex">
                                {isJobSeeker && (
                                    <IconButton
                                        onClick={handleBookmark}
                                        color="primary"
                                        size="large"
                                    >
                                        {job?.isBookmarked ? (
                                            <BookmarkIcon />
                                        ) : (
                                            <BookmarkBorderIcon />
                                        )}
                                    </IconButton>
                                )}
                                {!isJobOwner && (
                                    <IconButton
                                        onClick={handleOpenReportDialog}
                                        color="warning"
                                        size="large"
                                    >
                                        <FlagIcon />
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
                        )}
                    </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 3 }}>
                    <Box sx={{ width: { xs: '100%', md: '66.66%' } }}>
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
                    </Box>
                    <Box sx={{ width: { xs: '100%', md: '33.33%' } }}>
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
                    </Box>
                </Box>

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
            
            {/* Report Dialog */}
            <Dialog open={openReportDialog} onClose={handleCloseReportDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Report Job: {job?.title}</DialogTitle>
                <DialogContent>
                    {reportSuccess ? (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            Report submitted successfully. Our moderation team will review it.
                        </Alert>
                    ) : (
                        <>
                            {reportError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {reportError}
                                </Alert>
                            )}
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="report-reason-label">Reason</InputLabel>
                                <Select
                                    labelId="report-reason-label"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    label="Reason"
                                    disabled={reportLoading}
                                >
                                    <MenuItem value="spam">Spam</MenuItem>
                                    <MenuItem value="inappropriate">Inappropriate Content</MenuItem>
                                    <MenuItem value="misleading">Misleading Information</MenuItem>
                                    <MenuItem value="fraud">Fraud</MenuItem>
                                    <MenuItem value="scam">Scam</MenuItem>
                                    <MenuItem value="duplicate">Duplicate Job Posting</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Details"
                                multiline
                                rows={4}
                                fullWidth
                                margin="normal"
                                value={reportDetails}
                                onChange={(e) => setReportDetails(e.target.value)}
                                placeholder="Please provide specific details about why you're reporting this job..."
                                disabled={reportLoading}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseReportDialog} disabled={reportLoading}>
                        Cancel
                    </Button>
                    {!reportSuccess && (
                        <Button 
                            onClick={handleSubmitReport} 
                            color="primary" 
                            variant="contained"
                            disabled={reportLoading}
                        >
                            {reportLoading ? (
                                <>
                                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                                    Submitting...
                                </>
                            ) : 'Submit Report'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default JobDetails; 