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
import Conversations from './components/Conversations';
import Chat from './components/Chat';
import EmployerProfile from './components/EmployerProfile';
import JobPostAnalytics from './components/JobPostAnalytics';
import JobAlerts from './components/JobAlerts';
import JobRecommendations from './components/JobRecommendations';
import ApplicationTracking from './components/ApplicationTracking';
import EmployerPersonalProfile from './components/EmployerPersonalProfile';
import JobSeekerProfile from './components/JobSeekerProfile';
import JobApplications from './components/JobApplications';
import CandidateSearch from './components/CandidateSearch';
import BrowseJobsPage from './pages/BrowseJobsPage';
import SkillAssessments from './components/SkillAssessments';
import SkillAssessmentDetails from './components/SkillAssessmentDetails';
import SalaryInsights from './components/SalaryInsights';
import CompanyProfile from './components/CompanyProfile';
import EmployerInterviews from './components/EmployerInterviews';
import JobSeekerInterviews from './components/JobSeekerInterviews';

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
                                    <BrowseJobsPage />
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

                        {/* New Routes for Chat (Sprint 2) */}
                        <Route
                            path="/messages"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker', 'employer']}>
                                    <Layout>
                                        <Conversations />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/messages/:userId"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker', 'employer']}>
                                    <Layout>
                                        <Chat />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        
                        {/* Employer Routes */}
                        <Route
                            path="/employer/profile"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <EmployerProfile />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/employer/interviews"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <EmployerInterviews />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/employer/personal-profile"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <EmployerPersonalProfile />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobs/:jobId/analytics"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <JobPostAnalytics />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobs/:id/applications"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <JobApplications />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/employer/candidates"
                            element={
                                <PrivateRoute allowedUserTypes={['employer']}>
                                    <Layout>
                                        <CandidateSearch />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        
                        {/* Job Seeker Routes */}
                        <Route
                            path="/job-alerts"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <JobAlerts />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/assessments"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <SkillAssessments />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/assessments/:id"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <SkillAssessmentDetails />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/recommendations"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <JobRecommendations />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobseeker/interviews"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <JobSeekerInterviews />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobseeker/profile"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <JobSeekerProfile />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobseeker/applications"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <ApplicationTracking />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobseeker/job-alerts"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <JobAlerts />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobseeker/recommendations"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <JobRecommendations />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/jobseeker/salary-insights"
                            element={
                                <PrivateRoute allowedUserTypes={['jobseeker']}>
                                    <Layout>
                                        <SalaryInsights />
                                    </Layout>
                                </PrivateRoute>
                            }
                        />

                        {/* Public company profile */}
                        <Route
                            path="/company/:employerId"
                            element={
                                <Layout>
                                    <CompanyProfile />
                                </Layout>
                            }
                        />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
