import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    CircularProgress,
    Alert,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Box,
    FormHelperText,
    useTheme,
    InputAdornment
} from '@mui/material';
import { jobService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { JobFormData } from '../types';

const validationSchema = yup.object({
    title: yup
        .string()
        .required('Job title is required'),
    description: yup
        .string()
        .required('Job description is required'),
    requirements: yup
        .string()
        .required('Job requirements are required'),
    salary: yup.object({
        min: yup
            .number()
            .required('Minimum salary is required')
            .min(0, 'Minimum salary must be positive'),
        max: yup
            .number()
            .required('Maximum salary is required')
            .min(0, 'Maximum salary must be positive')
            .test('max-greater-than-min', 'Maximum salary must be greater than minimum salary', function(value) {
                return value > this.parent.min;
            }),
        currency: yup
            .string()
            .required('Currency is required')
    }),
    location: yup
        .string()
        .required('Location is required'),
    type: yup
        .string()
        .oneOf(['full-time', 'part-time', 'contract', 'internship'], 'Invalid job type')
        .required('Job type is required')
});

const JobPostForm: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [companyName, setCompanyName] = React.useState<string>('');
    const theme = useTheme();

    useEffect(() => {
        const fetchEmployerProfile = async () => {
            try {
                setLoading(true);
                const response = await api.get('/employer/profile');
                setCompanyName(response.data.companyName || '');
            } catch (err: any) {
                console.error('Error fetching employer profile:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user && user.type === 'employer') {
            fetchEmployerProfile();
        } else {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const formik = useFormik<JobFormData>({
        initialValues: {
            title: '',
            company: companyName,
            description: '',
            requirements: '',
            salary: {
                min: 0,
                max: 0,
                currency: 'PKR'
            },
            location: '',
            type: 'full-time' as const
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                await jobService.createJob({
                    ...values,
                    company: companyName
                });
                navigate('/jobs');
            } catch (err: any) {
                setError(err.response?.data?.message || 'An error occurred while posting the job');
            }
        },
    });

    useEffect(() => {
        if (companyName) {
            formik.setFieldValue('company', companyName);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyName]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>Post a New Job</Typography>
                
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
                                id="company"
                                name="company"
                                label="Company"
                                value={formik.values.company}
                                onChange={formik.handleChange}
                                error={formik.touched.company && Boolean(formik.errors.company)}
                                helperText={(formik.touched.company && formik.errors.company) || "Company name is automatically set from your profile"}
                                disabled={true}
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
                                placeholder="Enter detailed job description. Use line breaks for better formatting."
                                value={formik.values.description}
                                onChange={formik.handleChange}
                                error={formik.touched.description && Boolean(formik.errors.description)}
                                helperText={(formik.touched.description && formik.errors.description) || "Use line breaks to separate paragraphs. This will be displayed with proper formatting."}
                            />
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
                            <TextField
                                fullWidth
                                id="requirements"
                                name="requirements"
                                label="Job Requirements"
                                multiline
                                rows={6}
                                placeholder="Enter job requirements. Use a new line for each requirement for better formatting."
                                value={formik.values.requirements}
                                onChange={formik.handleChange}
                                error={formik.touched.requirements && Boolean(formik.errors.requirements)}
                                helperText={(formik.touched.requirements && formik.errors.requirements) || "Consider adding each requirement on a new line for a cleaner appearance."}
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
                                    onChange={formik.handleChange}
                                    error={formik.touched.type && Boolean(formik.errors.type)}
                                    label="Job Type"
                                >
                                    <MenuItem value="full-time">Full Time</MenuItem>
                                    <MenuItem value="part-time">Part Time</MenuItem>
                                    <MenuItem value="contract">Contract</MenuItem>
                                    <MenuItem value="internship">Internship</MenuItem>
                                </Select>
                                {formik.touched.type && formik.errors.type && (
                                    <Typography color="error" variant="caption">
                                        {formik.errors.type}
                                    </Typography>
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
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                                }}
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
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                                }}
                            />
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '33.33%' } }}>
                            <FormControl fullWidth error={formik.touched.salary?.currency && Boolean(formik.errors.salary?.currency)}>
                                <InputLabel id="salary-currency-label">Currency</InputLabel>
                                <Select
                                    labelId="salary-currency-label"
                                    id="salary.currency"
                                    name="salary.currency"
                                    value={formik.values.salary.currency}
                                    onChange={formik.handleChange}
                                    error={formik.touched.salary?.currency && Boolean(formik.errors.salary?.currency)}
                                    label="Currency"
                                >
                                    <MenuItem value="PKR">Pakistani Rupee (PKR)</MenuItem>
                                    <MenuItem value="USD">US Dollar (USD)</MenuItem>
                                    <MenuItem value="EUR">Euro (EUR)</MenuItem>
                                    <MenuItem value="GBP">British Pound (GBP)</MenuItem>
                                </Select>
                                {formik.touched.salary?.currency && formik.errors.salary?.currency && (
                                    <FormHelperText error>{formik.errors.salary?.currency}</FormHelperText>
                                )}
                            </FormControl>
                        </Box>
                    </Box>

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ flex: 1 }}
                        >
                            {loading ? 'Posting...' : 'Post Job'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/jobs')}
                            sx={{ flex: 1 }}
                        >
                            Cancel
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
};

export default JobPostForm; 