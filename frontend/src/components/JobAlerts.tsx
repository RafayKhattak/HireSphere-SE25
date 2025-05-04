import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Button, CircularProgress, Alert, Card, CardContent, CardActions, 
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Select, MenuItem, InputLabel, FormControl, SelectChangeEvent, FormControlLabel, Switch, Divider, Paper,
  Snackbar
} from '@mui/material';

// Corrected Icon Imports (might still show linter errors)
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';

import { useAuth } from '../context/AuthContext';
import { jobAlertService } from '../services/api'; 
import api from '../services/api'; // Ensure api is imported
import { format } from 'date-fns';
import { AxiosResponse } from 'axios'; // Add AxiosResponse import back

interface JobAlert {
  _id: string;
  name: string;
  keywords: string[];
  locations: string[];
  jobTypes: string[];
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  isActive: boolean;
  frequency: string;
  createdAt: string;
  lastSent: string | null;
}

const JobAlerts: React.FC = () => {
  console.log('[JobAlerts] Component rendered.'); // Log component render
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  // Form state - Adjust for array fields and salary object
  const [name, setName] = useState<string>('');
  const [keywords, setKeywords] = useState<string>(''); // Keep as comma-separated string for input
  const [locations, setLocations] = useState<string>(''); // Keep as comma-separated string for input
  const [jobTypes, setJobTypes] = useState<string[]>([]); // Use array for multi-select if implemented, otherwise handle single string
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'immediate'>('daily');

  // Function to get token from localStorage
  const getToken = () => {
    return localStorage.getItem('token');
  };

  const fetchAlerts = useCallback(async () => { // Renamed function to fetchAlerts
    setLoading(true);
    try {
      const response = await jobAlertService.getAlerts();
      setAlerts(response);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching job alerts:', err);
      setError(err.response?.data?.message || 'Failed to load job alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(); // Call fetchAlerts here
  }, [fetchAlerts]);

  const handleOpenDialog = (alert: JobAlert | null = null) => {
    console.log('[JobAlerts] handleOpenDialog called. Alert:', alert); // Log function start
    if (alert) {
      setEditingAlert(alert);
      setName(alert.name);
      setKeywords(alert.keywords.join(', '));
      setLocations(alert.locations.join(', ')); // Join array for input field
      setJobTypes(alert.jobTypes); // Set array state for job types
      setSalaryMin(alert.salary.min.toString()); // Access salary object
      setSalaryMax(alert.salary.max.toString()); // Access salary object
      setIsActive(alert.isActive);
      setFrequency(alert.frequency as 'daily' | 'weekly' | 'immediate');
    } else {
      resetForm();
      setEditingAlert(null);
    }
    setOpenDialog(true);
    console.log('[JobAlerts] handleOpenDialog finished. openDialog state should be true.'); // Log function end
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setKeywords('');
    setLocations(''); // Reset locations string
    setJobTypes([]); // Reset job types array
    setSalaryMin('');
    setSalaryMax('');
    setIsActive(true);
    setFrequency('daily');
    setEditingAlert(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[JobAlerts] handleSubmit triggered.'); // Log start
    setError(null); // Clear previous errors
    
    if (!keywords.trim()) {
      console.log('[JobAlerts] handleSubmit validation failed: Keywords required.');
      setError('Keywords are required');
      return;
    }

    if (salaryMin !== '' && salaryMax !== '' && Number(salaryMin) > Number(salaryMax)) {
      console.log('[JobAlerts] handleSubmit validation failed: Min salary > Max salary.');
      setError('Minimum salary cannot be greater than maximum salary');
      return;
    }
    console.log('[JobAlerts] handleSubmit validation passed.');

    try {
      setLoading(true);
      console.log('[JobAlerts] handleSubmit setting loading state to true.');
      const keywordsArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const locationsArray = locations.split(',').map((l: string) => l.trim()).filter(Boolean); // Split locations string into array
      
      const alertData = {
        name: name || `Alert based on: ${keywordsArray[0] || 'criteria'}`, 
        keywords: keywordsArray,
        locations: locationsArray, // Use the locations array
        jobTypes: jobTypes, // Use the jobTypes array directly (assuming multi-select or single value is handled by input)
        salary: {
          min: salaryMin === '' ? 0 : Number(salaryMin),
          max: salaryMax === '' ? 0 : Number(salaryMax),
          currency: 'PKR'
        },
        isActive,
        frequency
      };
      console.log('[JobAlerts] handleSubmit alertData prepared:', alertData);
      
      let response: JobAlert; // Declare response as JobAlert type
      
      if (editingAlert) {
        console.log(`[JobAlerts] handleSubmit updating alert ID: ${editingAlert._id}`);
        const updateResponse = await jobAlertService.updateAlert(editingAlert._id, alertData);
        response = updateResponse; // Assign the result for consistency below if needed
        console.log('[JobAlerts] handleSubmit updateAlert response:', response);
        
        if (response && response._id) {
          setAlerts(prev => prev.map(alert => 
            alert._id === editingAlert._id ? response : alert
          ));
          setSnackbarMessage('Job alert updated successfully');
          setSnackbarOpen(true);
          handleCloseDialog();
        } else {
           console.error('[JobAlerts] handleSubmit error: Invalid data structure received after updating alert:', response);
           setError('Failed to process server response for update.');
           setSnackbarMessage('Error: Received invalid data from server after update.');
           setSnackbarOpen(true);
        }

      } else {
        console.log('[JobAlerts] handleSubmit creating new alert.');
        response = await jobAlertService.createAlert(alertData);
        console.log('[JobAlerts] handleSubmit createAlert response received:', response);
        
        if (response && response._id) {
          window.location.reload();
        } else {
          // This block should now only trigger if the API truly returns invalid/unexpected data
          console.error('[JobAlerts] handleSubmit error: Invalid data structure received after creating alert:', response);
          setError('Failed to process server response.'); // Set specific error state
          setSnackbarMessage('Error: Received invalid data from server.');
          setSnackbarOpen(true);
        }
      }
      
    } catch (err: any) {
      console.error('[JobAlerts] handleSubmit API error:', err); // Log API error
      const message = err.response?.data?.message || 'Failed to save job alert';
      setError(message); // Set error state from API response or generic message
      setSnackbarMessage(message); // Use the same error message for snackbar
      setSnackbarOpen(true); // Show error snackbar
      // Do not close dialog on API error
    } finally {
      console.log('[JobAlerts] handleSubmit setting loading state to false.');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job alert?')) {
      try {
        setLoading(true);
        await jobAlertService.deleteAlert(id);
        setAlerts(prev => prev.filter(alert => alert._id !== id));
        setError(null);
        setSnackbarMessage('Job alert deleted successfully');
      } catch (err: any) {
        console.error('Error deleting job alert:', err);
        setError(err.response?.data?.message || 'Failed to delete job alert');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      // Use api.patch as likely intended originally
      const response: AxiosResponse<{ success: boolean; jobAlert: JobAlert }> = await api.patch(`/job-alerts/${id}/toggle`, {
        isActive: !currentStatus
      });
      
      setAlerts(prev => prev.map(alert => 
        alert._id === id ? { ...alert, isActive: response.data.jobAlert.isActive } : alert
      ));
      
      setError(null);
      setSnackbarMessage(`Job alert ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (err: any) {
      console.error('Error toggling job alert status:', err);
      setError(err.response?.data?.message || 'Failed to update job alert status');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading your job alerts...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationsActiveIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
            <Typography variant="h4" component="h1">
              Job Alerts
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => { 
              console.log('[JobAlerts] Create Alert button clicked.'); // Log button click
              handleOpenDialog(); // Restore the call to open the dialog
            }}
          >
            Create Alert
          </Button>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Receive notifications when new jobs match your criteria
        </Typography>
        
        <Divider sx={{ mb: 3 }} />
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        {snackbarOpen && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            onClose={() => setSnackbarOpen(false)}
          >
            {snackbarMessage}
          </Alert>
        )}
        
        {alerts.length === 0 && !loading ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You haven't created any job alerts yet.
            </Typography>
            <Button variant="contained" onClick={() => handleOpenDialog()}>Create Your First Alert</Button>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
            {alerts.map((alert) => (
              <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }} key={alert._id}>
                <Card elevation={3}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" component="h2">
                        {alert?.name || 'Unnamed Alert'}
                      </Typography>
                      <Chip 
                        label={alert?.isActive ? 'Active' : 'Paused'} 
                        color={alert?.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Keywords: {alert?.keywords?.join(', ') || 'Any'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Location: {alert?.locations?.join(', ') || 'Any'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WorkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Job Type: {alert?.jobTypes?.join(', ') || 'Any'}
                          {(Number(alert?.salary?.min) > 0 || Number(alert?.salary?.max) > 0) ?
                            ` • Salary: ${Number(alert?.salary?.min) > 0 ? `${alert.salary.currency} ${alert.salary.min}` : 'Any'} - ${Number(alert?.salary?.max) > 0 ? `${alert.salary.currency} ${alert.salary.max}` : 'Any'}`
                            : ''}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Frequency: {alert?.frequency?.charAt(0)?.toUpperCase() + alert?.frequency?.slice(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last sent: {formatDate(alert?.lastSent)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={alert?.isActive ?? false}
                            onChange={() => handleToggleActive(alert._id, alert.isActive)}
                            color="primary"
                          />
                        }
                        label="Active"
                      />
                      <IconButton onClick={() => handleOpenDialog(alert)} color="primary" sx={{ ml: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(alert._id)} color="error" sx={{ ml: 1 }}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
      
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingAlert ? 'Edit Job Alert' : 'Create Job Alert'}</DialogTitle>
        <DialogContent>
          <form onSubmit={(e) => { 
              console.log('[JobAlerts] FORM onSubmit event fired!'); 
              handleSubmit(e); 
            }} 
            id="job-alert-form"
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1), mt: 0.5 }}>
              <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Alert Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  placeholder="E.g., Software Developer Jobs in Boston"
                />
              </Box>
              
              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
                <TextField
                  margin="dense"
                  label="Keywords"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  fullWidth
                  variant="outlined"
                  placeholder="E.g., javascript, react, frontend"
                  helperText="Separate keywords with commas"
                  required
                />
              </Box>
              
              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
                <TextField
                  label="Locations"
                  value={locations}
                  onChange={e => setLocations(e.target.value)}
                  fullWidth
                  variant="outlined"
                  placeholder="E.g., Boston, MA or Remote"
                />
              </Box>
              
              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '33.33%' } }}>
                <FormControl fullWidth variant="outlined" margin="dense">
                  <InputLabel id="job-type-select-label">Job Types</InputLabel>
                  <Select
                    labelId="job-type-select-label"
                    value={jobTypes}
                    multiple
                    onChange={(e: SelectChangeEvent<string[]>) => setJobTypes(e.target.value as string[])}
                    label="Job Types"
                    renderValue={(selected) => selected.join(', ')}
                  >
                    <MenuItem value="full-time">Full-time</MenuItem>
                    <MenuItem value="part-time">Part-time</MenuItem>
                    <MenuItem value="contract">Contract</MenuItem>
                    <MenuItem value="internship">Internship</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '33.33%' } }}>
                <TextField
                  margin="dense"
                  label="Min Salary (PKR)"
                  type="number"
                  value={salaryMin}
                  onChange={e => setSalaryMin(e.target.value)}
                  fullWidth
                  variant="outlined"
                  placeholder="0"
                />
              </Box>
              
              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '33.33%' } }}>
                <TextField
                  margin="dense"
                  label="Max Salary (PKR)"
                  type="number"
                  value={salaryMax}
                  onChange={e => setSalaryMax(e.target.value)}
                  fullWidth
                  variant="outlined"
                  placeholder="0"
                />
              </Box>
              
              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
                <FormControl fullWidth variant="outlined" margin="dense">
                  <InputLabel id="frequency-select-label">Frequency</InputLabel>
                  <Select
                    labelId="frequency-select-label"
                    value={frequency}
                    onChange={(e: SelectChangeEvent) => setFrequency(e.target.value as 'daily' | 'weekly' | 'immediate')}
                    label="Frequency"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="immediate">Immediate</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={isActive}
                        onChange={e => setIsActive(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Alert Active"
                  />
                </Box>
              </Box>
            </Box>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} form="job-alert-form">
            {loading ? <CircularProgress size={24} /> : (editingAlert ? 'Update Alert' : 'Create Alert')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={error ? "error" : "success"}
          sx={{ width: '100%' }} 
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default JobAlerts; 