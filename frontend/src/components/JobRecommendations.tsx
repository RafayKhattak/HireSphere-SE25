import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { aiService } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Rating,
  Skeleton
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RecommendIcon from '@mui/icons-material/Recommend';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';

interface Job {
  _id: string;
  title: string;
  company?: string;
  location: string;
  type: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
  requirements: string;
  employer: {
    _id: string;
    name: string;
    companyName: string;
  };
  createdAt: string;
  matchScore?: number;
  matchReasons?: string[];
}

interface RecommendationsResponse {
  jobs: Job[];
  message: string;
}

const JobRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [aiProcessing, setAiProcessing] = useState<boolean>(false);
  const [aiEnhanced, setAiEnhanced] = useState<boolean>(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await api.get('/recommendations/jobs');
        setRecommendations(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching job recommendations:', err);
        setError(err.response?.data?.message || 'Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const enhanceWithAI = async () => {
    if (!recommendations?.jobs.length || !user) return;

    try {
      setAiProcessing(true);

      // Get all available jobs
      const allJobsResponse = await api.get('/jobs');
      const allJobs = allJobsResponse.data || [];

      // Get AI-enhanced recommendations
      const enhancedRecommendations = await aiService.getPersonalizedJobRecommendations(
        user,
        allJobs
      );

      // If we have AI recommendations, update the state
      if (enhancedRecommendations.jobs.length > 0) {
        const jobsWithReasons = enhancedRecommendations.jobs.map(job => {
          return {
            ...job,
            _id: job._id || job.id,
            company: typeof job.employer === 'object' ? job.employer.companyName || '' : '',
            matchReasons: enhancedRecommendations.reasoning[job._id || job.id] || [],
            matchScore: Math.floor(Math.random() * 31) + 70 // Mock score between 70-100 for demo
          } as Job;
        });

        setRecommendations({
          jobs: jobsWithReasons,
          message: 'AI-powered recommendations based on your profile, skills, and preferences'
        });
        setAiEnhanced(true);
      }
    } catch (err) {
      console.error('Error enhancing recommendations with AI:', err);
    } finally {
      setAiProcessing(false);
    }
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const formatSalary = (min: number, max: number, currency: string) => {
    return `${currency}${min.toLocaleString()} - ${currency}${max.toLocaleString()}`;
  };

  const getJobTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'full-time':
        return 'primary';
      case 'part-time':
        return 'secondary';
      case 'contract':
        return 'info';
      case 'internship':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Finding your perfect job matches...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RecommendIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Job Recommendations
            </Typography>
          </Box>
          {!aiEnhanced && !aiProcessing && (
            <Button 
              variant="contained" 
              color="secondary" 
              startIcon={<AutoGraphIcon />}
              onClick={enhanceWithAI}
              disabled={!user?.skills?.length}
            >
              Enhance with AI
            </Button>
          )}
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {aiProcessing && (
          <Box sx={{ mb: 4, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CircularProgress size={20} sx={{ mr: 2 }} />
              <Typography variant="subtitle1">
                AI is analyzing your profile and finding personalized job matches...
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              {[1, 2, 3].map((_, index) => (
                <Grid item xs={12} md={6} lg={4} key={index}>
                  <Card elevation={2}>
                    <CardContent>
                      <Skeleton variant="text" width="80%" height={40} />
                      <Skeleton variant="text" width="60%" />
                      <Box sx={{ mt: 2 }}>
                        <Skeleton variant="text" width="90%" />
                        <Skeleton variant="text" width="90%" />
                        <Skeleton variant="text" width="70%" />
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Skeleton variant="rectangular" width="100%" height={36} />
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
        
        {recommendations && (
          <>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {recommendations.message}
            </Typography>

            {recommendations.jobs.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No recommendations available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add more skills to your profile to get personalized job recommendations
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 3 }}
                  onClick={() => navigate('/profile')}
                >
                  Update Profile
                </Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {recommendations.jobs.map((job) => (
                  <Grid item xs={12} md={6} lg={4} key={job._id}>
                    <Card 
                      elevation={3} 
                      sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: 6
                        }
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="h6" component="h2" gutterBottom>
                            {job.title}
                          </Typography>
                          {job.matchScore && (
                            <Chip 
                              label={`${job.matchScore}% Match`}
                              color={job.matchScore > 75 ? 'success' : job.matchScore > 50 ? 'primary' : 'default'}
                              size="small"
                            />
                          )}
                        </Box>
                        
                        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                          {job.employer.companyName}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {job.location}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <WorkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Chip 
                            label={job.type} 
                            size="small" 
                            color={getJobTypeColor(job.type) as any}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <AttachMoneyIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatSalary(job.salary.min, job.salary.max, job.salary.currency)}
                          </Typography>
                        </Box>
                        
                        {aiEnhanced && job.matchReasons && job.matchReasons.length > 0 && (
                          <Box sx={{ mt: 2, mb: 1 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Matched based on:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {job.matchReasons.map((reason, index) => (
                                <Chip 
                                  key={index} 
                                  label={reason} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                      
                      <CardActions>
                        <Button 
                          size="small" 
                          variant="contained" 
                          onClick={() => handleJobClick(job._id)}
                          fullWidth
                        >
                          View Details
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default JobRecommendations; 