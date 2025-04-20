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
  Avatar,
  IconButton
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

interface PersonalProfileData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  profileImage?: string;
}

const EmployerPersonalProfile: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<PersonalProfileData | null>(null);
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/employer/profile');
        setProfileData(response.data);
        
        // Set form values
        setName(response.data.name || '');
        setEmail(response.data.email || '');
        setPhone(response.data.phone || '');
        setLocation(response.data.location || '');
        setProfileImage(response.data.profileImage || '');
        
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
    console.log('*** PROFILE IMAGE UPLOAD PROCESS STARTED ***');
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
      formData.append('profile', file, file.name);
      
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
        xhr.open('POST', 'http://localhost:5000/api/employer/upload-profile-image');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Upload successful, response:', xhr.responseText);
            try {
              const data = JSON.parse(xhr.responseText);
              if (data && data.profileImageUrl) {
                setProfileImage(data.profileImageUrl);
                setSuccess('Profile image uploaded successfully');
                
                // Update user context if available
                if (updateUserContext && user) {
                  const updatedUser = {
                    ...user,
                    profileImage: data.profileImageUrl
                  };
                  updateUserContext(updatedUser as User);
                }
                resolve();
              } else {
                setError('Failed to get profile image URL from server');
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
        setError(err.message || 'Failed to upload profile image');
      })
      .finally(() => {
        setImageUploading(false);
        console.log('*** PROFILE IMAGE UPLOAD PROCESS ENDED ***');
      });
    } catch (err: any) {
      console.error('Error setting up upload:', err);
      setError(err.message || 'Failed to upload profile image');
      setImageUploading(false);
      console.log('*** PROFILE IMAGE UPLOAD PROCESS ENDED WITH ERROR ***');
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
        phone,
        location,
        profileImage
      };
      
      const response = await api.put('/employer/personal-profile', profileDataToUpdate);
      
      setProfileData(response.data);
      setSuccess('Personal profile updated successfully');

      // Update user context if available
      if (updateUserContext && user) {
        const updatedUser = {
          ...user,
          name,
          phone,
          location,
          profileImage
        };
        // Type assertion to make TypeScript happy
        updateUserContext(updatedUser as User);
      }
    } catch (err: any) {
      console.error('Error updating personal profile:', err);
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
                bgcolor: profileImage ? 'transparent' : 'primary.main' 
              }}
              alt={name}
              src={profileImage}
            >
              {!profileImage && <PersonIcon fontSize="large" />}
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
              Personal Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your personal information
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
                label="Your Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                value={email}
                disabled
                fullWidth
                variant="outlined"
                helperText="Email cannot be changed"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone Number"
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

export default EmployerPersonalProfile; 