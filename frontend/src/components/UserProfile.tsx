import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Container,
    Paper,
    Typography,
    Grid,
    Divider,
    Button,
    CircularProgress,
    Avatar,
    Stack,
    TextField,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

const UserProfile: React.FC = () => {
    const { user, loading, token } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [profileData, setProfileData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [openReportDialog, setOpenReportDialog] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const handleEditCompanyProfile = () => {
        navigate('/employer/profile');
    };

    const handleEditPersonalProfile = () => {
        navigate('/employer/personal-profile');
    };

    const handleOpenReportDialog = () => {
        setOpenReportDialog(true);
        setReportReason('');
        setReportDetails('');
        setReportError(null);
        setReportSuccess(false);
    };

    const handleCloseReportDialog = () => {
        setOpenReportDialog(false);
    };

    const handleSubmitReport = async () => {
        if (!reportReason) {
            setReportError('Please select a reason for reporting');
            return;
        }
        
        if (!reportDetails || reportDetails.trim().length < 10) {
            setReportError('Please provide more details about the issue (minimum 10 characters)');
            return;
        }
        
        if (!profileData || !profileData._id) {
            setReportError('Cannot identify the user to report');
            return;
        }
        
        setReportLoading(true);
        setReportError(null);
        
        try {
            const response = await axios.post(
                '/api/reports',
                {
                    entityType: 'user',
                    entityId: profileData._id,
                    reason: reportReason,
                    description: reportDetails
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    }
                }
            );
            
            setReportSuccess(true);
            setReportDetails('');
            setReportReason('');
            
            setTimeout(() => {
                handleCloseReportDialog();
                setReportSuccess(false);
            }, 2000);
            
        } catch (error: any) {
            console.error('Error submitting report:', error);
            setReportError(error.response?.data?.msg || 'Failed to submit report. Please try again.');
        } finally {
            setReportLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return (
            <Container maxWidth="md" sx={{ py: 8 }}>
                <Typography variant="h5" align="center">
                    Please log in to view your profile
                </Typography>
            </Container>
        );
    }

    // Determine display name based on user type
    const displayName = user.type === 'employer' 
        ? user.name || user.email.split('@')[0]
        : `${user.firstName || ''} ${user.lastName || ''}`;

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar 
                        sx={{ 
                            width: 80, 
                            height: 80, 
                            mr: 3,
                            bgcolor: 'primary.main'
                        }}
                        alt={displayName}
                        src={user.profileImage || ''}
                    >
                        {user.type === 'employer' ? <PersonIcon fontSize="large" /> : <PersonIcon fontSize="large" />}
                    </Avatar>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            {displayName}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {user.type === 'employer' ? 'Employer Account' : 'Job Seeker Account'}
                        </Typography>
                    </Box>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>
                            Basic Information
                        </Typography>
                        <Typography><strong>Email:</strong> {user.email}</Typography>
                        {user.phone && <Typography><strong>Phone:</strong> {user.phone}</Typography>}
                        {user.location && <Typography><strong>Location:</strong> {user.location}</Typography>}
                    </Grid>

                    {user.type === 'jobseeker' && (
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>
                                Job Seeker Details
                            </Typography>
                            <Typography><strong>First Name:</strong> {user.firstName}</Typography>
                            <Typography><strong>Last Name:</strong> {user.lastName}</Typography>
                        </Grid>
                    )}

                    {user.type === 'employer' && (
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="h6" gutterBottom>
                                    Company Information
                                </Typography>
                            </Box>
                            <Typography><strong>Company Name:</strong> {user.companyName}</Typography>
                            {user.companyDescription && (
                                <Typography><strong>Description:</strong> {user.companyDescription}</Typography>
                            )}
                            {user.industry && (
                                <Typography><strong>Industry:</strong> {user.industry}</Typography>
                            )}
                            {user.companySize && (
                                <Typography><strong>Company Size:</strong> {user.companySize}</Typography>
                            )}
                        </Grid>
                    )}
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
                    {user.type === 'employer' ? (
                        <Button 
                            variant="contained" 
                            color="primary"
                            startIcon={<PersonIcon />}
                            onClick={handleEditPersonalProfile}
                        >
                            Edit Personal Profile
                        </Button>
                    ) : (
                        <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => navigate('/jobseeker/profile')}
                        >
                            Edit Profile
                        </Button>
                    )}
                    
                    {/* Report User Button - only show if viewing someone else's profile */}
                    {user && profileData && user._id !== profileData._id && (
                        <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<EditIcon />}
                            onClick={handleOpenReportDialog}
                            size="small"
                            sx={{ mr: 1 }}
                        >
                            Report User
                        </Button>
                    )}
                </Box>
            </Paper>
            
            {/* Report Dialog */}
            <Dialog open={openReportDialog} onClose={handleCloseReportDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Report User: {profileData?.name || 'User'}</DialogTitle>
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
                                    <MenuItem value="duplicate">Duplicate Account</MenuItem>
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
                                placeholder="Please provide specific details about why you're reporting this user..."
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
        </Container>
    );
};

export default UserProfile; 