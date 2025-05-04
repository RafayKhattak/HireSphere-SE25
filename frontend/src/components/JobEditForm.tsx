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
    CircularProgress,
    MenuItem,
    InputAdornment,
    Container,
    FormControl,
    InputLabel,
    FormHelperText,
    Select,
    useTheme
} from '@mui/material';
import { jobService } from '../services/api';
import { Job, JobFormData } from '../types';

const validationSchema = yup.object({
    title: yup.string().required('Title is required'),
    company: yup.string().required('Company name is required'),
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
    const theme = useTheme();

    const formik = useFormik<JobFormData>({
        initialValues: {
            title: '',
            company: '',
            description: '',
            requirements: '',
            salary: {
                min: 0,
                max: 0,
                currency: 'PKR'
            },
            location: '',
            type: 'full-time'
        } as JobFormData,
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
        enableReinitialize: true,
    });

    const fetchJobDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobService.getJobById(id!);
            formik.setValues({
                title: response.title,
                company: response.company || '',
                description: response.description,
                requirements: response.requirements,
                salary: {
                    min: response.salary.min,
                    max: response.salary.max,
                    currency: response.salary.currency || 'PKR'
                },
                location: response.location,
                type: response.type
            } as JobFormData);
        } catch (error: any) {
            console.error('Error fetching job details:', error);
            setError(error.response?.data?.message || 'Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    }, [id, formik]);

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
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>Edit Job</Typography>
                
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <form onSubmit={formik.handleSubmit}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}> 
                        <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}> 
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
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}> 
                            <TextField
                                fullWidth
                                id="description"
                                name="description"
                                label="Job Description"
                                multiline
                                rows={6}
                                value={formik.values.description}
                                onChange={formik.handleChange}
                                error={formik.touched.description && Boolean(formik.errors.description)}
                                helperText={formik.touched.description && formik.errors.description}
                            />
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}> 
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
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%' } }}> 
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
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%' } }}> 
                            <FormControl fullWidth error={formik.touched.type && Boolean(formik.errors.type)}>
                                <InputLabel id="type-label">Job Type</InputLabel>
                                <Select
                                    labelId="type-label"
                                    id="type"
                                    name="type"
                                    value={formik.values.type}
                                    label="Job Type"
                                    onChange={formik.handleChange}
                                >
                                    <MenuItem value="full-time">Full-time</MenuItem>
                                    <MenuItem value="part-time">Part-time</MenuItem>
                                    <MenuItem value="contract">Contract</MenuItem>
                                    <MenuItem value="internship">Internship</MenuItem>
                                </Select>
                                {formik.touched.type && formik.errors.type && (
                                    <FormHelperText>{formik.errors.type}</FormHelperText>
                                )}
                            </FormControl>
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '33.33%' } }}> 
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
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '33.33%' } }}> 
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
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '33.33%' } }}> 
                            <FormControl fullWidth error={formik.touched.salary?.currency && Boolean(formik.errors.salary?.currency)}>
                                <InputLabel id="currency-label">Currency</InputLabel>
                                <Select
                                    labelId="currency-label"
                                    id="salary.currency"
                                    name="salary.currency"
                                    value={formik.values.salary.currency}
                                    label="Currency"
                                    onChange={formik.handleChange}
                                >
                                    <MenuItem value="USD">USD</MenuItem>
                                    <MenuItem value="EUR">EUR</MenuItem>
                                    <MenuItem value="GBP">GBP</MenuItem>
                                    <MenuItem value="PKR">PKR</MenuItem>
                                </Select>
                                {formik.touched.salary?.currency && formik.errors.salary?.currency && (
                                    <FormHelperText>{formik.errors.salary.currency}</FormHelperText>
                                )}
                            </FormControl>
                        </Box>
                    </Box> 

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={formik.isSubmitting}
                            startIcon={formik.isSubmitting && <CircularProgress size={20} />}
                        >
                            {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(`/jobs/${id}`)}
                            disabled={formik.isSubmitting}
                        >
                            Cancel
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
};

export default JobEditForm; 