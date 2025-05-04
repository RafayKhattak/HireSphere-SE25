import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface PrivateRouteProps {
    children: React.ReactNode;
    allowedUserTypes: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedUserTypes }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedUserTypes.includes(user?.type || '')) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default PrivateRoute; 