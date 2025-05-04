import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Grid, FormHelperText, Alert, CircularProgress, Box, Typography,
  FormControlLabel, RadioGroup, Radio
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

// Correct MUI v7 Icon Imports
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VideoCallIcon from '@mui/icons-material/VideoCall';

import { interviewService } from '../services/api';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

interface ScheduleInterviewDialogProps {
  open: boolean;
  onClose: () => void;
  jobApplicationId: string;
  jobId: string;
  onSuccess: () => void;
}

const ScheduleInterviewDialog: React.FC<ScheduleInterviewDialogProps> = ({
  open,
  onClose,
  jobApplicationId,
  jobId,
  onSuccess
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [location, setLocation] = useState<'onsite' | 'remote' | 'phone'>('remote');
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [interviewType, setInterviewType] = useState<'screening' | 'technical' | 'behavioral' | 'final'>('screening');
  const [description, setDescription] = useState<string>('');
  const [generatingLink, setGeneratingLink] = useState<boolean>(false);

  // Form validation
  const [errors, setErrors] = useState<{
    scheduledDateTime?: string;
    meetingLink?: string;
    address?: string;
  }>({});

  const resetForm = () => {
    setScheduledDateTime('');
    setDuration(60);
    setLocation('remote');
    setMeetingLink('');
    setAddress('');
    setInterviewType('screening');
    setDescription('');
    setErrors({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors: {
      scheduledDateTime?: string;
      meetingLink?: string;
      address?: string;
    } = {};
    
    if (!scheduledDateTime) {
      newErrors.scheduledDateTime = 'Date and time are required';
    } else {
      const selectedDate = new Date(scheduledDateTime);
      if (selectedDate <= new Date()) {
        newErrors.scheduledDateTime = 'Date must be in the future';
      }
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

  const handleGenerateGoogleMeetLink = async () => {
    if (!scheduledDateTime) {
      setErrors({ ...errors, scheduledDateTime: 'Please set date and time first' });
      return;
    }

    setGeneratingLink(true);
    try {
      const response = await interviewService.generateGoogleMeetLink({
        scheduledDateTime: new Date(scheduledDateTime).toISOString(),
        duration: duration,
        interviewType: interviewType
      });
      
      setMeetingLink(response.meetingLink);
    } catch (err: any) {
      console.error('Error generating Google Meet link:', err);
      setError('Failed to generate Google Meet link. Please create one manually.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleScheduleInterview = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const interviewData = {
        jobApplicationId,
        scheduledDateTime: new Date(scheduledDateTime).toISOString(),
        duration,
        location,
        meetingLink: location === 'remote' ? meetingLink : undefined,
        address: location === 'onsite' ? address : undefined,
        interviewType,
        description
      };
      
      await interviewService.scheduleInterview(interviewData);
      
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error scheduling interview:', err);
      setError(err.response?.data?.message || 'Failed to schedule interview');
      
      // Handle conflict errors (another interview scheduled at same time)
      if (err.response?.status === 409) {
        setError('You have a scheduling conflict. Please choose a different time.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Schedule an Interview</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
            <TextField
              label="Date and Time"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={scheduledDateTime}
              onChange={(e) => setScheduledDateTime(e.target.value)}
              error={!!errors.scheduledDateTime}
              helperText={errors.scheduledDateTime}
              inputProps={{
                min: new Date(new Date().getTime() + 3600000).toISOString().slice(0, 16)
              }}
            />
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
            <TextField
              fullWidth
              label="Duration (minutes)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              InputProps={{ inputProps: { min: 15, step: 15 } }}
              helperText="Duration in minutes"
            />
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
            <FormControl fullWidth>
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
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
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
              <FormHelperText>Select the type of interview</FormHelperText>
            </FormControl>
          </Grid>
          
          {location === 'remote' && (
            <Grid component="div" sx={{ gridColumn: 'span 12' }}>
              <Grid container spacing={1}>
                <Grid component="div" sx={{ gridColumn: 'span 12' }}>
                  <TextField
                    fullWidth
                    label="Meeting Link"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    error={!!errors.meetingLink}
                    helperText={errors.meetingLink || 'Provide a video conference link (Zoom, Teams, etc.)'}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  />
                </Grid>
                <Grid component="div" sx={{ gridColumn: 'span 12' }}>
                  <Button
                    variant="outlined"
                    startIcon={<VideoCallIcon />}
                    onClick={handleGenerateGoogleMeetLink}
                    disabled={generatingLink || !scheduledDateTime}
                    sx={{ mt: 1 }}
                  >
                    {generatingLink ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                    {generatingLink ? 'Generating...' : 'Generate Google Meet Link'}
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          )}
          
          {location === 'onsite' && (
            <Grid component="div" sx={{ gridColumn: 'span 12' }}>
              <TextField
                fullWidth
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                error={!!errors.address}
                helperText={errors.address || 'Provide the complete address for the interview location'}
                multiline
                rows={2}
                placeholder="123 Main St, City, State, Zip"
              />
            </Grid>
          )}
          
          <Grid component="div" sx={{ gridColumn: 'span 12' }}>
            <TextField
              fullWidth
              label="Description & Instructions"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              placeholder="Provide details about the interview, what to prepare, who to ask for, etc."
              helperText="This information will be shared with the candidate"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleScheduleInterview} 
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={<CalendarTodayIcon />}
        >
          {loading ? 'Scheduling...' : 'Schedule Interview'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleInterviewDialog; 