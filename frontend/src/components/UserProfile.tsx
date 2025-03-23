import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Box,
    Container,
    Paper,
    Typography,
    Grid,
    Divider,
    Button,
    CircularProgress
} from '@mui/material';

const UserProfile: React.FC = () => {
    const { user, loading } = useAuth();

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

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Profile
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>
                            Basic Information
                        </Typography>
                        <Typography><strong>Email:</strong> {user.email}</Typography>
                        <Typography><strong>Type:</strong> {user.type}</Typography>
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
                            <Typography variant="h6" gutterBottom>
                                Company Information
                            </Typography>
                            <Typography><strong>Company Name:</strong> {user.companyName}</Typography>
                            {user.companyDescription && (
                                <Typography><strong>Description:</strong> {user.companyDescription}</Typography>
                            )}
                        </Grid>
                    )}
                </Grid>

                <Box sx={{ mt: 4 }}>
                    <Button variant="contained" color="primary">
                        Edit Profile
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default UserProfile; 