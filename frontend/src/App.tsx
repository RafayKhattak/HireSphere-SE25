import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import JobList from './components/JobList';
import JobDetails from './components/JobDetails';
import PostJob from './components/PostJob';
import ManageJobs from './components/ManageJobs';
import EditJob from './components/EditJob';
import JobApplicationForm from './components/JobApplicationForm';
import AboutUs from './components/AboutUs';
import UserProfile from './components/UserProfile';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import PrivateRoute from './components/PrivateRoute';
import BookmarkedJobs from './components/BookmarkedJobs';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1a237e',
            light: '#534bae',
            dark: '#000051',
        },
        secondary: {
            main: '#ffa726',
            light: '#ffd95b',
            dark: '#c77800',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
        },
        h2: {
            fontWeight: 700,
        },
        h3: {
            fontWeight: 700,
        },
        h4: {
            fontWeight: 700,
        },
        h5: {
            fontWeight: 700,
        },
        h6: {
            fontWeight: 700,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                    padding: '8px 24px',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                },
            },
        },
    },
});

const App: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
                <Router>
                    <Navigation />
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/about" element={<AboutUs />} />
                        <Route
                            path="/login"
                            element={
                                <Layout>
                                    <LoginForm />
                                </Layout>
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                <Layout>
                                    <RegisterForm />
                                </Layout>
                            }
                        />
                        <Route
                            path="/jobs"
                            element={
                                <Layout>
                                    <JobList />
                                </Layout>
                            }
                        />
                        <Route
                            path="/jobs/bookmarks"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <BookmarkedJobs />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobs/:id"
                            element={
                                <Layout>
                                    <JobDetails />
                                </Layout>
                            }
                        />
                        <Route
                            path="/jobs/post"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <PostJob />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobs/manage"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <ManageJobs />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobs/edit/:id"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <EditJob />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobs/:id/apply"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <JobApplicationForm />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route path="/profile" element={<Layout><UserProfile /></Layout>} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
