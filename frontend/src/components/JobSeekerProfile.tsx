import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { userService, assessmentService } from '../services/api';
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
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  RadioGroup,
  FormControlLabel,
  FormHelperText,
  Radio,
  Tooltip,
  Badge
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckIcon from '@mui/icons-material/Check';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VerifiedIcon from '@mui/icons-material/Verified';

interface JobSeekerProfileData {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  phone?: string;
  location?: string;
  title?: string;
  skills?: string[];
  education?: {
    degree: string;
    institution: string;
    graduationYear: number;
  }[];
  experience?: {
    position: string;
    company: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }[];
  resume?: string;
}

const JobSeekerProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserContext } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<JobSeekerProfileData | null>(null);
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [newSkill, setNewSkill] = useState<string>('');
  const [verifiedSkills, setVerifiedSkills] = useState<string[]>([]);

  // Add new state variables for resume
  const [resumeUploading, setResumeUploading] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [showParsePreview, setShowParsePreview] = useState<boolean>(false);

  // Add state for Gemini API usage
  const [useGeminiAPI, setUseGeminiAPI] = useState<boolean>(true);
  const [parsingMode, setParsingMode] = useState<string>('auto');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/jobseeker/profile');
        setProfileData(response.data);
        
        // Set form values
        setProfileData(response.data);
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching job seeker profile:', err);
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.type === 'jobseeker') {
      fetchProfile();
    } else {
      setError('Only job seekers can access this page');
      setLoading(false);
    }
  }, [user]);

  // Add new useEffect to fetch verified skills from assessments
  useEffect(() => {
    const fetchVerifiedSkills = async () => {
      try {
        const assessments = await assessmentService.getMyAssessments();
        // Extract skills from passed assessments (score >= 70)
        const verifiedSkillsFromAssessments = assessments
          .filter(assessment => assessment.status === 'evaluated' && assessment.score >= 70)
          .map(assessment => assessment.skill);
        
        // Remove duplicates and set state
        setVerifiedSkills([...new Set(verifiedSkillsFromAssessments)]);
      } catch (err) {
        console.error('Error fetching verified skills:', err);
      }
    };

    if (user && user.type === 'jobseeker') {
      fetchVerifiedSkills();
    }
  }, [user]);

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      console.log('No file selected');
      return;
    }

    const file = event.target.files[0];
    console.log('Selected file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Use base64 upload instead of FormData for more reliable uploads
    try {
      setImageUploading(true);
      setError(null);
      
      // Read the file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Image = e.target?.result as string;
          console.log('Image converted to base64, length:', base64Image.length);
          
          // For debugging, let's log more details
          console.log('Base64 prefix:', base64Image.substring(0, 50));
          
          // Create a simple div to show the error in the UI for debugging
          const debugDiv = document.createElement('div');
          debugDiv.style.position = 'fixed';
          debugDiv.style.bottom = '10px';
          debugDiv.style.right = '10px';
          debugDiv.style.backgroundColor = 'white';
          debugDiv.style.border = '1px solid black';
          debugDiv.style.padding = '10px';
          debugDiv.style.zIndex = '9999';
          debugDiv.style.maxWidth = '500px';
          debugDiv.style.maxHeight = '300px';
          debugDiv.style.overflow = 'auto';
          document.body.appendChild(debugDiv);
          
          debugDiv.innerHTML = '<h3>Uploading image...</h3>';
          
          // First try a simple test to see if the API is working
          try {
            debugDiv.innerHTML += '<p>Testing API with GET /test...</p>';
            const testResponse = await api.get('/test');
            debugDiv.innerHTML += `<p>API test successful: ${testResponse.data.message}</p>`;
            
            // Now try the echo test
            debugDiv.innerHTML += '<p>Testing image echo with POST /test/echo...</p>';
            const echoResponse = await api.post('/test/echo', { 
              sample: 'data',
              smallImage: base64Image.substring(0, 100) 
            });
            debugDiv.innerHTML += `<p>Echo test response: ${echoResponse.data.message}</p>`;
            debugDiv.innerHTML += `<p>Echo received data size: ${echoResponse.data.receivedBodySize} bytes</p>`;
            
            // Now try the image test
            debugDiv.innerHTML += '<p>Testing image upload with POST /test/image...</p>';
            const imageTestResponse = await api.post('/test/image', { 
              image: base64Image 
            });
            debugDiv.innerHTML += `<p>Image test successful! Length: ${imageTestResponse.data.imageLength}</p>`;
            
            // If all tests pass, try the actual upload
            debugDiv.innerHTML += '<p>Sending request to /upload/profile-image-base64...</p>';
            
            const response = await api.post('/upload/profile-image-base64', {
              image: base64Image
            });
            
            debugDiv.innerHTML += `<p>Response received! Status: ${response.status}</p>`;
            debugDiv.innerHTML += `<p>Response data: ${JSON.stringify(response.data)}</p>`;
            
            console.log('Upload response:', response.status);
            console.log('Upload response data:', response.data);
            
            if (response.data && response.data.imageUrl) {
              console.log('Image uploaded successfully');
              debugDiv.innerHTML += '<p style="color:green">Image uploaded successfully!</p>';
              
              setProfileData(prevData => ({
                ...prevData,
                profileImage: base64Image
              }));
              if (updateUserContext && user) {
                updateUserContext({
                  ...user,
                  profileImage: base64Image
                });
              }
              setSuccess('Profile image uploaded successfully');
              
              // Remove debug div after 10 seconds
              setTimeout(() => {
                document.body.removeChild(debugDiv);
              }, 10000);
            } else {
              debugDiv.innerHTML += '<p style="color:red">No image URL in response</p>';
              setError('Failed to process uploaded image');
            }
          } catch (err: any) {
            console.error('Error in upload process:', err);
            debugDiv.innerHTML += `<p style="color:red">Error: ${err.message}</p>`;
            
            if (err.response) {
              debugDiv.innerHTML += `<p>Status: ${err.response.status}</p>`;
              debugDiv.innerHTML += `<p>Response data: ${JSON.stringify(err.response.data)}</p>`;
              debugDiv.innerHTML += `<p>Headers: ${JSON.stringify(err.response.headers)}</p>`;
            }
            
            console.error('Error details:', err.response?.data || 'No response data');
            setError(err.response?.data?.message || 'Failed to upload image');
            
            // Keep debug div visible on error
            setTimeout(() => {
              document.body.removeChild(debugDiv);
            }, 30000);
          }
        } catch (err: any) {
          console.error('Error processing image:', err);
          setError('Error processing image: ' + err.message);
          setImageUploading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Error reading file');
        setError('Error reading file');
        setImageUploading(false);
      };
      
      // Start reading the file
      reader.readAsDataURL(file);
      
    } catch (err: any) {
      console.error('Error preparing image:', err);
      setError('Error preparing image: ' + err.message);
      setImageUploading(false);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type (PDF or Word)
    const fileType = file.type;
    if (
      fileType !== 'application/pdf' && 
      fileType !== 'application/msword' && 
      fileType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      setError('Please upload a PDF or Word document');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size should not exceed 5MB');
      return;
    }
    
    try {
      setResumeUploading(true);
      setError(null);
      
      // Determine whether to use Gemini API based on user preference
      const useGemini = parsingMode === 'auto' ? true : parsingMode === 'gemini';
      
      // Show loading message with parsing method
      setSuccess(`Uploading and parsing resume using ${useGemini ? 'AI-enhanced parser' : 'standard parser'}...`);
      
      const result = await userService.uploadResume(file, useGemini);
      
      // Update the profile with parsed data
      setProfileData(prevData => ({
        ...prevData,
        ...result.user,
        skills: result.user.skills || prevData.skills,
        education: result.user.education || prevData.education,
        experience: result.user.experience || prevData.experience
      }));
      
      // Store the parsed data for preview
      setParsedData(result.parsed);
      
      // Show parse preview dialog
      setShowParsePreview(true);
      
      setSuccess('Resume uploaded and parsed successfully');
      
      // Update user context
      if (updateUserContext) {
        updateUserContext({
          ...user,
          ...result.user
        });
      }
      
    } catch (err: any) {
      console.error('Error uploading resume:', err);
      setError(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setResumeUploading(false);
    }
  };

  const handleApplyParsedData = () => {
    // Close the preview dialog
    setShowParsePreview(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData?.firstName || !profileData?.lastName) {
      setError('First name and last name are required');
      return;
    }

    try {
      setSaveLoading(true);
      setError(null);
      setSuccess(null);

      const skillsArray = profileData.skills ? profileData.skills.map(skill => skill.trim()) : [];

      const profileUpdateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        location: profileData.location,
        title: profileData.title,
        skills: skillsArray,
        profileImage: profileData.profileImage
      };

      const response = await api.put('/jobseeker/profile', profileUpdateData);
      setProfileData(response.data);
      
      if (updateUserContext && user) {
        updateUserContext({
          ...user,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          location: profileData.location,
          profileImage: profileData.profileImage
        });
      }
      
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper function to handle image display
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return '';
    
    // If it's already a data URI (base64), return as is
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If it's a relative path starting with /uploads
    if (imagePath.startsWith('/uploads')) {
      // For development, prepend the base URL without the /api part
      return `http://localhost:5000${imagePath}`;
    }
    
    // Otherwise return as is (might be a full URL)
    return imagePath;
  };

  // Add a helper function to check if a skill is verified
  const isSkillVerified = (skill: string): boolean => {
    return verifiedSkills.includes(skill);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* User profile header */}
        <Box display="flex" alignItems="center" mb={4}>
          <Avatar
            src={profileData?.profileImage || undefined}
            sx={{ width: 100, height: 100, mr: 3 }}
          >
            {!profileData?.profileImage && <PersonIcon fontSize="large" />}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              {profileData?.firstName} {profileData?.lastName}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {profileData?.title || 'Your Job Title'}
            </Typography>
            <Box mt={1}>
              <input
                type="file"
                accept="image/*"
                id="profile-image-upload"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<CameraAltIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
              >
                {imageUploading ? 'Uploading...' : 'Change Photo'}
              </Button>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Resume upload section */}
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Resume
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Parsing Options
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup 
                row 
                value={parsingMode} 
                onChange={(e) => setParsingMode(e.target.value)}
              >
                <FormControlLabel value="auto" control={<Radio />} label="Auto (recommended)" />
                <FormControlLabel value="gemini" control={<Radio />} label="AI-enhanced" />
                <FormControlLabel value="local" control={<Radio />} label="Standard" />
              </RadioGroup>
              <FormHelperText>
                AI-enhanced parsing uses Google's Gemini for more accurate results but may take longer.
              </FormHelperText>
            </FormControl>
          </Box>
          
          <Box display="flex" alignItems="center" mb={2}>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              id="resume-upload"
              style={{ display: 'none' }}
              ref={resumeInputRef}
              onChange={handleResumeUpload}
            />
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => resumeInputRef.current?.click()}
              disabled={resumeUploading}
              sx={{ mr: 2 }}
            >
              {resumeUploading ? 'Uploading...' : 'Upload Resume'}
            </Button>
            
            <Typography variant="body2" color="textSecondary">
              Upload your resume and we'll automatically extract your professional details
            </Typography>
          </Box>
          
          {resumeUploading && (
            <Box display="flex" alignItems="center" mt={1}>
              <CircularProgress size={24} sx={{ mr: 2 }} />
              <Typography variant="body2">
                Analyzing your resume with {parsingMode === 'local' ? 'standard' : 'AI-enhanced'} parsing...
              </Typography>
            </Box>
          )}
          
          {profileData?.resume && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Current Resume
              </Typography>
              <Button
                variant="text"
                startIcon={<DescriptionIcon />}
                component="a"
                href={profileData.resume}
                target="_blank"
              >
                View Uploaded Resume
              </Button>
            </Box>
          )}
        </Box>

        {/* Rest of your profile form here */}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                variant="outlined"
                value={profileData?.firstName}
                onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                variant="outlined"
                value={profileData?.lastName}
                onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                variant="outlined"
                value={profileData?.email}
                disabled
                helperText="Email cannot be changed"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                variant="outlined"
                value={profileData?.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                variant="outlined"
                value={profileData?.location}
                onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Professional Title"
                variant="outlined"
                value={profileData?.title}
                onChange={(e) => setProfileData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Senior Software Engineer"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Skills"
                variant="outlined"
                value={profileData?.skills ? profileData.skills.join(', ') : ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, skills: e.target.value.split(',').map(skill => skill.trim()) }))}
                placeholder="e.g. JavaScript, React, Node.js"
                helperText="Separate skills with commas"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={saveLoading}
              sx={{ minWidth: 150 }}
            >
              {saveLoading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Box>
        </form>

        {/* Skills section */}
        <Box mb={4}>
          <Box display="flex" alignItems="center">
            <Typography variant="h6" gutterBottom>
              Skills
            </Typography>
            <Box ml={2}>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<VerifiedIcon />} 
                onClick={() => navigate('/assessments')}
              >
                Verify Skills with Assessments
              </Button>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          <Box mb={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {profileData?.skills?.map((skill, index) => (
                <Tooltip 
                  key={index}
                  title={isSkillVerified(skill) ? "Verified with Skill Assessment" : "Take an assessment to verify this skill"}
                >
                  <Badge
                    badgeContent={isSkillVerified(skill) ? <VerifiedIcon color="primary" fontSize="small" /> : 0}
                    overlap="circular"
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <Chip
                      label={skill}
                      onDelete={() => {
                        const updatedSkills = [...(profileData.skills || [])];
                        updatedSkills.splice(index, 1);
                        setProfileData(prev => prev ? {...prev, skills: updatedSkills} : null);
                      }}
                      sx={{ 
                        mb: 1,
                        bgcolor: isSkillVerified(skill) ? 'rgba(25, 118, 210, 0.08)' : undefined,
                        fontWeight: isSkillVerified(skill) ? 'bold' : undefined
                      }}
                    />
                  </Badge>
                </Tooltip>
              ))}
            </Stack>
          </Box>
          
          <Box display="flex">
            <TextField
              label="Add Skill"
              variant="outlined"
              size="small"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              sx={{ mr: 1 }}
            />
            <Button
              variant="contained"
              onClick={() => {
                if (newSkill.trim() !== '') {
                  setProfileData(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      skills: [...(prev.skills || []), newSkill.trim()]
                    };
                  });
                  setNewSkill('');
                }
              }}
              disabled={!newSkill}
              startIcon={<AddIcon />}
            >
              Add
            </Button>
          </Box>
        </Box>

        {/* Experience section */}
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Experience
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {profileData?.experience?.map((exp, index) => (
            <Box key={index} mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle1">{exp.position}</Typography>
                  <Typography variant="body2">{exp.company}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                  </Typography>
                  <Typography variant="body2" mt={1}>
                    {exp.description}
                  </Typography>
                </Box>
                <Box>
                  <IconButton size="small" onClick={() => handleEditExperience(index)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteExperience(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))}
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleAddExperience()}
            sx={{ mt: 1 }}
          >
            Add Experience
          </Button>
        </Box>

        {/* Education section */}
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Education
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {profileData?.education?.map((edu, index) => (
            <Box key={index} mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle1">{edu.degree}</Typography>
                  <Typography variant="body2">{edu.institution}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Graduation Year: {edu.graduationYear}
                  </Typography>
                  {edu.fieldOfStudy && (
                    <Typography variant="body2">
                      Field of Study: {edu.fieldOfStudy}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <IconButton size="small" onClick={() => handleEditEducation(index)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteEducation(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))}
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleAddEducation()}
            sx={{ mt: 1 }}
          >
            Add Education
          </Button>
        </Box>

        {/* Save button */}
        <Box mt={4} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={saveLoading}
          >
            {saveLoading ? 'Saving...' : 'Save Profile'}
          </Button>
        </Box>
      </Paper>

      {/* Resume parsed data preview dialog */}
      <Dialog open={showParsePreview} onClose={() => setShowParsePreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>Resume Parsing Results</DialogTitle>
        <DialogContent dividers>
          {parsedData ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                We extracted the following information from your resume:
              </Typography>
              
              {/* Skills */}
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  <WorkIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Skills
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {parsedData.skills.map((skill: string, index: number) => (
                    <Chip key={index} label={skill} color="primary" variant="outlined" size="small" />
                  ))}
                </Box>
              </Box>
              
              {/* Experience */}
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  <WorkIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Experience
                </Typography>
                <List dense>
                  {parsedData.experience.map((exp: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <WorkIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${exp.position} at ${exp.company}`}
                        secondary={`${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              
              {/* Education */}
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  <SchoolIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Education
                </Typography>
                <List dense>
                  {parsedData.education.map((edu: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <SchoolIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${edu.degree} from ${edu.institution}`}
                        secondary={`Graduated: ${edu.graduationYear}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              
              {/* Personal Info */}
              {parsedData.personalInfo && (
                <Box mb={3}>
                  <Typography variant="subtitle1" gutterBottom>
                    <PersonIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Personal Information
                  </Typography>
                  <List dense>
                    {parsedData.personalInfo.title && (
                      <ListItem>
                        <ListItemText primary="Title" secondary={parsedData.personalInfo.title} />
                      </ListItem>
                    )}
                    {parsedData.personalInfo.location && (
                      <ListItem>
                        <ListItemText primary="Location" secondary={parsedData.personalInfo.location} />
                      </ListItem>
                    )}
                    {parsedData.personalInfo.phone && (
                      <ListItem>
                        <ListItemText primary="Phone" secondary={parsedData.personalInfo.phone} />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
            </Box>
          ) : (
            <Typography>No parsing data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowParsePreview(false)}>Close</Button>
          <Button onClick={handleApplyParsedData} variant="contained" color="primary">
            Accept Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default JobSeekerProfile; 