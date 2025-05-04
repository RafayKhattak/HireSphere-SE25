import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  CircularProgress, 
  Alert, 
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import MoneyIcon from '@mui/icons-material/Money';
import InsightsIcon from '@mui/icons-material/Insights';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { salaryService } from '../services/api';

// Types for salary insights data
interface SalaryRange {
  low: number;
  median: number;
  high: number;
}

interface TopRole {
  title: string;
  medianSalary: number;
  description: string;
}

interface ValuableSkill {
  skill: string;
  impact: string;
}

interface SalaryInsightsData {
  currency: string;
  salaryRange: SalaryRange;
  topRoles: TopRole[];
  valuableSkills: ValuableSkill[];
  experienceImpact: string;
  industryTrends: string;
}

const SalaryInsights: React.FC = () => {
  const [insights, setInsights] = useState<SalaryInsightsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (insights?.currency === 'PKR') {
      // Format as PKR
      return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0
      }).format(amount);
    }
    
    // Format as USD (default)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    const fetchSalaryInsights = async () => {
      console.log('[SalaryInsights] Starting to fetch salary insights data');
      try {
        setLoading(true);
        console.log('[SalaryInsights] User authenticated, making API request');
        
        // Use the API service instead of direct axios call
        const response = await salaryService.getSalaryInsights({});
        console.log('[SalaryInsights] Successfully received data:', response);
        
        // Log key metrics from the response
        if (response) {
          console.log(`[SalaryInsights] Salary range: ${formatCurrency(response.salaryRange.low)} - ${formatCurrency(response.salaryRange.high)}`);
          console.log(`[SalaryInsights] Median salary: ${formatCurrency(response.salaryRange.median)}`);
          console.log(`[SalaryInsights] Top role: ${response.topRoles[0]?.title} at ${formatCurrency(response.topRoles[0]?.medianSalary)}`);
          console.log(`[SalaryInsights] Received ${response.valuableSkills?.length || 0} valuable skills recommendations`);
          console.log(`[SalaryInsights] Currency: ${response.currency || 'USD'}`);
        }
        
        setInsights(response);
        setError(null);
      } catch (err: any) {
        console.error('[SalaryInsights] Error fetching salary insights:', err);
        console.error('[SalaryInsights] Error details:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load salary insights');
      } finally {
        setLoading(false);
        console.log('[SalaryInsights] Completed data fetching process');
      }
    };

    if (isAuthenticated) {
      console.log('[SalaryInsights] User is authenticated:', user?.email);
      fetchSalaryInsights();
    } else {
      console.log('[SalaryInsights] User not authenticated, skipping data fetch');
      setLoading(false);
      setError('You must be logged in to view salary insights');
    }
  }, [isAuthenticated, user]);

  const handleRefreshInsights = () => {
    console.log('[SalaryInsights] User requested to refresh salary insights');
    setLoading(true);
    setError(null);
    // Re-fetch insights data
    fetchSalaryInsights();
  };

  const fetchSalaryInsights = async () => {
    console.log('[SalaryInsights] Fetching fresh salary insights data');
    try {
      const response = await salaryService.getSalaryInsights({
        refresh: true // Optional parameter to force a fresh calculation
      });
      console.log('[SalaryInsights] Successfully refreshed data:', response);
      
      // Log the difference between old and new median salary if applicable
      if (insights && response) {
        const oldMedian = insights.salaryRange.median;
        const newMedian = response.salaryRange.median;
        const percentChange = ((newMedian - oldMedian) / oldMedian * 100).toFixed(1);
        console.log(`[SalaryInsights] Salary update: ${formatCurrency(oldMedian)} → ${formatCurrency(newMedian)} (${percentChange}% change)`);
      }
      
      setInsights(response);
      setError(null);
    } catch (err: any) {
      console.error('[SalaryInsights] Error refreshing salary insights:', err);
      setError(err.response?.data?.error || 'Failed to refresh salary insights');
    } finally {
      setLoading(false);
      console.log('[SalaryInsights] Completed refresh process');
    }
  };

  if (loading) {
    console.log('[SalaryInsights] Rendering loading state');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    console.log(`[SalaryInsights] Rendering error state: ${error}`);
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!insights) {
    console.log('[SalaryInsights] No insights data available');
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          No salary insights available. Please complete your profile with skills and experience.
          <Button 
            variant="text" 
            color="primary" 
            onClick={handleRefreshInsights}
            sx={{ ml: 2 }}
          >
            Refresh
          </Button>
        </Alert>
      </Box>
    );
  }

  console.log('[SalaryInsights] Rendering complete insights dashboard');
  
  return (
    <Box sx={{ p: isMobile ? 1 : 3, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom sx={{ 
        textAlign: 'center', 
        mb: 3, 
        fontWeight: 600,
        color: theme.palette.primary.main
      }}>
        Your Personalized Salary Insights
      </Typography>
      
      {/* Salary Range Card */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          fontWeight: 500 
        }}>
          <MoneyIcon sx={{ mr: 1 }} /> Estimated Salary Range
        </Typography>
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: 2 
        }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="subtitle1" color="text.secondary">Entry Level</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.info.main }}>
              {formatCurrency(insights.salaryRange.low)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            textAlign: 'center', 
            flex: 1,
            p: 2,
            backgroundColor: theme.palette.primary.light,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <Typography variant="subtitle1" color="text.secondary">Median</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.contrastText }}>
              {formatCurrency(insights.salaryRange.median)}
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="subtitle1" color="text.secondary">Senior Level</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
              {formatCurrency(insights.salaryRange.high)}
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
        {/* Top Roles Section */}
        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontWeight: 500 
              }}>
                <WorkIcon sx={{ mr: 1 }} /> Top Roles You Qualify For
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <List>
                {insights.topRoles.map((role, index) => (
                  <ListItem 
                    key={index} 
                    alignItems="flex-start" 
                    sx={{ 
                      mb: 2, 
                      p: 2,
                      backgroundColor: index % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'transparent',
                      borderRadius: 1
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6" component="span">{role.title}</Typography>
                          <Typography variant="body1" component="span" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(role.medianSalary)}
                          </Typography>
                        </Box>
                      }
                      secondary={role.description}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
        
        {/* Valuable Skills Section */}
        <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontWeight: 500 
              }}>
                <ArrowUpwardIcon sx={{ mr: 1 }} /> Skills to Boost Your Earnings
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <List>
                {insights.valuableSkills.map((skill, index) => (
                  <ListItem 
                    key={index} 
                    alignItems="flex-start" 
                    sx={{ 
                      mb: 2, 
                      p: 2,
                      backgroundColor: index % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'transparent',
                      borderRadius: 1
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={skill.skill} 
                            color="primary" 
                            sx={{ mr: 1, fontWeight: 'bold' }} 
                          />
                        </Box>
                      }
                      secondary={skill.impact}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>
      
      {/* Market Insights */}
      <Paper elevation={2} sx={{ mt: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          fontWeight: 500 
        }}>
          <TrendingUpIcon sx={{ mr: 1 }} /> Market Insights
        </Typography>
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
          <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
            <Typography variant="h6" gutterBottom>Experience Impact</Typography>
            <Typography variant="body1" paragraph>
              {insights.experienceImpact}
            </Typography>
          </Box>
          
          <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
            <Typography variant="h6" gutterBottom>Industry Trends</Typography>
            <Typography variant="body1" paragraph>
              {insights.industryTrends}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            sx={{ mt: 2, mr: 2 }}
            onClick={() => window.location.href = '/jobseeker/profile'}
          >
            Update Your Profile
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            size="large"
            sx={{ mt: 2 }}
            onClick={handleRefreshInsights}
          >
            Refresh Insights
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SalaryInsights; 