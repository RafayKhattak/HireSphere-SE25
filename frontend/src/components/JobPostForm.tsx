import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
    CircularProgress
} from '@mui/material';
import { jobService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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
    const [error, setError] = React.useState<string>('');
    const [loading, setLoading] = React.useState<boolean>(true);
    const [companyName, setCompanyName] = React.useState<string>('');

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

    const formik = useFormik({
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
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - 200px)',
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 800,
                }}
            >
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Post a New Job
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                    Your company name will be automatically added to the job posting from your profile.
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <form onSubmit={formik.handleSubmit}>
                    <Grid container spacing={2}>
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
                                rows={6}
                                placeholder="Enter detailed job description. Use line breaks for better formatting."
                                value={formik.values.description}
                                onChange={formik.handleChange}
                                error={formik.touched.description && Boolean(formik.errors.description)}
                                helperText={(formik.touched.description && formik.errors.description) || "Use line breaks to separate paragraphs. This will be displayed with proper formatting."}
                            />
                        </Grid>
                        <Grid item xs={12}>
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
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                                }}
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
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                id="salary.currency"
                                name="salary.currency"
                                label="Currency"
                                select
                                value={formik.values.salary.currency}
                                onChange={formik.handleChange}
                                error={formik.touched.salary?.currency && Boolean(formik.errors.salary?.currency)}
                                helperText={formik.touched.salary?.currency && formik.errors.salary?.currency}
                            >
                                <MenuItem value="PKR">Pakistani Rupee (PKR)</MenuItem>
                                <MenuItem value="USD">US Dollar (USD)</MenuItem>
                                <MenuItem value="EUR">Euro (EUR)</MenuItem>
                                <MenuItem value="GBP">British Pound (GBP)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
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
                    </Grid>

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ flex: 1 }}
                        >
                            Post Job
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
        </Box>
    );
};

export default JobPostForm; 