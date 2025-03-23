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
    Link
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const validationSchema = yup.object({
    email: yup
        .string()
        .email('Enter a valid email')
        .required('Email is required'),
    password: yup
        .string()
        .required('Password is required'),
});

const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = React.useState<string>('');

    const formik = useFormik({
        initialValues: {
            email: '',
            password: '',
        },
        validationSchema: validationSchema,
        onSubmit: async (values) => {
            try {
                await login(values.email, values.password);
                navigate('/jobs');
            } catch (err: any) {
                setError(err.response?.data?.message || 'An error occurred during login');
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
                    maxWidth: 400,
                }}
            >
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Login to HireSphere
                </Typography>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <form onSubmit={formik.handleSubmit}>
                    <TextField
                        fullWidth
                        id="email"
                        name="email"
                        label="Email"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        error={formik.touched.email && Boolean(formik.errors.email)}
                        helperText={formik.touched.email && formik.errors.email}
                        margin="normal"
                    />
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
                        margin="normal"
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Login
                    </Button>
                    <Box sx={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Typography color="text.secondary" component="span">
                            Don't have an
                        </Typography>
                        <Link 
                            component="button"
                            onClick={() => navigate('/register')}
                            sx={{ color: '#1a237e', textDecoration: 'none' }}
                        >
                            account?
                        </Link>
                        <Typography color="text.secondary" component="span">
                            |
                        </Typography>
                        <Link 
                            component="button"
                            onClick={() => navigate('/forgot-password')}
                            sx={{ color: '#1a237e', textDecoration: 'none' }}
                        >
                            Forgot Password?
                        </Link>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default LoginForm; 