import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Alert
} from '@mui/material';
import ReportIcon from '@mui/icons-material/Report';
import PeopleIcon from '@mui/icons-material/People';
import WorkIcon from '@mui/icons-material/Work';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/api';

type DashboardStats = {
  reports: {
    total: number;
    pending: number;
    resolved: number;
  };
  users: {
    total: number;
    jobseekers: number;
    employers: number;
  };
  jobs: {
    total: number;
    active: number;
    reported: number;
  };
};

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    reports: { total: 0, pending: 0, resolved: 0 },
    users: { total: 0, jobseekers: 0, employers: 0 },
    jobs: { total: 0, active: 0, reported: 0 }
  });

  useEffect(() => {
    // Check if user is admin, redirect if not
    if (user && user.type !== 'admin') {
      navigate('/dashboard');
    }

    // Fetch dashboard statistics
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Get report statistics
        const reportStats = await reportService.getReportStatistics();
        
        // For now, we'll just use report stats
        // In a real implementation, you would fetch user and job stats too
        setStats({
          reports: {
            total: reportStats.total || 0,
            pending: reportStats.byStatus?.pending || 0,
            resolved: (reportStats.byStatus?.approved || 0) + (reportStats.byStatus?.rejected || 0)
          },
          users: { total: 0, jobseekers: 0, employers: 0 },
          jobs: { total: 0, active: 0, reported: 0 }
        });
      } catch (err: any) {
        console.error('Error fetching admin dashboard stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, navigate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Overview
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* Reports Card */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <ReportIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">Reports</Typography>
                </Box>
                <Typography variant="h3" color="primary">
                  {stats.reports.total}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body1">
                    Pending: {stats.reports.pending}
                  </Typography>
                  <Typography variant="body1">
                    Resolved: {stats.reports.resolved}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Users Card */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Users</Typography>
                </Box>
                <Typography variant="h3" color="primary">
                  {stats.users.total}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body1">
                    Job Seekers: {stats.users.jobseekers}
                  </Typography>
                  <Typography variant="body1">
                    Employers: {stats.users.employers}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Jobs Card */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <WorkIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Jobs</Typography>
                </Box>
                <Typography variant="h3" color="primary">
                  {stats.jobs.total}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body1">
                    Active: {stats.jobs.active}
                  </Typography>
                  <Typography variant="body1">
                    Reported: {stats.jobs.reported}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Admin Tools
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                size="large"
                startIcon={<ReportIcon />}
                onClick={() => navigate('/admin/reports')}
              >
                Report Management
              </Button>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                fullWidth 
                size="large"
                startIcon={<PeopleIcon />}
                onClick={() => navigate('/admin/users')}
                disabled
              >
                User Management (Coming Soon)
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      <Box>
        <Typography variant="h5" gutterBottom>
          Recent Activity
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="textSecondary" align="center">
            Activity log will be available in future updates.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default AdminDashboard; 