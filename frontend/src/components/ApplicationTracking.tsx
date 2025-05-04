import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';
import {
  Container,
  Typography,
  Paper,
  Box,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { format } from 'date-fns';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  status: string;
  employer: {
    _id: string;
    name: string;
    companyName: string;
  };
}

interface HistoryItem {
  status: string;
  date: string;
  note: string;
}

interface Application {
  _id: string;
  job: Job;
  status: string;
  appliedAt: string;
  statusInfo: {
    color: string;
    message: string;
  };
  lastUpdated: string;
  applicationHistory: HistoryItem[];
}

const ApplicationTracking: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const response = await applicationService.getMyApplications();
        setApplications(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching applications:', err);
        setError(err.response?.data?.message || 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleViewJob = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const handleMessageEmployer = (employerId: string) => {
    navigate(`/messages/${employerId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'reviewed':
        return 1;
      case 'interview':
        return 2;
      case 'accepted':
        return 3;
      case 'rejected':
        return 3;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'reviewed':
        return 'info';
      case 'interview':
        return 'secondary';
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading your applications...
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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <EventNoteIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            My Applications
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {applications.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              You haven't applied to any jobs yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Start exploring job opportunities and apply to positions that match your skills
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 3 }}
              onClick={() => navigate('/jobs')}
            >
              Browse Jobs
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
            {applications.map((application) => (
              <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }} key={application._id}>
                <Card elevation={3}>
                  <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" component="h2">
                          {application.job.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {application.job.employer.companyName}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ mt: { xs: 2, md: 0 } }}>
                        <Chip 
                          label={application.status.toUpperCase()}
                          color={getStatusColor(application.status) as any}
                          sx={{ fontWeight: 'bold' }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Applied on {formatDate(application.appliedAt)}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color={`${getStatusColor(application.status)}.main`} sx={{ mb: 1, fontWeight: 'medium' }}>
                        {application.statusInfo.message}
                      </Typography>
                    </Box>
                    
                    <Stepper 
                      activeStep={getStatusStep(application.status)} 
                      alternativeLabel
                      sx={{ mb: 3 }}
                    >
                      <Step completed={getStatusStep(application.status) >= 0}>
                        <StepLabel>Applied</StepLabel>
                      </Step>
                      <Step completed={getStatusStep(application.status) >= 1}>
                        <StepLabel>Reviewed</StepLabel>
                      </Step>
                      <Step completed={getStatusStep(application.status) >= 2}>
                        <StepLabel>Interview</StepLabel>
                      </Step>
                      <Step completed={getStatusStep(application.status) >= 3}>
                        <StepLabel>{application.status === 'rejected' ? 'Rejected' : 'Accepted'}</StepLabel>
                      </Step>
                    </Stepper>
                    
                    <Accordion>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="application-history-content"
                        id="application-history-header"
                      >
                        <Typography>Application History</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List>
                          {application.applicationHistory.map((historyItem, index) => (
                            <ListItem key={index} alignItems="flex-start">
                              <ListItemIcon>
                                <CheckCircleIcon color={getStatusColor(historyItem.status) as any} />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body1" fontWeight="medium">
                                      Status: {historyItem.status.charAt(0).toUpperCase() + historyItem.status.slice(1)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {formatDateTime(historyItem.date)}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  historyItem.note && (
                                    <Typography
                                      variant="body2"
                                      color="text.primary"
                                      sx={{ mt: 1 }}
                                    >
                                      Note: {historyItem.note}
                                    </Typography>
                                  )
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                  
                  <CardActions sx={{ p: 2 }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => handleViewJob(application.job._id)}
                    >
                      View Job Details
                    </Button>
                    <Button 
                      size="small" 
                      variant="contained" 
                      onClick={() => handleMessageEmployer(application.job.employer._id)}
                    >
                      Message Employer
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ApplicationTracking; 