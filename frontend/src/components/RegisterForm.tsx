import React from 'react';
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    RadioGroup,
    FormLabel,
    Radio
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const validationSchema = yup.object({
    email: yup
        .string()
        .email('Enter a valid email')
        .required('Email is required'),
    password: yup
        .string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
    type: yup
        .string()
        .oneOf(['jobseeker', 'employer'], 'Invalid user type')
        .required('User type is required'),
    name: yup
        .string()
        .required('Name is required'),
    firstName: yup.string().when('type', {
        is: (val: string) => val === 'jobseeker',
        then: (schema) => schema.required('First name is required for job seekers'),
        otherwise: (schema) => schema
    }),
    lastName: yup.string().when('type', {
        is: (val: string) => val === 'jobseeker',
        then: (schema) => schema.required('Last name is required for job seekers'),
        otherwise: (schema) => schema
    }),
    companyName: yup.string().when('type', {
        is: (val: string) => val === 'employer',
        then: (schema) => schema.required('Company name is required for employers'),
        otherwise: (schema) => schema
    }),
    companyDescription: yup.string().when('type', {
        is: (val: string) => val === 'employer',
        then: (schema) => schema.required('Company description is required for employers'),
        otherwise: (schema) => schema
    }),
    phone: yup.string(),
    location: yup.string()
});

const RegisterForm: React.FC = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [error, setError] = React.useState<string>('');

    const formik = useFormik({
        initialValues: {
            email: '',
            password: '',
            type: '',
            name: '',
            firstName: '',
            lastName: '',
            companyName: '',
            companyDescription: '',
            phone: '',
            location: ''
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                await register(values);
                navigate('/jobs');
            } catch (err: any) {
                setError(err.response?.data?.message || 'An error occurred during registration');
            }
        },
    });

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
                    maxWidth: 600,
                }}
            >
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Register for HireSphere
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <form onSubmit={formik.handleSubmit}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
                        <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
                            <TextField
                                fullWidth
                                id="email"
                                name="email"
                                label="Email"
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                error={formik.touched.email && Boolean(formik.errors.email)}
                                helperText={formik.touched.email && formik.errors.email}
                            />
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
                            <TextField
                                fullWidth
                                id="password"
                                name="password"
                                label="Password"
                                type="password"
                                value={formik.values.password}
                                onChange={formik.handleChange}
                                error={formik.touched.password && Boolean(formik.errors.password)}
                                helperText={formik.touched.password && formik.errors.password}
                            />
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
                            <FormControl component="fieldset">
                                <FormLabel component="legend">Register As</FormLabel>
                                <RadioGroup
                                    row
                                    name="type"
                                    value={formik.values.type}
                                    onChange={formik.handleChange}
                                >
                                    <FormControlLabel value="jobseeker" control={<Radio />} label="Job Seeker" />
                                    <FormControlLabel value="employer" control={<Radio />} label="Employer" />
                                </RadioGroup>
                            </FormControl>
                        </Box>

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
                            <TextField
                                fullWidth
                                id="name"
                                name="name"
                                label="Full Name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                error={formik.touched.name && Boolean(formik.errors.name)}
                                helperText={formik.touched.name && formik.errors.name}
                            />
                        </Box>

                        {formik.values.type === 'jobseeker' && (
                            <>
                                <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%' } }}>
                                    <TextField
                                        fullWidth
                                        id="firstName"
                                        name="firstName"
                                        label="First Name"
                                        value={formik.values.firstName}
                                        onChange={formik.handleChange}
                                        error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                                        helperText={formik.touched.firstName && formik.errors.firstName}
                                    />
                                </Box>
                                <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%' } }}>
                                    <TextField
                                        fullWidth
                                        id="lastName"
                                        name="lastName"
                                        label="Last Name"
                                        value={formik.values.lastName}
                                        onChange={formik.handleChange}
                                        error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                                        helperText={formik.touched.lastName && formik.errors.lastName}
                                    />
                                </Box>
                            </>
                        )}

                        {formik.values.type === 'employer' && (
                            <>
                                <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
                                    <TextField
                                        fullWidth
                                        id="companyName"
                                        name="companyName"
                                        label="Company Name"
                                        value={formik.values.companyName}
                                        onChange={formik.handleChange}
                                        error={formik.touched.companyName && Boolean(formik.errors.companyName)}
                                        helperText={formik.touched.companyName && formik.errors.companyName}
                                    />
                                </Box>
                                <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
                                    <TextField
                                        fullWidth
                                        id="companyDescription"
                                        name="companyDescription"
                                        label="Company Description"
                                        multiline
                                        rows={3}
                                        value={formik.values.companyDescription}
                                        onChange={formik.handleChange}
                                        error={formik.touched.companyDescription && Boolean(formik.errors.companyDescription)}
                                        helperText={formik.touched.companyDescription && formik.errors.companyDescription}
                                    />
                                </Box>
                            </>
                        )}

                        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%' } }}>
                            <TextField
                                fullWidth
                                id="phone"
                                name="phone"
                                label="Phone"
                                value={formik.values.phone}
                                onChange={formik.handleChange}
                                error={formik.touched.phone && Boolean(formik.errors.phone)}
                                helperText={formik.touched.phone && formik.errors.phone}
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
                    </Box>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Register
                    </Button>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2">
                            Already have an account?{' '}
                            <Button
                                color="primary"
                                onClick={() => navigate('/login')}
                            >
                                Login
                            </Button>
                        </Typography>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default RegisterForm; 