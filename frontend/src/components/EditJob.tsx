import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    TextField,
    MenuItem,
    Typography,
    Paper,
    Alert,
    Snackbar
} from '@mui/material';
import axios from 'axios';

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
    requirements: string;
    status: string;
}

const EditJob: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [formData, setFormData] = useState<Partial<Job>>({
        title: '',
        company: '',
        location: '',
        type: '',
        salary: {
            min: 0,
            max: 0,
            currency: 'USD'
        },
        description: '',
        requirements: '',
        status: 'open'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
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
        fetchJob();
    }, [id]);

    const fetchJob = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/jobs/${id}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setFormData(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch job details');
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
        const { name, value } = e.target;
        if (name?.startsWith('salary.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                salary: {
                    ...prev.salary!,
                    [field]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name as string]: value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/jobs/${id}`, formData, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setSnackbar({
                open: true,
                message: 'Job updated successfully',
                severity: 'success'
            });
            setTimeout(() => {
                navigate('/jobs/manage');
            }, 1500);
        } catch (err) {
            setSnackbar({
                open: true,
                message: 'Failed to update job',
                severity: 'error'
            });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    if (loading) {
        return (
            <Container>
                <Typography>Loading...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Edit Job Post
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <TextField
                        fullWidth
                        label="Job Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        select
                        label="Job Type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        margin="normal"
                        required
                    >
                        <MenuItem value="full-time">Full Time</MenuItem>
                        <MenuItem value="part-time">Part Time</MenuItem>
                        <MenuItem value="contract">Contract</MenuItem>
                        <MenuItem value="internship">Internship</MenuItem>
                    </TextField>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <TextField
                            fullWidth
                            label="Minimum Salary"
                            name="salary.min"
                            type="number"
                            value={formData.salary?.min}
                            onChange={handleChange}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Maximum Salary"
                            name="salary.max"
                            type="number"
                            value={formData.salary?.max}
                            onChange={handleChange}
                            required
                        />
                    </Box>
                    <TextField
                        fullWidth
                        select
                        label="Status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        margin="normal"
                        required
                    >
                        <MenuItem value="open">Open</MenuItem>
                        <MenuItem value="closed">Closed</MenuItem>
                    </TextField>
                    <TextField
                        fullWidth
                        label="Job Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        margin="normal"
                        multiline
                        rows={4}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Requirements"
                        name="requirements"
                        value={formData.requirements}
                        onChange={handleChange}
                        margin="normal"
                        multiline
                        rows={4}
                        required
                    />
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                        >
                            Update Job
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/jobs/manage')}
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

export default EditJob; 