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
  Badge,
  Checkbox,
  CheckboxProps,
  Tabs,
  Tab,
  useTheme,
  Theme
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
    fieldOfStudy?: string;
  }[];
  experience?: {
    _id?: string;
    position: string;
    company: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }[];
  resume?: string;
  totalYearsExperience?: number;
}

// Add assessment interface for proper typing
interface Assessment {
  status: string;
  score: number;
  skill: string;
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

  // Add state for experience and education dialogs
  const [experienceDialogOpen, setExperienceDialogOpen] = useState<boolean>(false);
  const [educationDialogOpen, setEducationDialogOpen] = useState<boolean>(false);
  const [currentExperienceIndex, setCurrentExperienceIndex] = useState<number | null>(null);
  const [currentEducationIndex, setCurrentEducationIndex] = useState<number | null>(null);
  const [currentExperience, setCurrentExperience] = useState<{
    _id?: string;
    position: string;
    company: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }>({
    position: '',
    company: '',
    startDate: '',
    endDate: '',
    current: false,
    description: ''
  });
  const [currentEducation, setCurrentEducation] = useState<{
    degree: string;
    institution: string;
    graduationYear: number;
    fieldOfStudy?: string;
  }>({
    degree: '',
    institution: '',
    graduationYear: new Date().getFullYear(),
    fieldOfStudy: ''
  });

  // Add new state variables for resume
  const [resumeUploading, setResumeUploading] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [showParsePreview, setShowParsePreview] = useState<boolean>(false);

  // Add state for Gemini API usage
  const [parsingMode, setParsingMode] = useState<string>('auto');

  const theme = useTheme();

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
        const assessments = await assessmentService.getMyAssessments() as Assessment[];
        // Extract skills from passed assessments (score >= 70)
        const verifiedSkillsFromAssessments = assessments
          .filter((assessment: Assessment) => assessment.status === 'evaluated' && assessment.score >= 70)
          .map((assessment: Assessment) => assessment.skill);
        
        // Remove duplicates and set state
        const uniqueSkills = new Set<string>(verifiedSkillsFromAssessments);
        setVerifiedSkills(Array.from(uniqueSkills));
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
              
              setProfileData(prevData => {
                if (!prevData) return null;
                return {
                  ...prevData,
                  profileImage: base64Image
                };
              });
              
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
      setProfileData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          ...result.user,
          skills: result.user.skills || prevData.skills,
          education: result.user.education || prevData.education,
          experience: result.user.experience || prevData.experience
        };
      });
      
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

  // Utility to format date string (from ISO or other formats) to MM/YYYY
  const formatToMonthYear = (dateString: string | Date | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ''; // Invalid date
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    } catch (e) {
      return ''; // Return empty if any error
    }
  };

  // Utility to convert MM/YYYY string to a date object (start of month)
  const parseMonthYear = (monthYear: string | undefined): Date | null => {
    if (!monthYear || !/^(0[1-9]|1[0-2])\/\d{4}$/.test(monthYear)) {
      return null; // Invalid format
    }
    try {
      const [month, year] = monthYear.split('/').map(Number);
      // Return date object for the 1st day of the month
      return new Date(year, month - 1, 1); // Use local timezone constructor
    } catch (e) {
      return null;
    }
  };

  // Experience handlers
  const handleAddExperience = () => {
    setCurrentExperience({
      position: '',
      company: '',
      startDate: '',
      endDate: '',
      current: false,
      description: ''
    });
    setCurrentExperienceIndex(null);
    setExperienceDialogOpen(true);
  };

  const handleEditExperience = (index: number) => {
    if (profileData?.experience && profileData.experience[index]) {
      const expToEdit = profileData.experience[index];
      console.log("[JobSeekerProfile] Editing experience:", expToEdit); // Log item being edited
      setCurrentExperience({
        _id: expToEdit._id, // Make sure to copy the _id
        position: expToEdit.position,
        company: expToEdit.company,
        description: expToEdit.description,
        current: expToEdit.current,
        // Format dates for display
        startDate: formatToMonthYear(expToEdit.startDate),
        endDate: formatToMonthYear(expToEdit.endDate)
      });
      setCurrentExperienceIndex(index); // Keep index for mapping fallback
      setExperienceDialogOpen(true);
    }
  };

  const handleDeleteExperience = (index: number) => {
    if (profileData?.experience) {
      setProfileData(prev => {
        if (!prev) return null;
        const newExperience = [...prev.experience!];
        newExperience.splice(index, 1);
        return {
          ...prev,
          experience: newExperience
        };
      });
    }
  };

  const handleSaveExperience = () => {
    // Validate required fields
    if (!currentExperience.position || !currentExperience.company || !currentExperience.startDate) {
      setError('Position, company and start date (MM/YYYY) are required for experience');
      return;
    }
    
    // Validate date formats before saving
    const parsedStartDate = parseMonthYear(currentExperience.startDate);
    const parsedEndDate = currentExperience.current ? null : parseMonthYear(currentExperience.endDate);

    if (!parsedStartDate) {
        setError('Invalid Start Date format. Please use MM/YYYY.');
        return;
    }
    if (!currentExperience.current && currentExperience.endDate && !parsedEndDate) {
        setError('Invalid End Date format. Please use MM/YYYY.');
        return;
    }
    // Optional: Check if end date is before start date
    if (!currentExperience.current && parsedEndDate && parsedStartDate && parsedEndDate < parsedStartDate) {
      setError('End Date cannot be before Start Date.');
      return;
    }

    // Prepare the object with validated/formatted data, but DON'T update main state yet
    const experienceToSave = {
        ...currentExperience, // Includes _id if editing
        startDate: parsedStartDate.toISOString().split('T')[0], 
        endDate: currentExperience.current ? undefined : (parsedEndDate ? parsedEndDate.toISOString().split('T')[0] : undefined)
    };
    
    // Store the validated/formatted data back into currentExperience state
    // This assumes setCurrentExperience can handle the object with _id
    setCurrentExperience(experienceToSave); 

    console.log('[JobSeekerProfile] Validated/formatted experience ready in currentExperience state:', experienceToSave);

    setError(null); // Clear error on successful save prep
    setExperienceDialogOpen(false); // Close the dialog
  };

  // Education handlers
  const handleAddEducation = () => {
    setCurrentEducation({
      degree: '',
      institution: '',
      graduationYear: new Date().getFullYear(),
      fieldOfStudy: ''
    });
    setCurrentEducationIndex(null);
    setEducationDialogOpen(true);
  };

  const handleEditEducation = (index: number) => {
    if (profileData?.education && profileData.education[index]) {
      setCurrentEducation({
        ...profileData.education[index],
        fieldOfStudy: profileData.education[index].fieldOfStudy || ''
      });
      setCurrentEducationIndex(index);
      setEducationDialogOpen(true);
    }
  };

  const handleDeleteEducation = (index: number) => {
    if (profileData?.education) {
      setProfileData(prev => {
        if (!prev) return null;
        const newEducation = [...prev.education!];
        newEducation.splice(index, 1);
        return {
          ...prev,
          education: newEducation
        };
      });
    }
  };

  const handleSaveEducation = () => {
    if (!currentEducation.degree || !currentEducation.institution) {
      setError('Degree and institution are required for education');
      return;
    }

    setProfileData(prev => {
      if (!prev) return null;
      const newEducation = [...(prev.education || [])];
      
      if (currentEducationIndex !== null) {
        // Edit existing education
        newEducation[currentEducationIndex] = currentEducation;
      } else {
        // Add new education
        newEducation.push(currentEducation);
      }
      
      return {
        ...prev,
        education: newEducation
      };
    });
    
    setEducationDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Log the state as soon as handleSubmit is called
    console.log('[JobSeekerProfile] handleSubmit called. Current profileData state:', profileData);

    if (!profileData?.firstName || !profileData?.lastName) {
      setError('First name and last name are required');
      return;
    }

    try {
      setSaveLoading(true);
      setError(null);
      setSuccess(null);

      // --- Merge pending dialog changes before creating payload --- 
      let finalExperienceArray = profileData.experience || [];
      if (currentExperienceIndex !== null && currentExperience) { // Check if an edit was pending
         console.log(`[JobSeekerProfile] Merging pending experience edit at index ${currentExperienceIndex}`);
         finalExperienceArray = finalExperienceArray.map((exp, index) => 
             index === currentExperienceIndex ? currentExperience : exp
         );
      }
      // NOTE: Add similar logic here for education if needed (currentEducationIndex)
      // --- End merge --- 

      const skillsArray = profileData.skills ? profileData.skills.map(skill => skill.trim()) : [];

      const profileUpdateData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        location: profileData.location,
        title: profileData.title,
        skills: skillsArray,
        totalYearsExperience: profileData.totalYearsExperience,
        profileImage: profileData.profileImage,
        education: profileData.education, // Assuming education dialog updates state directly or needs similar merge
        experience: finalExperienceArray // Use the potentially merged array
      };

      // Log the data being sent
      console.log('[JobSeekerProfile] Sending update data:', profileUpdateData);

      const response = await api.put('/jobseeker/profile', profileUpdateData);
      
      // Log the response from the backend
      console.log('[JobSeekerProfile] Received response data:', response.data);

      const updatedProfile = response.data as JobSeekerProfileData;
      // Log the specific profile data received to check experience
      console.log('[JobSeekerProfile] Profile data set after update:', updatedProfile);
      setProfileData(updatedProfile); 
      
      // Reset pending edit state after successful save
      setCurrentExperienceIndex(null); 
      // setCurrentEducationIndex(null); // Add if handling education similarly

      // Update only the fields that exist in the AuthContext User type
      if (user && updatedProfile) {
          updateUserContext({ 
              ...user, // Spread existing context user
              _id: user._id, 
              id: user.id, // Include id if it exists in your context type
              email: user.email, 
              type: user.type, 
              name: `${updatedProfile.firstName} ${updatedProfile.lastName}`, // Update name
              firstName: updatedProfile.firstName, // Update firstName if needed by context
              lastName: updatedProfile.lastName, // Update lastName if needed by context
              profileImage: updatedProfile.profileImage, // Update profileImage if needed by context
              // Ensure NO fields like totalYearsExperience, skills, title, etc., are added here
              // unless they are EXPLICITLY defined in the User type in src/types/index.ts
          });
      }
      setSuccess('Profile updated successfully!');
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
        <form onSubmit={handleSubmit} id="jobseeker-profile-form">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="First Name"
                variant="outlined"
                value={profileData?.firstName}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                required
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Last Name"
                variant="outlined"
                value={profileData?.lastName}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                required
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <TextField
                fullWidth
                label="Email"
                variant="outlined"
                value={profileData?.email}
                disabled
                helperText="Email cannot be changed"
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Phone"
                variant="outlined"
                value={profileData?.phone}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, phone: e.target.value } : null)}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Location"
                variant="outlined"
                value={profileData?.location}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, location: e.target.value } : null)}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <TextField
                fullWidth
                label="Professional Title"
                variant="outlined"
                value={profileData?.title}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="e.g. Senior Software Engineer"
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <TextField
                fullWidth
                label="Skills"
                variant="outlined"
                value={profileData?.skills ? profileData.skills.join(', ') : ''}
                onChange={(e) => setProfileData(prev => prev ? { ...prev, skills: e.target.value.split(',').map(skill => skill.trim()) } : null)}
                placeholder="e.g. JavaScript, React, Node.js"
                helperText="Separate skills with commas"
                multiline
                rows={2}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <TextField
                fullWidth
                label="Total Years of Experience"
                type="number"
                value={profileData?.totalYearsExperience ?? ''} // Use optional chaining and nullish coalescing
                onChange={(e) => {
                  const value = e.target.value;
                  if (profileData) { // Check profileData is not null
                      setProfileData({
                        ...profileData,
                        // Set to undefined if empty, otherwise parse valid non-negative integer
                        totalYearsExperience: value === '' ? undefined : (
                          !isNaN(parseInt(value, 10)) && parseInt(value, 10) >= 0 
                            ? parseInt(value, 10) 
                            : profileData.totalYearsExperience // Keep previous value if invalid input
                        )
                      });
                  }
                }}
                margin="normal"
              />
            </Box>
          </Box>
          
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
                        if (profileData?.skills) {
                          const updatedSkills = [...profileData.skills];
                          updatedSkills.splice(index, 1);
                          setProfileData(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              skills: updatedSkills
                            };
                          });
                        }
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
                if (newSkill.trim() !== '' && profileData) {
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
                    {formatToMonthYear(exp.startDate)} - {exp.current ? 'Present' : formatToMonthYear(exp.endDate)}
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
            type="submit"
            disabled={saveLoading}
            form="jobseeker-profile-form"
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

      {/* Experience Dialog */}
      <Dialog open={experienceDialogOpen} onClose={() => setExperienceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{currentExperienceIndex !== null ? 'Edit Experience' : 'Add Experience'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: (theme: Theme) => theme.spacing(-1) }}>
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Position"
                required
                value={currentExperience.position}
                onChange={(e) => setCurrentExperience(prev => ({ ...prev, position: e.target.value }))}
                margin="normal"
              />
            </Box>
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Company"
                required
                value={currentExperience.company}
                onChange={(e) => setCurrentExperience(prev => ({ ...prev, company: e.target.value }))}
                margin="normal"
              />
            </Box>
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Start Date"
                required
                value={currentExperience.startDate}
                onChange={(e) => setCurrentExperience(prev => ({ ...prev, startDate: e.target.value }))}
                margin="normal"
                placeholder="MM/YYYY"
              />
            </Box>
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' }, display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={currentExperience.current}
                    onChange={(e) => setCurrentExperience(prev => ({ ...prev, current: e.target.checked }))}
                  />
                }
                label="Currently working here"
              />
            </Box>
            {!currentExperience.current && (
              <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
                <TextField
                  fullWidth
                  label="End Date"
                  value={currentExperience.endDate || ''}
                  onChange={(e) => setCurrentExperience(prev => ({ ...prev, endDate: e.target.value }))}
                  margin="normal"
                  placeholder="MM/YYYY"
                />
              </Box>
            )}
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: '100%' }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={currentExperience.description || ''}
                onChange={(e) => setCurrentExperience(prev => ({ ...prev, description: e.target.value }))}
                margin="normal"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExperienceDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveExperience} variant="contained" color="primary">
            Save Experience
          </Button>
        </DialogActions>
      </Dialog>

      {/* Education Dialog */}
      <Dialog open={educationDialogOpen} onClose={() => setEducationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{currentEducationIndex !== null ? 'Edit Education' : 'Add Education'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: (theme: Theme) => theme.spacing(-1) }}>
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Degree"
                required
                value={currentEducation.degree}
                onChange={(e) => setCurrentEducation(prev => ({ ...prev, degree: e.target.value }))}
                margin="normal"
              />
            </Box>
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Institution"
                required
                value={currentEducation.institution}
                onChange={(e) => setCurrentEducation(prev => ({ ...prev, institution: e.target.value }))}
                margin="normal"
              />
            </Box>
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Graduation Year"
                type="number"
                required
                value={currentEducation.graduationYear}
                onChange={(e) => setCurrentEducation(prev => ({ ...prev, graduationYear: parseInt(e.target.value) }))}
                margin="normal"
              />
            </Box>
            <Box sx={{ padding: (theme: Theme) => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
              <TextField
                fullWidth
                label="Field of Study"
                value={currentEducation.fieldOfStudy || ''}
                onChange={(e) => setCurrentEducation(prev => ({ ...prev, fieldOfStudy: e.target.value }))}
                margin="normal"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEducationDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEducation} variant="contained" color="primary">
            Save Education
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default JobSeekerProfile;