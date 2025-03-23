import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    TextField,
    MenuItem,
    Typography,
    Paper,
    Alert,
    Snackbar,
    Grid
} from '@mui/material';
import axios from 'axios';

const PostJob = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        salary: {
            min: '',
            max: '',
            currency: 'USD'
        },
        location: '',
        type: 'full-time',
        company: ''
    });
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'salaryMin' || name === 'salaryMax') {
            setFormData(prev => ({
                ...prev,
                salary: {
                    ...prev.salary,
                    [name === 'salaryMin' ? 'min' : 'max']: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                'http://localhost:5000/api/jobs',
                formData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.status === 201) {
                setSnackbar({
                    open: true,
                    message: 'Job Posted Successfully',
                    severity: 'success'
                });
                navigate('/jobs');
            }
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || 'Failed to post job',
                severity: 'error'
            });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Post a New Job
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <TextField
                        fullWidth
                        required
                        label="Job Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        margin="normal"
                        placeholder="e.g. Senior Software Engineer"
                    />

                    <TextField
                        fullWidth
                        required
                        label="Company Name"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        margin="normal"
                        placeholder="e.g. Tech Company Inc."
                    />

                    <TextField
                        fullWidth
                        required
                        label="Location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        margin="normal"
                        placeholder="e.g. New York, NY"
                    />

                    <TextField
                        fullWidth
                        required
                        select
                        label="Job Type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        margin="normal"
                    >
                        <MenuItem value="full-time">Full Time</MenuItem>
                        <MenuItem value="part-time">Part Time</MenuItem>
                        <MenuItem value="contract">Contract</MenuItem>
                        <MenuItem value="internship">Internship</MenuItem>
                    </TextField>

                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                required
                                label="Minimum Salary"
                                name="salaryMin"
                                type="number"
                                value={formData.salary.min}
                                onChange={handleChange}
                                placeholder="e.g. 50000"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                required
                                label="Maximum Salary"
                                name="salaryMax"
                                type="number"
                                value={formData.salary.max}
                                onChange={handleChange}
                                placeholder="e.g. 100000"
                            />
                        </Grid>
                    </Grid>

                    <TextField
                        fullWidth
                        required
                        multiline
                        rows={4}
                        label="Job Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        margin="normal"
                        placeholder="Describe the job responsibilities and requirements..."
                    />

                    <TextField
                        fullWidth
                        required
                        multiline
                        rows={4}
                        label="Requirements"
                        name="requirements"
                        value={formData.requirements}
                        onChange={handleChange}
                        margin="normal"
                        placeholder="List the required skills and qualifications..."
                    />

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                        >
                            Post Job
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/jobs')}
                            size="large"
                        >
                            Cancel
                        </Button>
                    </Box>
                </Box>
            </Paper>
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

export default PostJob; 