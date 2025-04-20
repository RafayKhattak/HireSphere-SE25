import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  CircularProgress, 
  Alert, 
  Chip,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { ArrowUpward, TrendingUp, Work, School, Money } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    const fetchSalaryInsights = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/jobseeker/salary-insights', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        setInsights(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching salary insights:', err);
        setError(err.response?.data?.error || 'Failed to load salary insights');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchSalaryInsights();
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!insights) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">No salary insights available. Please complete your profile with skills and experience.</Alert>
      </Box>
    );
  }

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
          <Money sx={{ mr: 1 }} /> Estimated Salary Range
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
      
      <Grid container spacing={3}>
        {/* Top Roles Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontWeight: 500 
              }}>
                <Work sx={{ mr: 1 }} /> Top Roles You Qualify For
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
        </Grid>
        
        {/* Valuable Skills Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                fontWeight: 500 
              }}>
                <ArrowUpward sx={{ mr: 1 }} /> Skills to Boost Your Earnings
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
        </Grid>
      </Grid>
      
      {/* Market Insights */}
      <Paper elevation={2} sx={{ mt: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          fontWeight: 500 
        }}>
          <TrendingUp sx={{ mr: 1 }} /> Market Insights
        </Typography>
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Experience Impact</Typography>
            <Typography variant="body1" paragraph>
              {insights.experienceImpact}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Industry Trends</Typography>
            <Typography variant="body1" paragraph>
              {insights.industryTrends}
            </Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            sx={{ mt: 2 }}
            onClick={() => window.location.href = '/jobseeker/profile'}
          >
            Update Your Profile
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SalaryInsights; 