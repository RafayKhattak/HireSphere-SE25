import React, { useEffect, useState } from 'react';
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
    CircularProgress
} from '@mui/material';
import { jobService, applicationService } from '../services/api';
import { Job } from '../types';

const validationSchema = yup.object({
    coverLetter: yup
        .string()
        .required('Cover letter is required')
        .min(100, 'Cover letter must be at least 100 characters'),
    resume: yup
        .string()
        .required('Resume is required')
        .url('Please enter a valid URL')
});

const JobApplicationForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [job, setJob] = useState<Job | null>(null);

    useEffect(() => {
        if (id) {
            fetchJobDetails(id);
        }
    }, [id]);

    const fetchJobDetails = async (jobId: string) => {
        try {
            const data = await jobService.getJobById(jobId);
            setJob(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    };

    const formik = useFormik({
        initialValues: {
            coverLetter: '',
            resume: ''
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            if (!id) return;
            try {
                await applicationService.applyForJob(id, values);
                navigate(`/jobs/${id}`);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to submit application');
            }
        },
    });

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
                    Apply for {job.title}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary" gutterBottom align="center">
                    {typeof job.employer === 'object' ? job.employer.companyName : 'Company Name'}
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
                                id="coverLetter"
                                name="coverLetter"
                                label="Cover Letter"
                                multiline
                                rows={6}
                                value={formik.values.coverLetter}
                                onChange={formik.handleChange}
                                error={formik.touched.coverLetter && Boolean(formik.errors.coverLetter)}
                                helperText={formik.touched.coverLetter && formik.errors.coverLetter}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                id="resume"
                                name="resume"
                                label="Resume URL"
                                value={formik.values.resume}
                                onChange={formik.handleChange}
                                error={formik.touched.resume && Boolean(formik.errors.resume)}
                                helperText={formik.touched.resume && formik.errors.resume}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ flex: 1 }}
                        >
                            Submit Application
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

export default JobApplicationForm; 