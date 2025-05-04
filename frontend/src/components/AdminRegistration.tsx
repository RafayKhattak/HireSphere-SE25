import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Alert,
    Container,
    CircularProgress
} from '@mui/material';
import axios from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminRegistration: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        secretKey: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            console.log('[AdminRegistration] Submitting admin registration form');
            const response = await axios.post('/auth/register-admin', formData);
            
            console.log('[AdminRegistration] Admin registration successful');
            
            // Login the new admin
            if (response.data.token) {
                await login(response.data.token, response.data.user);
                navigate('/admin/reports');
            }
        } catch (err: any) {
            console.error('[AdminRegistration] Error:', err.response?.data);
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, my: 8 }}>
                <Typography variant="h4" component="h1" align="center" gutterBottom>
                    Admin Registration
                </Typography>
                
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}
                
                <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                        label="Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        required
                    />
                    
                    <TextField
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        required
                    />
                    
                    <TextField
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        required
                    />
                    
                    <TextField
                        label="Secret Key"
                        name="secretKey"
                        type="password"
                        value={formData.secretKey}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        required
                        helperText="You need the secret key to create an admin account"
                    />
                    
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        size="large"
                        sx={{ mt: 3 }}
                        disabled={loading}
                    >
                        {loading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            'Register Admin'
                        )}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default AdminRegistration; 