import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Alert,
    Grid,
    CircularProgress,
    MenuItem
} from '@mui/material';
import { jobService } from '../services/api';
import { Job, JobFormData } from '../types';

const validationSchema = yup.object({
    title: yup.string().required('Title is required'),
    description: yup.string().required('Description is required'),
    requirements: yup.string().required('Requirements are required'),
    salary: yup.object({
        min: yup.number().required('Minimum salary is required').min(0, 'Salary must be positive'),
        max: yup.number().required('Maximum salary is required').min(0, 'Salary must be positive'),
        currency: yup.string().required('Currency is required')
    }),
    location: yup.string().required('Location is required'),
    type: yup.string().oneOf(['full-time', 'part-time', 'contract', 'internship'], 'Invalid job type').required('Job type is required')
});

const JobEditForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formik = useFormik<JobFormData>({
        initialValues: {
            title: '',
            description: '',
            requirements: '',
            salary: {
                min: 0,
                max: 0,
                currency: 'USD'
            },
            location: '',
            type: 'full-time'
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            if (!id) return;
            try {
                setLoading(true);
                setError(null);
                await jobService.updateJob(id, values);
                navigate(`/jobs/${id}`);
            } catch (err: any) {
                console.error('Error updating job:', err);
                setError(err.response?.data?.message || 'Failed to update job');
            } finally {
                setLoading(false);
            }
        },
    });

    const fetchJobDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobService.getJobById(id!);
            formik.setValues({
                title: response.title,
                description: response.description,
                requirements: response.requirements,
                salary: response.salary,
                location: response.location,
                type: response.type
            });
        } catch (error: any) {
            console.error('Error fetching job details:', error);
            setError(error.response?.data?.message || 'Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchJobDetails();
    }, [fetchJobDetails]);

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
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Edit Job
                </Typography>

                <form onSubmit={formik.handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                id="title"
                                name="title"
                                label="Job Title"
                                value={formik.values.title}
                                onChange={formik.handleChange}
                                error={formik.touched.title && Boolean(formik.errors.title)}
                                helperText={formik.touched.title && formik.errors.title}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                id="description"
                                name="description"
                                label="Job Description"
                                multiline
                                rows={4}
                                value={formik.values.description}
                                onChange={formik.handleChange}
                                error={formik.touched.description && Boolean(formik.errors.description)}
                                helperText={formik.touched.description && formik.errors.description}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                id="requirements"
                                name="requirements"
                                label="Requirements"
                                multiline
                                rows={4}
                                value={formik.values.requirements}
                                onChange={formik.handleChange}
                                error={formik.touched.requirements && Boolean(formik.errors.requirements)}
                                helperText={formik.touched.requirements && formik.errors.requirements}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                id="salary.min"
                                name="salary.min"
                                label="Minimum Salary"
                                type="number"
                                value={formik.values.salary.min}
                                onChange={formik.handleChange}
                                error={formik.touched.salary?.min && Boolean(formik.errors.salary?.min)}
                                helperText={formik.touched.salary?.min && formik.errors.salary?.min}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                id="salary.max"
                                name="salary.max"
                                label="Maximum Salary"
                                type="number"
                                value={formik.values.salary.max}
                                onChange={formik.handleChange}
                                error={formik.touched.salary?.max && Boolean(formik.errors.salary?.max)}
                                helperText={formik.touched.salary?.max && formik.errors.salary?.max}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                id="salary.currency"
                                name="salary.currency"
                                label="Currency"
                                value={formik.values.salary.currency}
                                onChange={formik.handleChange}
                                error={formik.touched.salary?.currency && Boolean(formik.errors.salary?.currency)}
                                helperText={formik.touched.salary?.currency && formik.errors.salary?.currency}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                id="location"
                                name="location"
                                label="Location"
                                value={formik.values.location}
                                onChange={formik.handleChange}
                                error={formik.touched.location && Boolean(formik.errors.location)}
                                helperText={formik.touched.location && formik.errors.location}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                id="type"
                                name="type"
                                label="Job Type"
                                select
                                value={formik.values.type}
                                onChange={formik.handleChange}
                                error={formik.touched.type && Boolean(formik.errors.type)}
                                helperText={formik.touched.type && formik.errors.type}
                            >
                                <MenuItem value="full-time">Full Time</MenuItem>
                                <MenuItem value="part-time">Part Time</MenuItem>
                                <MenuItem value="contract">Contract</MenuItem>
                                <MenuItem value="internship">Internship</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ flex: 1 }}
                        >
                            Update Job
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(`/jobs/${id}`)}
                            sx={{ flex: 1 }}
                        >
                            Cancel
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default JobEditForm; 