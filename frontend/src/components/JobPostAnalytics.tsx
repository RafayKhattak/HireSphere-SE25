import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format } from 'date-fns';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PieChartIcon from '@mui/icons-material/PieChart';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WorkIcon from '@mui/icons-material/Work';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { useTheme } from '@mui/material/styles';

interface JobDetails {
  _id: string;
  title: string;
  createdAt: string;
}

interface DailyStats {
  date: string;
  views: number;
  applications: number;
}

interface Demographics {
  locations: Array<{ location: string, count: number }>;
  skills: Array<{ skill: string, count: number }>;
}

interface ViewSources {
  direct: number;
  search: number;
  recommendation: number;
  email: number;
  other: number;
}

interface JobAnalytics {
  job: JobDetails;
  views: number;
  uniqueViews: number;
  applications: number;
  clickThroughs: number;
  viewSources: ViewSources;
  demographics: Demographics;
  dailyStats: DailyStats[];
  lastUpdated: string;
}

// Register the chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const JobPostAnalytics: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [analytics, setAnalytics] = useState<JobAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!jobId) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/employer/jobs/${jobId}/analytics`);
        setAnalytics(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching job analytics:', err);
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.type === 'employer') {
      fetchAnalytics();
    } else {
      setError('Only employers can access analytics');
      setLoading(false);
    }
  }, [jobId, user]);

  const handleBack = () => {
    navigate('/manage-jobs');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const prepareChartData = () => {
    if (!analytics || !analytics.dailyStats || analytics.dailyStats.length === 0) {
      return null;
    }

    // Sort by date ascending
    const sortedStats = [...analytics.dailyStats].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Prepare labels (dates) and datasets
    const labels = sortedStats.map(stat => format(new Date(stat.date), 'MMM d'));
    
    // Create data for line chart
    const lineChartData = {
      labels,
      datasets: [
        {
          label: 'Views',
          data: sortedStats.map(stat => stat.views),
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.primary.light,
          tension: 0.3,
        },
        {
          label: 'Applications',
          data: sortedStats.map(stat => stat.applications),
          borderColor: theme.palette.secondary.main,
          backgroundColor: theme.palette.secondary.light,
          tension: 0.3,
        }
      ],
    };

    // Create data for doughnut chart
    const doughnutChartData = {
      labels: ['Direct', 'Search', 'Recommendation', 'Email', 'Other'],
      datasets: [
        {
          data: [
            analytics.viewSources.direct,
            analytics.viewSources.search,
            analytics.viewSources.recommendation,
            analytics.viewSources.email,
            analytics.viewSources.other
          ],
          backgroundColor: [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            theme.palette.info.main,
            theme.palette.warning.main,
          ],
          borderWidth: 1,
        },
      ],
    };

    return {
      lineChartData,
      doughnutChartData
    };
  };

  // Calculate conversion rates
  const calculateConversionRate = (applications: number, views: number) => {
    if (views === 0) return 0;
    return (applications / views) * 100;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading analytics...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Manage Jobs
        </Button>
      </Container>
    );
  }

  // If no analytics data yet
  if (!analytics || analytics.views === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={handleBack} edge="start" color="inherit" aria-label="back" sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <AssessmentIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
            <Typography variant="h4" component="h1">
              Job Post Analytics
            </Typography>
          </Box>
          
          <Alert severity="info" sx={{ mt: 3 }}>
            No analytics data available yet for this job post. Analytics will appear as your job receives views and applications.
          </Alert>
          
          <Button 
            variant="contained" 
            onClick={handleBack}
            sx={{ mt: 3 }}
          >
            Back to Manage Jobs
          </Button>
        </Paper>
      </Container>
    );
  }

  // Prepare chart data
  const chartData = prepareChartData();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={handleBack} edge="start" color="inherit" aria-label="back" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <AssessmentIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
          <Typography variant="h4" component="h1">
            Job Post Analytics
          </Typography>
        </Box>
        
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Analytics for: {analytics.job?.title || 'Job Post'}
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {/* Analytics Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={3}>
              <CardContent sx={{ textAlign: 'center' }}>
                <VisibilityIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" component="div">
                  {analytics.views}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Views
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={3}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleAltIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h4" component="div">
                  {analytics.uniqueViews}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique Viewers
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={3}>
              <CardContent sx={{ textAlign: 'center' }}>
                <GroupIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" component="div">
                  {analytics.applications}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Applications
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={3}>
              <CardContent sx={{ textAlign: 'center' }}>
                <WorkIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" component="div">
                  {analytics.applications > 0 ? `${calculateConversionRate(analytics.applications, analytics.views).toFixed(1)}%` : '0%'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Application Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Performance Over Time Chart */}
        {chartData && (
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Performance Over Time
              </Typography>
              <Paper elevation={1} sx={{ p: 2, height: 300 }}>
                <Line
                  data={chartData.lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    },
                    plugins: {
                      title: {
                        display: false,
                      },
                      legend: {
                        position: 'top',
                      }
                    },
                  }}
                />
              </Paper>
            </Grid>
          </Grid>
        )}
        
        <Grid container spacing={4}>
          {/* View Sources Chart */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              <PieChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Traffic Sources
            </Typography>
            
            <Paper elevation={1} sx={{ p: 2, height: 300 }}>
              {chartData ? (
                <Doughnut
                  data={chartData.doughnutChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    }
                  }}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography variant="body1" color="text.secondary">
                    No traffic source data available
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Applicant Locations */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              <BarChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Applicant Locations
            </Typography>
            
            {analytics.demographics.locations && analytics.demographics.locations.length > 0 ? (
              <Paper elevation={1} sx={{ p: 2, height: 300 }}>
                <Bar
                  data={{
                    labels: analytics.demographics.locations.slice(0, 5).map(loc => loc.location),
                    datasets: [
                      {
                        label: 'Applicants by Location',
                        data: analytics.demographics.locations.slice(0, 5).map(loc => loc.count),
                        backgroundColor: theme.palette.secondary.main,
                      }
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          precision: 0
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }}
                />
              </Paper>
            ) : (
              <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography variant="body1" color="text.secondary">
                  No location data available yet
                </Typography>
              </Paper>
            )}
          </Grid>
          
          {/* Engagement Metrics */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              <BarChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Engagement Metrics
            </Typography>
            
            <Paper elevation={1} sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5">{analytics.views}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Views</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5">{analytics.uniqueViews}</Typography>
                    <Typography variant="body2" color="text.secondary">Unique Viewers</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5">{analytics.clickThroughs}</Typography>
                    <Typography variant="body2" color="text.secondary">Click-throughs</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5">
                      {analytics.clickThroughs > 0 ? 
                        `${(analytics.applications / analytics.clickThroughs * 100).toFixed(1)}%` : 
                        '0%'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Click-to-Apply Rate</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Skills */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Top Applicant Skills
            </Typography>
            
            {analytics.demographics.skills && analytics.demographics.skills.length > 0 ? (
              <Paper elevation={1} sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {analytics.demographics.skills.slice(0, 10).map((skill, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <Box sx={{ 
                        p: 1, 
                        borderRadius: 1, 
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}>
                        <Typography variant="body2" component="div" sx={{ fontWeight: 'medium' }}>
                          {skill.skill}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {skill.count} applicant{skill.count !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            ) : (
              <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No skills data available yet
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {formatDate(analytics.lastUpdated)}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default JobPostAnalytics; 