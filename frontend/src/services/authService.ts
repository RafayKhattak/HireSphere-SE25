import axios from 'axios';
import { User } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const authService = {
    async register(userData: {
        name: string;
        email: string;
        password: string;
        type: string;
    }): Promise<{ token: string; user: User }> {
        try {
            console.log('Attempting to register user:', { email: userData.email, type: userData.type });
            const response = await axios.post(`${API_URL}/auth/register`, userData);
            console.log('Registration successful:', response.data);
            return response.data;
        } catch (error) {
            console.error('Registration failed:', error);
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.message || 'Registration failed');
            }
            throw error;
        }
    },

    async login(credentials: { email: string; password: string }): Promise<{ token: string; user: User }> {
        try {
            console.log('Attempting to login user:', credentials.email);
            const response = await axios.post(`${API_URL}/auth/login`, credentials);
            console.log('Login successful:', response.data);
            return response.data;
        } catch (error) {
            console.error('Login failed:', error);
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.message || 'Login failed');
            }
            throw error;
        }
    },

    async getCurrentUser(): Promise<User> {
        try {
            console.log('Fetching current user profile');
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found in localStorage');
                throw new Error('No authentication token found');
            }

            const response = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Current user profile fetched:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.message || 'Failed to fetch user profile');
            }
            throw error;
        }
    },

    logout(): void {
        console.log('Logging out user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

export default authService; 