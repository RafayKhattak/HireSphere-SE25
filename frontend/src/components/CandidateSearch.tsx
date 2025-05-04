import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { employerService } from '../services/api';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Rating,
  Tooltip,
  IconButton,
  Checkbox
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import MessageIcon from '@mui/icons-material/Message';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';

interface CandidateSearchParams {
  skills: string;
  experience: string;
  location: string;
  useAI: boolean;
}

interface Candidate {
  _id: string;
  firstName: string;
  lastName: string;
  title?: string;
  location?: string;
  skills?: string[];
  experience?: Array<{
    position: string;
    company: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    graduationYear: number;
  }>;
  profileImage?: string;
  matchScore?: number;
  strengths?: string[];
  gaps?: string[];
}

const CandidateSearch: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<CandidateSearchParams>({
    skills: '',
    experience: '',
    location: '',
    useAI: true
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalCandidates, setTotalCandidates] = useState<number>(0);
  const [isAIEnhanced, setIsAIEnhanced] = useState<boolean>(false);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [savedCandidates, setSavedCandidates] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ totalPages: 1, currentPage: 1, totalCandidates: 0 });

  // Check if user is authorized (must be an employer)
  useEffect(() => {
    if (user && user.type !== 'employer') {
      setError('Only employers can access this page');
    }
  }, [user]);

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchParams.skills && !searchParams.experience && !searchParams.location) {
      setError('Please enter at least one search parameter');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSearchPerformed(true);
      
      // Ensure experience is a number or undefined before passing
      const numericExperience = searchParams.experience === 'any' || searchParams.experience === '' ? undefined : Number(searchParams.experience);
      
      const searchParamsToSend = {
        skills: searchParams.skills || undefined,
        experience: numericExperience,
        location: searchParams.location || undefined,
        useAI: searchParams.useAI
      };
      
      // Remove undefined properties explicitly to match expected type
      const cleanParams: { skills?: string; experience?: number; location?: string; useAI?: boolean } = {};
      if (searchParamsToSend.skills) cleanParams.skills = searchParamsToSend.skills;
      if (searchParamsToSend.experience !== undefined) cleanParams.experience = searchParamsToSend.experience;
      if (searchParamsToSend.location) cleanParams.location = searchParamsToSend.location;
      if (searchParamsToSend.useAI !== undefined) cleanParams.useAI = searchParamsToSend.useAI;

      const response = await employerService.searchCandidates(cleanParams);
      
      setCandidates(response.candidates || []);
      setTotalCandidates(response.totalCount || 0);
      setIsAIEnhanced(response.aiEnhanced || false);
      setPagination(response.pagination || { totalPages: 1, currentPage: 1, totalCandidates: 0 });
      
    } catch (err: any) {
      console.error('Error searching for candidates:', err);
      setError(err.response?.data?.message || 'Failed to search for candidates');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  // Handle toggle changes
  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: checked }));
  };

  // Handle save candidate
  const handleSaveCandidate = (candidateId: string) => {
    // Check if candidate is already saved
    if (savedCandidates.includes(candidateId)) {
      // Remove from saved candidates
      setSavedCandidates(prev => prev.filter(id => id !== candidateId));
    } else {
      // Add to saved candidates
      setSavedCandidates(prev => [...prev, candidateId]);
    }
    
    // In a real app, you would call an API to save/unsave the candidate
  };

  // Handle contact candidate
  const handleContactCandidate = (candidateId: string) => {
    // In a real app, you would navigate to a messaging page or open a modal
    console.log('Contact candidate:', candidateId);
  };

  // Format a candidate's experience for display
  const formatExperience = (experience: Candidate['experience']) => {
    if (!experience || experience.length === 0) {
      return 'No experience listed';
    }
    
    // Sort by most recent first
    const sortedExperience = [...experience].sort((a, b) => {
      const dateA = a.current ? new Date() : (a.endDate ? new Date(a.endDate) : new Date());
      const dateB = b.current ? new Date() : (b.endDate ? new Date(b.endDate) : new Date());
      return dateB.getTime() - dateA.getTime();
    });
    
    // Return the most recent position
    const latestExp = sortedExperience[0];
    return `${latestExp.position} at ${latestExp.company}`;
  };

  // Calculate years of experience
  const calculateExperienceYears = (experience: Candidate['experience']) => {
    if (!experience || experience.length === 0) {
      return 0;
    }
    
    let totalYears = 0;
    experience.forEach(exp => {
      const startDate = exp.startDate ? new Date(exp.startDate) : null;
      const endDate = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : null);
      
      if (startDate && endDate) {
        const years = endDate.getFullYear() - startDate.getFullYear();
        totalYears += years;
      }
    });
    
    return totalYears;
  };

  // Render the match score as a rating
  const renderMatchScore = (score?: number) => {
    if (score === undefined) return null;
    
    // Convert 0-100 score to 0-5 stars
    const stars = (score / 20);
    
    return (
      <Box display="flex" alignItems="center">
        <Rating value={stars} precision={0.5} readOnly />
        <Typography variant="body2" sx={{ ml: 1 }}>
          {score}%
        </Typography>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Find Candidates
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Search form */}
        <form onSubmit={handleSearch}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: 'calc(100% / 3 + 1px)' } }}>
              <TextField
                fullWidth
                label="Skills"
                name="skills"
                variant="outlined"
                value={searchParams.skills}
                onChange={handleInputChange}
                placeholder="e.g. JavaScript, React, Node.js"
                helperText="Separate multiple skills with commas"
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: 'calc(100% / 6 + 1px)' } }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="experience-label">Experience</InputLabel>
                <Select
                  labelId="experience-label"
                  name="experience"
                  value={searchParams.experience}
                  onChange={handleSelectChange}
                  label="Experience"
                >
                  <MenuItem value="">Any</MenuItem>
                  <MenuItem value="1">1+ Years</MenuItem>
                  <MenuItem value="2">2+ Years</MenuItem>
                  <MenuItem value="3">3+ Years</MenuItem>
                  <MenuItem value="5">5+ Years</MenuItem>
                  <MenuItem value="7">7+ Years</MenuItem>
                  <MenuItem value="10">10+ Years</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: 'calc(100% / 3 + 1px)' } }}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                variant="outlined"
                value={searchParams.location}
                onChange={handleInputChange}
                placeholder="e.g. New York, Remote"
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: 'calc(100% / 6 + 1px)' }, display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={searchParams.useAI}
                    onChange={handleToggleChange}
                    name="useAI"
                    color="primary"
                  />
                }
                label={
                  <Box display="flex" alignItems="center">
                    <span>AI Ranking</span>
                    <Tooltip title="Use AI to rank candidates based on their fit for your job openings">
                      <AutoAwesomeIcon fontSize="small" color="primary" sx={{ ml: 0.5 }} />
                    </Tooltip>
                  </Box>
                }
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              >
                {loading ? 'Searching...' : 'Search Candidates'}
              </Button>
            </Box>
          </Box>
        </form>
        
        {/* Results section */}
        {searchPerformed && (
          <Box mt={4}>
            <Divider sx={{ mb: 2 }} />
            
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                {totalCandidates} Candidates Found
              </Typography>
              
              {isAIEnhanced && (
                <Chip
                  icon={<AutoAwesomeIcon />}
                  label="AI-Enhanced Results"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
            
            {candidates.length === 0 ? (
              <Alert severity="info">
                No candidates match your search criteria. Try broadening your search.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
                {candidates.map((candidate) => (
                  <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%', lg: 'calc(100% / 3)' } }} key={candidate._id}>
                    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          src={candidate.profileImage}
                          sx={{ width: 56, height: 56, mr: 2 }}
                        >
                          {!candidate.profileImage && <PersonIcon />}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="div">
                            {candidate.firstName} {candidate.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {candidate.title || 'Job Seeker'}
                          </Typography>
                          {candidate.location && (
                            <Box display="flex" alignItems="center" mt={0.5}>
                              <LocationOnIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {candidate.location}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                      
                      {isAIEnhanced && candidate.matchScore !== undefined && (
                        <Box sx={{ px: 2, pb: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Match Score:
                          </Typography>
                          {renderMatchScore(candidate.matchScore)}
                        </Box>
                      )}
                      
                      <CardContent sx={{ pt: 1, pb: 1, flexGrow: 1 }}>
                        {/* Skills */}
                        <Typography variant="subtitle2" gutterBottom>
                          Skills:
                        </Typography>
                        <Box mb={2} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {candidate.skills && candidate.skills.length > 0 ? (
                            candidate.skills.slice(0, 5).map((skill, index) => (
                              <Chip
                                key={index}
                                label={skill}
                                size="small"
                                variant="outlined"
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No skills listed
                            </Typography>
                          )}
                          {candidate.skills && candidate.skills.length > 5 && (
                            <Chip
                              label={`+${candidate.skills.length - 5} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        
                        {/* Experience */}
                        <Typography variant="subtitle2" gutterBottom>
                          Experience:
                        </Typography>
                        <Box mb={2}>
                          <Typography variant="body2">
                            {formatExperience(candidate.experience)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {calculateExperienceYears(candidate.experience)} years total
                          </Typography>
                        </Box>
                        
                        {/* Education */}
                        <Typography variant="subtitle2" gutterBottom>
                          Education:
                        </Typography>
                        <Box>
                          {candidate.education && candidate.education.length > 0 ? (
                            <Typography variant="body2">
                              {candidate.education[0].degree} - {candidate.education[0].institution}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No education listed
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                      
                      {/* AI Analysis */}
                      {isAIEnhanced && (candidate.strengths?.length || candidate.gaps?.length) && (
                        <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper' }}>
                          {candidate.strengths && candidate.strengths.length > 0 && (
                            <Box mb={1}>
                              <Typography variant="subtitle2" color="success.main" gutterBottom>
                                Strengths:
                              </Typography>
                              <List dense disablePadding>
                                {candidate.strengths.slice(0, 3).map((strength, index) => (
                                  <ListItem disablePadding key={index} sx={{ py: 0.25 }}>
                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                      <CheckCircleIcon fontSize="small" color="success" />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={strength} 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                          
                          {candidate.gaps && candidate.gaps.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" color="error.main" gutterBottom>
                                Gaps:
                              </Typography>
                              <List dense disablePadding>
                                {candidate.gaps.slice(0, 2).map((gap, index) => (
                                  <ListItem disablePadding key={index} sx={{ py: 0.25 }}>
                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                      <ErrorIcon fontSize="small" color="error" />
                                    </ListItemIcon>
                                    <ListItemText 
                                      primary={gap} 
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                        </Box>
                      )}
                      
                      <Divider />
                      <CardActions>
                        <Button 
                          size="small" 
                          startIcon={<MessageIcon />}
                          onClick={() => handleContactCandidate(candidate._id)}
                        >
                          Contact
                        </Button>
                        <IconButton 
                          aria-label={savedCandidates.includes(candidate._id) ? "Remove from saved" : "Save candidate"}
                          onClick={() => handleSaveCandidate(candidate._id)}
                          color={savedCandidates.includes(candidate._id) ? "primary" : "default"}
                        >
                          {savedCandidates.includes(candidate._id) ? (
                            <BookmarkIcon />
                          ) : (
                            <BookmarkBorderIcon />
                          )}
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default CandidateSearch; 