import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Paper,
  Box,
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
import { jobService } from '../services/api';

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
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!jobId) return;
      
      console.log(`[JobAnalytics] Fetching analytics for job ID: ${jobId}`);
      try {
        setLoading(true);
        const response = await jobService.getJobAnalytics(jobId);
        console.log(`[JobAnalytics] Successfully retrieved analytics data:`, response);
        
        // Log key metrics
        if (response) {
          console.log(`[JobAnalytics] Key metrics - Views: ${response.views}, Applications: ${response.applications}`);
          
          if (response.dailyStats && response.dailyStats.length > 0) {
            console.log(`[JobAnalytics] Daily stats available for ${response.dailyStats.length} days`);
          }
          
          if (response.demographics) {
            const locationsCount = response.demographics.locations?.length || 0;
            const skillsCount = response.demographics.skills?.length || 0;
            console.log(`[JobAnalytics] Demographics - ${locationsCount} locations, ${skillsCount} skills recorded`);
          }
        }
        
        setAnalytics(response);
        setError(null);
      } catch (err: any) {
        console.error('[JobAnalytics] Error fetching job analytics:', err);
        console.error('[JobAnalytics] Error details:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
        console.log('[JobAnalytics] Completed loading process');
      }
    };

    if (user && user.type === 'employer') {
      console.log('[JobAnalytics] Authorized employer accessing analytics');
      fetchAnalytics();
    } else {
      console.warn('[JobAnalytics] Unauthorized access attempt - user type:', user?.type);
      setError('Only employers can access analytics');
      setLoading(false);
    }
  }, [jobId, user]);

  const handleBack = () => {
    console.log('[JobAnalytics] Navigating back to manage jobs');
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
            analytics.viewSources?.direct || 0,
            analytics.viewSources?.search || 0,
            analytics.viewSources?.recommendation || 0,
            analytics.viewSources?.email || 0,
            analytics.viewSources?.other || 0
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
    console.log('[JobAnalytics] Rendering loading state');
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
    console.log(`[JobAnalytics] Rendering error state: ${error}`);
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
    console.log('[JobAnalytics] No analytics data available yet');
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

  // Log when rendering the full analytics view
  console.log('[JobAnalytics] Rendering full analytics dashboard');

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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5), mb: 4 }}>
          <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '25%' } }}>
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
          </Box>
          
          <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '25%' } }}>
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
          </Box>
          
          <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '25%' } }}>
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
          </Box>
          
          <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '25%' } }}>
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
          </Box>
        </Box>
        
        {/* Performance Over Time Chart */}
        {chartData && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ width: '100%' }}>
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
            </Box>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-2) }}>
          {/* View Sources Chart */}
          <Box sx={{ padding: theme => theme.spacing(2), width: { xs: '100%', md: '50%' } }}>
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
          </Box>
          
          {/* Applicant Locations */}
          <Box sx={{ padding: theme => theme.spacing(2), width: { xs: '100%', md: '50%' } }}>
            <Typography variant="h6" gutterBottom>
              <BarChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Applicant Locations
            </Typography>
            
            {analytics.demographics && analytics.demographics.locations && analytics.demographics.locations.length > 0 ? (
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
          </Box>
          
          {/* Engagement Metrics */}
          <Box sx={{ padding: theme => theme.spacing(2), width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <BarChartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Engagement Metrics
            </Typography>
            
            <Paper elevation={1} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1) }}>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '50%', sm: '25%' } }}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5">{analytics.views}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Views</Typography>
                  </Box>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '50%', sm: '25%' } }}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5">{analytics.uniqueViews}</Typography>
                    <Typography variant="body2" color="text.secondary">Unique Viewers</Typography>
                  </Box>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '50%', sm: '25%' } }}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5">{analytics.clickThroughs}</Typography>
                    <Typography variant="body2" color="text.secondary">Click-throughs</Typography>
                  </Box>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '50%', sm: '25%' } }}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h5">
                      {analytics.clickThroughs > 0 ? 
                        `${(analytics.applications / analytics.clickThroughs * 100).toFixed(1)}%` : 
                        '0%'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Click-to-Apply Rate</Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
          
          {/* Skills */}
          <Box sx={{ padding: theme => theme.spacing(2), width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Top Applicant Skills
            </Typography>
            
            {analytics.demographics && analytics.demographics.skills && analytics.demographics.skills.length > 0 ? (
              <Paper elevation={1} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1) }}>
                  {analytics.demographics.skills.slice(0, 10).map((skill, index) => (
                    <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '50%', sm: '33.33%', md: '25%' } }} key={index}>
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
                    </Box>
                  ))}
                </Box>
              </Paper>
            ) : (
              <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No skills data available yet
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
        
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