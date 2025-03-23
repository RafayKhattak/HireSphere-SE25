import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Link
} from '@mui/material';
import { authService } from '../services/api';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await authService.login({ email, password });
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Login to HireSphere
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        margin="normal"
                        required
                        disabled={loading}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                        required
                        disabled={loading}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{ mt: 3, bgcolor: '#1a237e', '&:hover': { bgcolor: '#0d47a1' } }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Login'}
                    </Button>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Typography color="text.secondary" component="span">
                            Don't
                        </Typography>
                        <Typography color="text.secondary" component="span">
                            have an
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
                </Box>
            </Paper>
        </Container>
    );
};

export default Login; 