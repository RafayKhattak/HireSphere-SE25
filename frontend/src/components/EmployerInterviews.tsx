import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Button, Chip, IconButton, Tooltip, TextField, MenuItem, Dialog, 
  DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, Grid,
  TablePagination, CircularProgress, Alert, List, ListItem, ListItemText, ListItemIcon, Divider
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Send from '@mui/icons-material/Send';
import Refresh from '@mui/icons-material/Refresh';
import VideoCall from '@mui/icons-material/VideoCall';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
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
  };
  jobSeeker: {
    _id: string;
    name: string;
    firstName: string;
    lastName: string;
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
  notes: string;
  feedback: string;
}

interface InterviewDialogProps {
  open: boolean;
  interview: Interview | null;
  onClose: () => void;
  onSave: (interviewData: any) => void;
  isEditing: boolean;
}

// Dialog component for editing interviews
const InterviewDialog: React.FC<InterviewDialogProps> = ({ 
  open, interview, onClose, onSave, isEditing 
}) => {
  const [scheduledDateTime, setScheduledDateTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [location, setLocation] = useState<'onsite' | 'remote' | 'phone'>('remote');
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [interviewType, setInterviewType] = useState<'screening' | 'technical' | 'behavioral' | 'final'>('screening');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<'scheduled' | 'completed' | 'cancelled' | 'rescheduled'>('scheduled');
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generatingLink, setGeneratingLink] = useState<boolean>(false);
  const { token } = useAuth();

  // Initialize form when the interview changes
  useEffect(() => {
    if (interview) {
      setScheduledDateTime(interview.scheduledDateTime ? new Date(interview.scheduledDateTime) : null);
      setDuration(interview.duration || 60);
      setLocation(interview.location || 'remote');
      setMeetingLink(interview.meetingLink || '');
      setAddress(interview.address || '');
      setInterviewType(interview.interviewType || 'screening');
      setDescription(interview.description || '');
      setStatus(interview.status || 'scheduled');
      setNotes(interview.notes || '');
      setFeedback(interview.feedback || '');
    } else {
      resetForm();
    }
  }, [interview, open]);

  const resetForm = () => {
    setScheduledDateTime(null);
    setDuration(60);
    setLocation('remote');
    setMeetingLink('');
    setAddress('');
    setInterviewType('screening');
    setDescription('');
    setStatus('scheduled');
    setNotes('');
    setFeedback('');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!scheduledDateTime) {
      newErrors.scheduledDateTime = 'Date and time are required';
    } else if (scheduledDateTime <= new Date()) {
      newErrors.scheduledDateTime = 'Date must be in the future';
    }
    
    if (location === 'remote' && !meetingLink) {
      newErrors.meetingLink = 'Meeting link is required for remote interviews';
    }
    
    if (location === 'onsite' && !address) {
      newErrors.address = 'Address is required for onsite interviews';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave({
        scheduledDateTime,
        duration,
        location,
        meetingLink: location === 'remote' ? meetingLink : undefined,
        address: location === 'onsite' ? address : undefined,
        interviewType,
        description,
        status,
        notes,
        feedback
      });
    }
  };

  const handleGenerateGoogleMeetLink = async () => {
    if (!scheduledDateTime) {
      setErrors({ ...errors, scheduledDateTime: 'Please set date and time first' });
      return;
    }

    setGeneratingLink(true);
    try {
      const response = await axios.post('/api/interviews/generate-meet-link', {
        scheduledDateTime: scheduledDateTime.toISOString(),
        duration: duration,
        interviewType: interviewType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMeetingLink(response.data.meetingLink);
    } catch (err: any) {
      console.error('Error generating Google Meet link:', err);
      alert('Failed to generate Google Meet link. Please create one manually.');
    } finally {
      setGeneratingLink(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? 'Edit Interview' : 'Schedule Interview'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1), mt: 1 }}>
          <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Date & Time"
                value={scheduledDateTime}
                onChange={(newValue) => setScheduledDateTime(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.scheduledDateTime,
                    helperText: errors.scheduledDateTime
                  }
                }}
              />
            </LocalizationProvider>
          </Box>
          <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
            <TextField
              fullWidth
              label="Duration (minutes)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              InputProps={{ inputProps: { min: 15, step: 15 } }}
            />
          </Box>
          <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
            <FormControl fullWidth error={!!errors.location}>
              <InputLabel>Location Type</InputLabel>
              <Select
                value={location}
                label="Location Type"
                onChange={(e) => setLocation(e.target.value as 'onsite' | 'remote' | 'phone')}
              >
                <MenuItem value="remote">Remote</MenuItem>
                <MenuItem value="onsite">On-site</MenuItem>
                <MenuItem value="phone">Phone</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
            <FormControl fullWidth>
              <InputLabel>Interview Type</InputLabel>
              <Select
                value={interviewType}
                label="Interview Type"
                onChange={(e) => setInterviewType(e.target.value as 'screening' | 'technical' | 'behavioral' | 'final')}
              >
                <MenuItem value="screening">Screening</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="behavioral">Behavioral</MenuItem>
                <MenuItem value="final">Final</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          {location === 'remote' && (
            <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
              <Box display="flex" alignItems="flex-end">
                <Box sx={{ flexGrow: 1, pr: 1 }}>
                  <TextField
                    fullWidth
                    label="Meeting Link"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    error={!!errors.meetingLink}
                    helperText={errors.meetingLink || 'Provide a video conference link (Zoom, Teams, etc.)'}
                  />
                </Box>
                <Box sx={{ flexShrink: 0 }}>
                  <Tooltip title="Generate Google Meet Link">
                    <span>
                      <Button
                        variant="outlined"
                        startIcon={<VideoCall />}
                        onClick={handleGenerateGoogleMeetLink}
                        disabled={generatingLink || !scheduledDateTime}
                        sx={{ mt: 1 }}
                      >
                        {generatingLink ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                        {generatingLink ? 'Generating...' : 'Generate Google Meet Link'}
                      </Button>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          )}
          
          {location === 'onsite' && (
            <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
              <TextField
                fullWidth
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                error={!!errors.address}
                helperText={errors.address || 'Provide the complete address for the interview location'}
                multiline
                rows={2}
              />
            </Box>
          )}
          
          <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              placeholder="Provide details about the interview, what to prepare, etc."
            />
          </Box>
          
          {isEditing && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1), width: '100%', mt: 1, ml: 0 }}>
              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={(e) => setStatus(e.target.value as 'scheduled' | 'completed' | 'cancelled' | 'rescheduled')}
                  >
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="rescheduled">Rescheduled</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={2}
                  placeholder="Internal notes about the candidate or interview (not visible to the candidate)"
                />
              </Box>
              <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                <TextField
                  fullWidth
                  label="Feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Post-interview feedback (not visible to the candidate)"
                />
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          startIcon={isEditing ? <Edit /> : <CalendarToday />}
        >
          {isEditing ? 'Update' : 'Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EmployerInterviews: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filtering & Sorting
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('scheduledDateTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!user || user.type !== 'employer') {
      navigate('/login');
      return;
    }
    
    fetchInterviews();
  }, [user]);

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await interviewService.getEmployerInterviews();
      setInterviews(data);
    } catch (err: any) {
      console.error('Error fetching interviews:', err);
      setError(err.response?.data?.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditInterview = (interview: Interview) => {
    setCurrentInterview(interview);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleCancelInterview = async (interviewId: string) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;
    
    try {
      await interviewService.cancelInterview(interviewId);
      
      // Update the interview in the state
      setInterviews(interviews.map(interview => 
        interview._id === interviewId 
          ? { ...interview, status: 'cancelled' } 
          : interview
      ));
      
      setSuccessMessage('Interview cancelled successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error cancelling interview:', err);
      setError(err.response?.data?.message || 'Failed to cancel interview');
    }
  };

  const handleUpdateInterview = async (interviewData: any) => {
    if (!currentInterview) return;
    
    try {
      await interviewService.updateInterview(currentInterview._id, interviewData);
      
      // Update the interview in the state
      setInterviews(interviews.map(interview => 
        interview._id === currentInterview._id 
          ? { 
              ...interview, 
              ...interviewData,
              // Convert date objects to strings for consistency
              scheduledDateTime: interviewData.scheduledDateTime?.toISOString()
            } 
          : interview
      ));
      
      setDialogOpen(false);
      setSuccessMessage('Interview updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating interview:', err);
      setError(err.response?.data?.message || 'Failed to update interview');
    }
  };

  // Filter and sort interviews
  const filteredInterviews = interviews
    .filter(interview => {
      if (statusFilter === 'all') return true;
      return interview.status === statusFilter;
    })
    .sort((a, b) => {
      if (sortField === 'scheduledDateTime') {
        const dateA = new Date(a.scheduledDateTime).getTime();
        const dateB = new Date(b.scheduledDateTime).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortField === 'candidateName') {
        const nameA = `${a.jobSeeker.firstName || ''} ${a.jobSeeker.lastName || ''}`.trim() || a.jobSeeker.name || '';
        const nameB = `${b.jobSeeker.firstName || ''} ${b.jobSeeker.lastName || ''}`.trim() || b.jobSeeker.name || '';
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else if (sortField === 'jobTitle') {
        return sortDirection === 'asc' 
          ? a.job.title.localeCompare(b.job.title)
          : b.job.title.localeCompare(a.job.title);
      }
      return 0;
    });

  // Get interviews for current page
  const paginatedInterviews = filteredInterviews.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Status to color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'rescheduled': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Manage Interviews
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

      <Box sx={{ display: 'flex', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="rescheduled">Rescheduled</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <Button 
          variant="outlined" 
          startIcon={<Refresh />}
          onClick={fetchInterviews}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : interviews.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            You don't have any interviews scheduled yet.
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell 
                    onClick={() => handleSort('candidateName')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Candidate
                    {sortField === 'candidateName' && (
                      sortDirection === 'asc' ? ' ↑' : ' ↓'
                    )}
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('jobTitle')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Job
                    {sortField === 'jobTitle' && (
                      sortDirection === 'asc' ? ' ↑' : ' ↓'
                    )}
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('scheduledDateTime')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Date & Time
                    {sortField === 'scheduledDateTime' && (
                      sortDirection === 'asc' ? ' ↑' : ' ↓'
                    )}
                  </TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedInterviews.map((interview) => {
                  const candidateName = `${interview.jobSeeker.firstName || ''} ${interview.jobSeeker.lastName || ''}`.trim() || interview.jobSeeker.name || 'Unknown';
                  const interviewDateTime = new Date(interview.scheduledDateTime);
                  
                  return (
                    <TableRow key={interview._id}>
                      <TableCell>
                        <Link to={`/jobseeker/${interview.jobSeeker._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <Typography color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                            {candidateName}
                          </Typography>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link to={`/jobs/${interview.job._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <Typography color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                            {interview.job.title}
                          </Typography>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {interviewDateTime.toLocaleDateString()}, {' '}
                        {interviewDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <Typography variant="body2" color="textSecondary">
                          {interview.duration} minutes
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={interview.interviewType.charAt(0).toUpperCase() + interview.interviewType.slice(1)} 
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {interview.location.charAt(0).toUpperCase() + interview.location.slice(1)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={interview.status.charAt(0).toUpperCase() + interview.status.slice(1)} 
                          color={getStatusColor(interview.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Tooltip title="Edit Interview">
                            <IconButton 
                              onClick={() => handleEditInterview(interview)}
                              disabled={interview.status === 'cancelled'}
                              size="small"
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          
                          {interview.status !== 'cancelled' && (
                            <Tooltip title="Cancel Interview">
                              <IconButton 
                                onClick={() => handleCancelInterview(interview._id)}
                                color="error"
                                size="small"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          <Tooltip title="Send Email">
                            <IconButton 
                              component="a"
                              href={`mailto:${interview.jobSeeker.email}?subject=Interview for ${interview.job.title}`}
                              color="primary"
                              size="small"
                            >
                              <Send />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={filteredInterviews.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </>
      )}

      <InterviewDialog
        open={dialogOpen}
        interview={currentInterview}
        onClose={() => setDialogOpen(false)}
        onSave={handleUpdateInterview}
        isEditing={isEditing}
      />
    </Box>
  );
};

export default EmployerInterviews; 