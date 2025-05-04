import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, CardActions, Button, Chip,
  CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Accordion, AccordionSummary,
  AccordionDetails, Container, IconButton, Divider
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// Correct MUI v7 Icon Imports
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';

import { interviewService } from '../services/api';
import { format } from 'date-fns';

interface Interview {
  _id: string;
  jobApplication: string;
  job: {
    _id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    employer: {
      _id: string;
      name: string;
      companyName: string;
    };
  };
  employer: {
    _id: string;
    name: string;
    companyName: string;
    email: string;
  };
  scheduledDateTime: string;
  duration: number;
  location: 'onsite' | 'remote' | 'phone';
  meetingLink?: string;
  address?: string;
  interviewType: 'screening' | 'technical' | 'behavioral' | 'final';
  description: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
}

const JobSeekerInterviews: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState<boolean>(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await interviewService.getJobSeekerInterviews();
      setInterviews(data);
    } catch (err: any) {
      console.error('Error fetching interviews:', err);
      setError(err.response?.data?.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.type !== 'jobseeker') {
      navigate('/login');
      return;
    }
    
    fetchInterviews();
  }, [user]);

  const handleCancelInterview = async (interviewId: string) => {
    if (window.confirm('Are you sure you want to request cancellation for this interview?')) {
      setCancellingId(interviewId);
      try {
        await interviewService.cancelInterview(interviewId);
        fetchInterviews();
        setSuccessMessage('Interview cancelled successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err: any) {
        console.error('Error cancelling interview:', err);
        setError('Failed to cancel interview. Please try again or contact the employer.');
      } finally {
        setCancellingId(null);
      }
    }
  };

  const openCancelDialog = (interviewId: string) => {
    setSelectedInterviewId(interviewId);
    setCancelDialogOpen(true);
  };

  // Group interviews by status
  const upcomingInterviews = interviews.filter(interview => 
    ['scheduled', 'rescheduled'].includes(interview.status) && 
    new Date(interview.scheduledDateTime) > new Date()
  ).sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
  
  const pastInterviews = interviews.filter(interview => 
    interview.status === 'completed' || new Date(interview.scheduledDateTime) <= new Date()
  ).sort((a, b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());
  
  const cancelledInterviews = interviews.filter(interview => 
    interview.status === 'cancelled'
  ).sort((a, b) => new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime());

  // Helper to format the date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Status chip colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'rescheduled': return 'warning';
      default: return 'default';
    }
  };

  // Render interview card
  const renderInterviewCard = (interview: Interview) => {
    const { date, time } = formatDateTime(interview.scheduledDateTime);
    const isPastInterview = new Date(interview.scheduledDateTime) <= new Date();
    const showCancelButton = !isPastInterview && interview.status !== 'cancelled';
    
    return (
      <Card key={interview._id} sx={{ mb: 2, position: 'relative' }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1) }}>
            <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div">
                  {interview.job.title}
                </Typography>
                <Chip 
                  label={interview.status.charAt(0).toUpperCase() + interview.status.slice(1)} 
                  color={getStatusColor(interview.status) as any}
                  size="small"
                />
              </Box>
              <Typography color="text.secondary" gutterBottom>
                <Link to={`/company/${interview.job.employer._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <BusinessIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                  {interview.job.employer.companyName || interview.job.company}
                </Link>
              </Typography>
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EventIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Date: {date}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Time: {time} ({interview.duration} minutes)
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOnIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Location: {interview.location.charAt(0).toUpperCase() + interview.location.slice(1)}
                {interview.location === 'remote' && (
                  <VideoCallIcon sx={{ fontSize: 16, ml: 0.5 }} />
                )}
                {interview.location === 'phone' && (
                  <PhoneIcon sx={{ fontSize: 16, ml: 0.5 }} />
                )}
              </Typography>
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Type: {interview.interviewType.charAt(0).toUpperCase() + interview.interviewType.slice(1)} Interview
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EmailIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Contact: <a href={`mailto:${interview.employer.email}`} style={{ marginLeft: 4 }}>{interview.employer.email}</a>
              </Typography>
            </Box>
            
            {interview.description && (
              <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Accordion disableGutters elevation={0} sx={{ backgroundColor: 'transparent' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight="bold">Interview Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2">{interview.description}</Typography>
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
            
            {interview.location === 'remote' && interview.meetingLink && (
              <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" fontWeight="bold">Meeting Link:</Typography>
                <Typography variant="body2">
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">{interview.meetingLink}</a>
                </Typography>
              </Box>
            )}
            
            {interview.location === 'onsite' && interview.address && (
              <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" fontWeight="bold">Address:</Typography>
                <Typography variant="body2">{interview.address}</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
        
        <CardActions>
          {showCancelButton && (
            <Button 
              size="small" 
              startIcon={<CancelIcon />} 
              color="error"
              onClick={() => openCancelDialog(interview._id)}
            >
              Cancel Interview
            </Button>
          )}
          
          <Button 
            size="small" 
            component={Link} 
            to={`/applications`}
          >
            View Application
          </Button>
          
          {interview.location === 'remote' && interview.meetingLink && !isPastInterview && interview.status !== 'cancelled' && (
            <Button 
              size="small" 
              color="primary" 
              component="a"
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Meeting
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Interviews
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : interviews.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            You don't have any interviews scheduled yet.
          </Typography>
          <Button 
            component={Link} 
            to="/jobs"
            variant="contained" 
            color="primary"
            sx={{ mt: 2 }}
          >
            Browse Jobs
          </Button>
        </Paper>
      ) : (
        <>
          {upcomingInterviews.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Upcoming Interviews
              </Typography>
              {upcomingInterviews.map(renderInterviewCard)}
            </Box>
          )}
          
          {pastInterviews.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Past Interviews
              </Typography>
              {pastInterviews.map(renderInterviewCard)}
            </Box>
          )}
          
          {cancelledInterviews.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Cancelled Interviews
              </Typography>
              {cancelledInterviews.map(renderInterviewCard)}
            </Box>
          )}
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Interview</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this interview? This action cannot be undone and the employer will be notified.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>No, Keep It</Button>
          <Button onClick={() => handleCancelInterview(selectedInterviewId as string)} color="error" autoFocus>
            Yes, Cancel Interview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobSeekerInterviews; 