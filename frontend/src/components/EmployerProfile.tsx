import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User } from '../types';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Avatar,
  IconButton
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface EmployerProfileData {
  _id: string;
  name: string;
  email: string;
  companyName: string;
  companyDescription: string;
  companyLogo?: string;
  companyWebsite?: string;
  companySize?: string;
  industry?: string;
  foundedYear?: number;
  phone?: string;
  location?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

const companySizes = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+'
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Media',
  'Construction',
  'Transportation',
  'Government',
  'Hospitality',
  'Other'
];

const EmployerProfile: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<EmployerProfileData | null>(null);
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [companyName, setCompanyName] = useState<string>('');
  const [companyDescription, setCompanyDescription] = useState<string>('');
  const [companyWebsite, setCompanyWebsite] = useState<string>('');
  const [companySize, setCompanySize] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [foundedYear, setFoundedYear] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [linkedin, setLinkedin] = useState<string>('');
  const [twitter, setTwitter] = useState<string>('');
  const [facebook, setFacebook] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [name, setName] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/employer/profile');
        setProfileData(response.data);
        
        // Set form values
        setName(response.data.name || '');
        setCompanyName(response.data.companyName || '');
        setCompanyDescription(response.data.companyDescription || '');
        setCompanyWebsite(response.data.companyWebsite || '');
        setCompanySize(response.data.companySize || '');
        setIndustry(response.data.industry || '');
        setFoundedYear(response.data.foundedYear?.toString() || '');
        setPhone(response.data.phone || '');
        setLocation(response.data.location || '');
        setCompanyLogo(response.data.companyLogo || '');
        
        // Social media
        if (response.data.socialMedia) {
          setLinkedin(response.data.socialMedia.linkedin || '');
          setTwitter(response.data.socialMedia.twitter || '');
          setFacebook(response.data.socialMedia.facebook || '');
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching employer profile:', err);
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.type === 'employer') {
      fetchProfile();
    } else {
      setError('Only employers can access this page');
      setLoading(false);
    }
  }, [user]);

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('*** IMAGE UPLOAD PROCESS STARTED ***');
    const fileInput = event.target;
    const file = fileInput.files?.[0];
    
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Selected file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setImageUploading(true);
      setError(null);
      
      // Create a FormData object
      const formData = new FormData();
      formData.append('logo', file, file.name);
      
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      console.log('Using direct XMLHttpRequest instead of fetch');
      
      // Using XMLHttpRequest which is more reliable for form-data
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:5000/api/employer/upload-logo');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Upload successful, response:', xhr.responseText);
            try {
              const data = JSON.parse(xhr.responseText);
              if (data && data.logoUrl) {
                setCompanyLogo(data.logoUrl);
                setSuccess('Logo uploaded successfully');
                
                // Update user context if available
                if (updateUserContext && user) {
                  const updatedUser = {
                    ...user,
                    companyLogo: data.logoUrl
                  };
                  updateUserContext(updatedUser as User);
                }
                resolve();
              } else {
                setError('Failed to get logo URL from server');
                reject(new Error('Invalid response format'));
              }
            } catch (e) {
              console.error('Failed to parse JSON response:', xhr.responseText);
              setError('Failed to parse server response');
              reject(e);
            }
          } else {
            console.error('Upload failed:', xhr.status, xhr.statusText, xhr.responseText);
            setError(`Upload failed: ${xhr.status} ${xhr.statusText}`);
            reject(new Error(`HTTP error ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          console.error('Network error during upload');
          setError('Network error during upload');
          reject(new Error('Network error'));
        };
        
        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            console.log(`Upload progress: ${percentComplete}%`);
          }
        };
        
        xhr.send(formData);
      })
      .catch(err => {
        console.error('Error in XMLHttpRequest:', err);
        setError(err.message || 'Failed to upload logo');
      })
      .finally(() => {
        setImageUploading(false);
        console.log('*** IMAGE UPLOAD PROCESS ENDED ***');
      });
    } catch (err: any) {
      console.error('Error setting up upload:', err);
      setError(err.message || 'Failed to upload logo');
      setImageUploading(false);
      console.log('*** IMAGE UPLOAD PROCESS ENDED WITH ERROR ***');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaveLoading(true);
      setError(null);
      setSuccess(null);
      
      const profileDataToUpdate = {
        name,
        companyName,
        companyDescription,
        companyWebsite,
        companySize,
        industry,
        foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
        phone,
        location,
        companyLogo,
        socialMedia: {
          linkedin,
          twitter,
          facebook
        }
      };
      
      const response = await api.put('/employer/profile', profileDataToUpdate);
      
      setProfileData(response.data);
      setSuccess('Profile updated successfully');

      // Update user context if available
      if (updateUserContext && user) {
        const updatedUser = {
          ...user,
          name,
          companyName,
          companyDescription,
          companyLogo
        };
        // Type assertion to make TypeScript happy
        updateUserContext(updatedUser as User);
      }
    } catch (err: any) {
      console.error('Error updating employer profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading profile...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', mr: 3 }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: companyLogo ? 'transparent' : 'primary.main' 
              }}
              alt={companyName}
              src={companyLogo}
            >
              {!companyLogo && <BusinessIcon fontSize="large" />}
            </Avatar>
            <IconButton 
              onClick={handleProfileImageClick}
              sx={{ 
                position: 'absolute', 
                bottom: -4, 
                right: -4, 
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                },
                width: 30,
                height: 30
              }}
            >
              <CameraAltIcon fontSize="small" />
            </IconButton>
            <input 
              type="file" 
              hidden 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*"
            />
          </Box>
          <Box>
            <Typography variant="h4" component="h1">
              Company Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your company's public profile information
            </Typography>
            {imageUploading && (
              <Typography variant="body2" color="text.secondary">
                Uploading image...
              </Typography>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Website"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="https://example.com"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Company Description"
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                fullWidth
                required
                variant="outlined"
                multiline
                rows={4}
                placeholder="Describe your company, mission, culture, and what makes it a great place to work"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="company-size-label">Company Size</InputLabel>
                <Select
                  labelId="company-size-label"
                  value={companySize}
                  onChange={(e: SelectChangeEvent) => setCompanySize(e.target.value)}
                  label="Company Size"
                >
                  <MenuItem value=""><em>Select size</em></MenuItem>
                  {companySizes.map((size) => (
                    <MenuItem key={size} value={size}>{size}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="industry-label">Industry</InputLabel>
                <Select
                  labelId="industry-label"
                  value={industry}
                  onChange={(e: SelectChangeEvent) => setIndustry(e.target.value)}
                  label="Industry"
                >
                  <MenuItem value=""><em>Select industry</em></MenuItem>
                  {industries.map((ind) => (
                    <MenuItem key={ind} value={ind}>{ind}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Founded Year"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                fullWidth
                variant="outlined"
                type="number"
                inputProps={{ min: 1800, max: new Date().getFullYear() }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="City, State, Country"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Social Media
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="LinkedIn"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="LinkedIn URL"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Twitter"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="Twitter URL"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Facebook"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="Facebook URL"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={saveLoading}
                  sx={{ minWidth: 150 }}
                >
                  {saveLoading ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default EmployerProfile; 