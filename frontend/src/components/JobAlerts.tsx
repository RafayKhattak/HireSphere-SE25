import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import SearchIcon from '@mui/icons-material/Search';
import { format } from 'date-fns';
import axios, { AxiosResponse } from 'axios';

interface JobAlert {
  _id: string;
  name: string;
  keywords: string[];
  location: string;
  jobType: string;
  salaryMin: number;
  salaryMax: number;
  isActive: boolean;
  frequency: string;
  createdAt: string;
  lastSent: string | null;
}

const JobAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  // Form state
  const [name, setName] = useState<string>('');
  const [keywords, setKeywords] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [jobType, setJobType] = useState<string>('any');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [frequency, setFrequency] = useState<string>('daily');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/job-alerts');
        setAlerts(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching job alerts:', err);
        setError(err.response?.data?.message || 'Failed to load job alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const handleOpenDialog = (alert: JobAlert | null = null) => {
    if (alert) {
      setEditingAlert(alert);
      setName(alert.name);
      setKeywords(alert.keywords.join(', '));
      setLocation(alert.location);
      setJobType(alert.jobType);
      setSalaryMin(alert.salaryMin || '');
      setSalaryMax(alert.salaryMax || '');
      setIsActive(alert.isActive);
      setFrequency(alert.frequency);
    } else {
      resetForm();
      setEditingAlert(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setKeywords('');
    setLocation('');
    setJobType('any');
    setSalaryMin('');
    setSalaryMax('');
    setIsActive(true);
    setFrequency('daily');
    setEditingAlert(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keywords) {
      setError('Please enter at least one keyword');
      return;
    }

    if (salaryMin !== '' && salaryMax !== '' && Number(salaryMin) > Number(salaryMax)) {
      setError('Minimum salary cannot be greater than maximum salary');
      return;
    }

    try {
      setLoading(true);
      const keywordsArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const locationsArray = locations.split(',').map(l => l.trim()).filter(Boolean);
      
      const alertData = {
        keywords: keywordsArray,
        locations: locationsArray,
        jobTypes: jobTypes,
        salary: {
          min: salaryMin === '' ? 0 : Number(salaryMin),
          max: salaryMax === '' ? 0 : Number(salaryMax),
          currency: 'USD'
        },
        isActive,
        frequency
      };
      
      let response: { data: JobAlert };
      
      if (editingAlert) {
        response = await api.put<JobAlert>(`/api/job-alerts/${editingAlert._id}`, alertData, {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          }
        });
        
        setAlerts(prev => prev.map(alert => 
          alert._id === editingAlert._id ? response.data : alert
        ));
        
        setSnackbarMessage('Job alert updated successfully');
      } else {
        response = await api.post<JobAlert>(`/api/job-alerts`, alertData, {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          }
        });
        
        setAlerts(prev => [...prev, response.data]);
        setSnackbarMessage('Job alert created successfully');
      }
      
      handleCloseDialog();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSnackbarMessage('');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error saving job alert:', err);
      setError(err.response?.data?.message || 'Failed to save job alert');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job alert?')) {
      try {
        setLoading(true);
        const response: AxiosResponse<{ success: boolean; message: string }> = await api.delete(`/job-alerts/${id}`);
        if (response.data.success) {
          setAlerts(prev => prev.filter(alert => alert._id !== id));
          setError(null);
          setSnackbarMessage('Job alert deleted successfully');
        }
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
            onClick={() => handleOpenDialog()}
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
        
        {alerts.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              You don't have any job alerts yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Create alerts to get notified when new jobs match your criteria
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              sx={{ mt: 3 }}
              onClick={() => handleOpenDialog()}
            >
              Create Your First Alert
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {alerts.map((alert) => (
              <Grid item xs={12} md={6} key={alert._id}>
                <Card elevation={3}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" component="h2">
                        {alert.name}
                      </Typography>
                      <Chip 
                        label={alert.isActive ? 'Active' : 'Paused'} 
                        color={alert.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Keywords: {alert.keywords.join(', ') || 'Any'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Location: {alert.location || 'Any'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WorkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Job Type: {alert.jobType === 'any' ? 'Any' : alert.jobType}
                          {(Number(alert.salaryMin) > 0 || Number(alert.salaryMax) > 0) ? 
                            ` • Salary: ${Number(alert.salaryMin) > 0 ? `$${alert.salaryMin}` : 'Any'} - ${Number(alert.salaryMax) > 0 ? `$${alert.salaryMax}` : 'Any'}` 
                            : ''}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Frequency: {alert.frequency.charAt(0).toUpperCase() + alert.frequency.slice(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last sent: {formatDate(alert.lastSent)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={alert.isActive}
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
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
      
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingAlert ? 'Edit Job Alert' : 'Create Job Alert'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Alert Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                variant="outlined"
                placeholder="E.g., Software Developer Jobs in Boston"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="E.g., javascript, react, frontend"
                helperText="Separate keywords with commas"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="E.g., Boston, MA or Remote"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="job-type-select-label">Job Type</InputLabel>
                <Select
                  labelId="job-type-select-label"
                  value={jobType}
                  onChange={(e: SelectChangeEvent) => setJobType(e.target.value)}
                  label="Job Type"
                >
                  <MenuItem value="any">Any</MenuItem>
                  <MenuItem value="full-time">Full-time</MenuItem>
                  <MenuItem value="part-time">Part-time</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                  <MenuItem value="internship">Internship</MenuItem>
                  <MenuItem value="remote">Remote</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Min Salary ($)"
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
                variant="outlined"
                placeholder="0"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Max Salary ($)"
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
                variant="outlined"
                placeholder="0"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="frequency-select-label">Frequency</InputLabel>
                <Select
                  labelId="frequency-select-label"
                  value={frequency}
                  onChange={(e: SelectChangeEvent) => setFrequency(e.target.value)}
                  label="Frequency"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="immediate">Immediate</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 2 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Alert Active"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={!name}
          >
            {editingAlert ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default JobAlerts; 