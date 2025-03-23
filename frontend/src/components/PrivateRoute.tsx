import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
    children: React.ReactNode;
    allowedUserTypes: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedUserTypes }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (!allowedUserTypes.includes(user?.type || '')) {
        return <Navigate to="/" />;
    }

    return <>{children}</>;
};

export default PrivateRoute; 