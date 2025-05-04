import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Tooltip,
    LinearProgress,
    Paper,
    Tabs,
    Tab,
    Badge,
    TextField,
    InputAdornment,
    Slider,
    Switch,
    FormControlLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import { jobService, applicationService } from '../services/api';
import { Job, JobApplication } from '../types';
import { useAuth } from '../context/AuthContext';
// Import icons
import BarChartIcon from '@mui/icons-material/BarChart';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import MessageIcon from '@mui/icons-material/Message';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import StarIcon from '@mui/icons-material/Star';
import RateReviewIcon from '@mui/icons-material/RateReview';
import AssessmentIcon from '@mui/icons-material/Assessment';
// Import components
import CandidateAnalysis from './CandidateAnalysis';
import CandidateRankingVisual from './CandidateRankingVisual';
import ScheduleInterviewDialog from './ScheduleInterviewDialog';
import InterviewRatingDialog from './InterviewRatingDialog';
import InterviewRatingsView from './InterviewRatingsView';

interface AIScreeningResult {
    jobTitle: string;
    totalCandidates: number;
    candidates: {
        applicationId: string;
        candidate: {
            _id: string;
            id?: string;
            name: string;
            email?: string;
            title?: string;
            skills?: string[];
            totalYearsExperience?: number;
        };
        matchScore: number;
        strengths?: string[];
        weaknesses?: string[];
        reasoning?: string;
        appliedAt: string;
        status: string;
    }[];
}

const JobApplications: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [screeningResults, setScreeningResults] = useState<AIScreeningResult | null>(null);
    const [isScreening, setIsScreening] = useState(false);
    const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    
    // Interview scheduling state
    const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
    const [applicationForInterview, setApplicationForInterview] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Cover Letter Modal State
    const [coverLetterModalOpen, setCoverLetterModalOpen] = useState(false);
    const [selectedCoverLetter, setSelectedCoverLetter] = useState('');
    
    // Enhanced UI state
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [minMatchScore, setMinMatchScore] = useState(0);
    const [sortOption, setSortOption] = useState('matchScore');
    const [useFallback, setUseFallback] = useState(false);
    const [showVisualRanking, setShowVisualRanking] = useState(false);
    
    // Interview rating state
    const [ratingDialogOpen, setRatingDialogOpen] = useState<boolean>(false);
    const [ratingsViewOpen, setRatingsViewOpen] = useState<boolean>(false);
    const [applicationForRating, setApplicationForRating] = useState<string | null>(null);
    const [candidateForRating, setCandidateForRating] = useState<string | null>(null);
    const [interviewRatings, setInterviewRatings] = useState<any[]>([]);
    
    const fetchJobAndApplications = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError('');
        try {
            const [jobData, applicationsData] = await Promise.all([
                jobService.getJobById(id),
                applicationService.getJobApplications(id)
            ]);
            setJob(jobData);
            setApplications(applicationsData);
        } catch (err: any) {
            console.error('Error fetching job applications:', err);
            setError(err.response?.data?.message || 'Failed to load job applications');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchJobAndApplications();
    }, [fetchJobAndApplications]);

    const handleStatusChange = async (applicationId: string, status: string) => {
        try {
            const updatedApplication = await applicationService.updateApplicationStatus(applicationId, status);
            setApplications(prev => 
                prev.map(app => app._id === applicationId ? updatedApplication : app)
            );
            
            if (screeningResults) {
                setScreeningResults(prevResults => {
                    if (!prevResults) return null;
                    
                    return {
                        ...prevResults,
                        candidates: prevResults.candidates.map(candidate => 
                            candidate.applicationId === applicationId 
                            ? { ...candidate, status } 
                            : candidate
                        )
                    };
                });
            }
        } catch (err: any) {
            console.error('Error updating status:', err);
            setError('Failed to update application status');
        }
    };

    // Add a handler for messaging the job seeker
    const handleMessageJobSeeker = (userId: string) => {
        console.log(`[JobApplications] Employer initiating chat with Job Seeker ID: ${userId}`);
        navigate(`/messages/${userId}`);
    };

    // Screen all candidates using AI
    const handleScreenCandidates = async () => {
        if (!id) return;
        
        try {
            setIsScreening(true);
            setError('');
            
            // Pass the useFallback parameter if needed
            const queryParams = useFallback ? '?useFallback=true' : '';
            const data = await applicationService.screenCandidates(id, queryParams);
            setScreeningResults(data);
            
            // Automatically switch to ranked view when screening is complete
            setShowVisualRanking(true);
        } catch (err: any) {
            setError(err.message || 'Failed to screen candidates');
        } finally {
            setIsScreening(false);
        }
    };

    const handleViewDetailedAnalysis = (applicationId: string) => {
        setSelectedApplicationId(applicationId);
        setShowAnalysisModal(true);
    };

    const handleCloseAnalysisModal = () => {
        setShowAnalysisModal(false);
        setSelectedApplicationId(null);
    };

    // Cover Letter Modal Handlers
    const handleOpenCoverLetter = (letter: string) => {
        setSelectedCoverLetter(letter);
        setCoverLetterModalOpen(true);
    };

    const handleCloseCoverLetter = () => {
        setCoverLetterModalOpen(false);
        setSelectedCoverLetter(''); // Clear content when closing
    };

    // Handle opening interview scheduling dialog
    const handleOpenInterviewDialog = (applicationId: string) => {
        setApplicationForInterview(applicationId);
        setInterviewDialogOpen(true);
    };

    // Handle successful interview scheduling
    const handleInterviewScheduled = () => {
        setSuccessMessage('Interview scheduled successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
        
        // Refresh applications to show updated status
        if (id) {
            fetchJobAndApplications();
        }
    };

    const getMatchScoreColor = (score: number) => {
        if (score >= 80) return '#4caf50';
        if (score >= 60) return '#2196f3';
        if (score >= 40) return '#ff9800';
        return '#f44336';
    };
    
    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };
    
    // Filter and sort candidates
    const getFilteredCandidates = () => {
        if (!screeningResults) return [];
        
        let filtered = screeningResults.candidates.filter(candidate => 
            // Filter by search term (using optional chaining for safety)
            (candidate.candidate?.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) &&
            // Filter by minimum match score
            candidate.matchScore >= minMatchScore
        );
        
        // Sort candidates
        switch (sortOption) {
            case 'matchScore':
                filtered.sort((a, b) => b.matchScore - a.matchScore);
                break;
            case 'name':
                filtered.sort((a, b) => (a.candidate?.name ?? '').localeCompare(b.candidate?.name ?? ''));
                break;
            case 'recent':
                // Assuming appliedAt is a valid date string
                try {
                     filtered.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
                } catch(e) {
                    console.error("Error sorting by date:", e); 
                    // Fallback to score sort if date parse fails
                    filtered.sort((a, b) => b.matchScore - a.matchScore);
                }
                break;
            default:
                filtered.sort((a, b) => b.matchScore - a.matchScore);
        }
        
        return filtered;
    };

    // Handle opening interview rating dialog
    const handleOpenRatingDialog = (applicationId: string, candidateName: string) => {
        setApplicationForRating(applicationId);
        setCandidateForRating(candidateName);
        setRatingDialogOpen(true);
    };

    // Handle successful rating submission
    const handleRatingSubmitted = async () => {
        setRatingDialogOpen(false);
        await fetchJobAndApplications();
        setSuccessMessage('Interview rating submitted successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    const handleViewRatings = async (applicationId: string, candidateName: string) => {
        setCandidateForRating(candidateName);
        try {
            setLoading(true);
            const data = await applicationService.getInterviewRatings(applicationId);
            setInterviewRatings(data.ratings);
            setRatingsViewOpen(true);
        } catch (error) {
            console.error('Error fetching ratings:', error);
            setError('Failed to load interview ratings');
        } finally {
            setLoading(false);
        }
    };

    // Prepare data for visual ranking (mapping _id to id if needed)
    const rankingData = screeningResults?.candidates.map(c => ({
        ...c,
        candidate: {
            ...c.candidate,
            id: c.candidate._id
        }
    }));

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error || !job) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error || 'Job not found'}
            </Alert>
        );
    }

    if (!user || user.type !== 'employer' || (typeof job.employer === 'string' ? job.employer !== user.id : job.employer._id !== user.id)) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                You are not authorized to view these applications
            </Alert>
        );
    }

    return (
        <Box>
            <Box mb={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Applications for {job.title}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                    {applications.length} application(s) received
                </Typography>
                
                <Box mt={2} mb={3} display="flex" alignItems="center" flexWrap="wrap" gap={2}>
                    <Button 
                        variant="contained"
                        color="primary"
                        startIcon={<LeaderboardIcon />}
                        onClick={handleScreenCandidates}
                        disabled={isScreening || applications.length === 0}
                    >
                        {isScreening ? 'Ranking Candidates...' : 'Rank Candidates by Match %'}
                    </Button>
                    
                    <FormControlLabel
                        control={
                            <Switch
                                checked={useFallback}
                                onChange={(e) => setUseFallback(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Use fast scoring (no AI)"
                        sx={{ ml: 1 }}
                    />
                    
                    <Button
                        variant="outlined"
                        onClick={() => navigate(`/jobs/${job._id}`)}
                        sx={{ ml: 'auto' }}
                    >
                        View Job Post
                    </Button>
                </Box>
                
                {isScreening && (
                    <Box sx={{ width: '100%', mb: 3 }}>
                        <LinearProgress />
                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                            AI is analyzing and ranking candidates. This may take a moment...
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* --- START: Display basic application list before screening --- */}
            {!screeningResults && applications.length > 0 && (
                <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                        Received Applications
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1) }}>
                        {applications.map((app) => (
                            <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }} key={app._id}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6">{app.jobSeeker.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                                            {app.jobSeeker.email && ` • ${app.jobSeeker.email}`}
                                        </Typography>
                                        
                                        {/* Optional: Add link to resume if available */}
                                        {app.resume && (
                                            <Button 
                                                size="small" 
                                                href={app.resume} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                sx={{ mt: 1 }}
                                            >
                                                View Resume
                                            </Button>
                                        )}
                                        {/* Add button to view cover letter */} 
                                        {app.coverLetter && (
                                            <Button 
                                                size="small" 
                                                onClick={() => handleOpenCoverLetter(app.coverLetter)}
                                                sx={{ mt: 1, ml: app.resume ? 1 : 0 }} // Add margin if resume button exists
                                            >
                                                View Cover Letter
                                            </Button>
                                        )}

                                        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                                <InputLabel>Status</InputLabel>
                                                <Select
                                                    value={app.status}
                                                    label="Status"
                                                    onChange={(e) => handleStatusChange(app._id, e.target.value)}
                                                >
                                                    <MenuItem value="pending">Pending</MenuItem>
                                                    <MenuItem value="reviewed">Reviewed</MenuItem>
                                                    <MenuItem value="interview">Interview</MenuItem>
                                                    <MenuItem value="accepted">Accepted</MenuItem>
                                                    <MenuItem value="rejected">Rejected</MenuItem>
                                                </Select>
                                            </FormControl>
                                            
                                            <Box>
                                                {/* Message Button */}
                                                <Tooltip title="Message Candidate">
                                                    <IconButton 
                                                        color="primary" 
                                                        size="small"
                                                        onClick={() => handleMessageJobSeeker(app.jobSeeker._id)}
                                                        sx={{ mr: 1 }}
                                                    >
                                                        <MessageIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                
                                                {/* Schedule Interview Button */}
                                                <Tooltip title="Schedule Interview">
                                                    <IconButton
                                                        color="secondary"
                                                        size="small"
                                                        onClick={() => handleOpenInterviewDialog(app._id)}
                                                        sx={{ mr: 1 }}
                                                    >
                                                        <CalendarTodayIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                
                                                {/* Rate Candidate Button (for easier testing) */}
                                                <Tooltip title="Rate Candidate">
                                                    <IconButton
                                                        color="success"
                                                        size="small"
                                                        onClick={() => handleOpenRatingDialog(app._id, app.jobSeeker.name)}
                                                    >
                                                        <StarIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                
                                                {/* View Ratings Button (only if ratings exist) */}
                                                {app.interviewRatings && app.interviewRatings.length > 0 && (
                                                    <Tooltip title="View Ratings">
                                                        <IconButton
                                                            color="info"
                                                            size="small"
                                                            onClick={() => handleViewRatings(app._id, app.jobSeeker.name)}
                                                            sx={{ ml: 1 }}
                                                        >
                                                            <AssessmentIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
            {/* --- END: Basic application list --- */}

            {screeningResults && (
                <>
                    <Paper sx={{ mb: 3 }}>
                        <Tabs 
                            value={tabValue} 
                            onChange={handleTabChange}
                            variant="fullWidth"
                        >
                            <Tab 
                                label={
                                    <Badge 
                                        badgeContent={screeningResults.candidates.filter(c => c.matchScore >= 70).length} 
                                        color="success"
                                    >
                                        Top Matches (70%+)
                                    </Badge>
                                } 
                            />
                            <Tab 
                                label={
                                    <Badge 
                                        badgeContent={screeningResults.candidates.filter(c => c.matchScore < 70 && c.matchScore >= 50).length} 
                                        color="primary"
                                    >
                                        Good Fits (50-69%)
                                    </Badge>
                                } 
                            />
                            <Tab 
                                label={
                                    <Badge 
                                        badgeContent={screeningResults.candidates.filter(c => c.matchScore < 50).length} 
                                        color="error"
                                    >
                                        Low Matches (&lt;50%)
                                    </Badge>
                                } 
                            />
                        </Tabs>
                    </Paper>
                    
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showVisualRanking}
                                    onChange={(e) => setShowVisualRanking(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label={
                                <Box display="flex" alignItems="center">
                                    <BarChartIcon sx={{ mr: 0.5 }} />
                                    Visual Ranking
                                </Box>
                            }
                        />
                    </Box>
                    
                    {showVisualRanking && screeningResults.candidates.length > 0 && (
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="h6" gutterBottom>Visual Ranking</Typography>
                            <CandidateRankingVisual 
                                candidates={rankingData || []} 
                                jobTitle={screeningResults.jobTitle}
                                onSelectCandidate={handleViewDetailedAnalysis}
                            />
                        </Box>
                    )}
                    
                    <Box mb={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
                                    <Typography variant="h5">
                                        Candidate Rankings
                                    </Typography>
                                    
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <TextField
                                            placeholder="Search candidates"
                                            size="small"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                        
                                        <FormControl size="small" sx={{ minWidth: 150 }}>
                                            <InputLabel>Sort By</InputLabel>
                                            <Select
                                                value={sortOption}
                                                label="Sort By"
                                                onChange={(e) => setSortOption(e.target.value)}
                                            >
                                                <MenuItem value="matchScore">
                                                    <Box display="flex" alignItems="center">
                                                        <SortIcon sx={{ mr: 1, color: 'action.active' }} />
                                                        Highest Match
                                                    </Box>
                                                </MenuItem>
                                                <MenuItem value="name">
                                                    <Box display="flex" alignItems="center">
                                                        <SortIcon sx={{ mr: 1, color: 'action.active' }} />
                                                        Name
                                                    </Box>
                                                </MenuItem>
                                                <MenuItem value="recent">
                                                    <Box display="flex" alignItems="center">
                                                        <SortIcon sx={{ mr: 1, color: 'action.active' }} />
                                                        Most Recent
                                                    </Box>
                                                </MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>
                                
                                <Box mb={3}>
                                    <Typography gutterBottom>Minimum Match Score: {minMatchScore}%</Typography>
                                    <Slider
                                        value={minMatchScore}
                                        onChange={(_, newValue) => setMinMatchScore(newValue as number)}
                                        valueLabelDisplay="auto"
                                        step={10}
                                        marks
                                        min={0}
                                        max={90}
                                    />
                                </Box>
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1) }}>
                                    {getFilteredCandidates()
                                        .filter(candidate => {
                                            if (tabValue === 0) return candidate.matchScore >= 70;
                                            if (tabValue === 1) return candidate.matchScore < 70 && candidate.matchScore >= 50;
                                            return candidate.matchScore < 50;
                                        })
                                        .map((candidate, index) => (
                                            <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }} key={candidate.applicationId}>
                                                <Card variant="outlined" sx={{ 
                                                    position: 'relative',
                                                    borderLeft: 6,
                                                    borderLeftColor: getMatchScoreColor(candidate.matchScore),
                                                }}>
                                                    <Box 
                                                        sx={{ 
                                                            position: 'absolute', 
                                                            top: -12, 
                                                            left: -12, 
                                                            width: 30, 
                                                            height: 30, 
                                                            borderRadius: '50%', 
                                                            bgcolor: sortOption === 'matchScore' ? 'primary.main' : 'transparent',
                                                            color: 'white',
                                                            display: sortOption === 'matchScore' ? 'flex' : 'none',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 'bold',
                                                            zIndex: 1,
                                                            boxShadow: 1
                                                        }}
                                                    >
                                                        {index + 1}
                                                    </Box>
                                                    <CardContent>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="h6">{candidate.candidate.name}</Typography>
                                                            <Chip 
                                                                label={`${candidate.matchScore}% Match`}
                                                                sx={{ 
                                                                    backgroundColor: getMatchScoreColor(candidate.matchScore),
                                                                    color: 'white',
                                                                    fontWeight: 'bold'
                                                                }}
                                                            />
                                                        </Box>
                                                        
                                                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                            Applied {new Date(candidate.appliedAt).toLocaleDateString()}
                                                            {candidate.candidate.email && ` • ${candidate.candidate.email}`}
                                                        </Typography>
                                                        
                                                        <Box mt={1.5}>
                                                            {/* Display AI Screening Results within the candidate card */}
                                                            <Box mt={2} p={1.5} bgcolor="grey.100" borderRadius={1}>
                                                                <Typography variant="subtitle2" gutterBottom>AI Analysis:</Typography>
                                                                <Box display="flex" alignItems="center" mb={1}>
                                                                    <Typography variant="body2" sx={{ mr: 1 }}>Match Score:</Typography>
                                                                    <Chip 
                                                                        label={`${candidate.matchScore}%`} 
                                                                        size="small" 
                                                                        sx={{ 
                                                                            backgroundColor: getMatchScoreColor(candidate.matchScore), 
                                                                            color: 'white',
                                                                            fontWeight: 'bold' 
                                                                        }} 
                                                                    />
                                                                </Box>
                                                                
                                                                {/* Strengths */}
                                                                {candidate.strengths && candidate.strengths.length > 0 && (
                                                                    <Box mb={1}>
                                                                        <Typography variant="caption" display="block" color="text.secondary">Strengths:</Typography>
                                                                        <List dense disablePadding sx={{ pl: 1 }}>
                                                                            {candidate.strengths.map((strength, i) => (
                                                                                <ListItem key={`strength-${i}`} sx={{ py: 0.2 }}>
                                                                                    <ListItemText primary={`• ${strength}`} primaryTypographyProps={{ variant: 'body2' }} />
                                                                                </ListItem>
                                                                            ))}
                                                                        </List>
                                                                    </Box>
                                                                )}

                                                                {/* Weaknesses */}
                                                                {candidate.weaknesses && candidate.weaknesses.length > 0 && (
                                                                    <Box mb={1}>
                                                                        <Typography variant="caption" display="block" color="text.secondary">Areas for Development:</Typography>
                                                                         <List dense disablePadding sx={{ pl: 1 }}>
                                                                            {candidate.weaknesses.map((weakness, i) => (
                                                                                <ListItem key={`weakness-${i}`} sx={{ py: 0.2 }}>
                                                                                    <ListItemText primary={`• ${weakness}`} primaryTypographyProps={{ variant: 'body2' }} />
                                                                                </ListItem>
                                                                            ))}
                                                                        </List>
                                                                    </Box>
                                                                )}

                                                                {/* Reasoning */}
                                                                {candidate.reasoning && (
                                                                     <Tooltip title={candidate.reasoning} arrow placement="top">
                                                                         <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                                                                             AI Reasoning (?)
                                                                         </Typography>
                                                                     </Tooltip>
                                                                )}
                                                            </Box>
                                                            {/* End AI Screening Results */}
                                                        </Box>
                                                        
                                                        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                                                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                                                <InputLabel>Status</InputLabel>
                                                                <Select
                                                                    value={candidate.status}
                                                                    label="Status"
                                                                    onChange={(e) => handleStatusChange(candidate.applicationId, e.target.value)}
                                                                >
                                                                    <MenuItem value="pending">Pending</MenuItem>
                                                                    <MenuItem value="reviewed">Reviewed</MenuItem>
                                                                    <MenuItem value="interview">Interview</MenuItem>
                                                                    <MenuItem value="accepted">Accepted</MenuItem>
                                                                    <MenuItem value="rejected">Rejected</MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                            
                                                            <Box>
                                                                <Tooltip title="Schedule Interview">
                                                                    <IconButton 
                                                                        color="secondary" 
                                                                        size="small"
                                                                        onClick={() => handleOpenInterviewDialog(candidate.applicationId)}
                                                                        sx={{ mr: 1 }}
                                                                    >
                                                                        <CalendarTodayIcon />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Message Candidate">
                                                                    <IconButton 
                                                                        color="primary" 
                                                                        size="small"
                                                                        onClick={() => handleMessageJobSeeker(candidate.candidate._id)}
                                                                        sx={{ mr: 1 }}
                                                                    >
                                                                        <MessageIcon />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="View Detailed Analysis">
                                                                    <IconButton 
                                                                        color="info" 
                                                                        size="small"
                                                                        onClick={() => handleViewDetailedAnalysis(candidate.applicationId)}
                                                                        sx={{ mr: 1 }}
                                                                    >
                                                                        <AnalyticsIcon />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                {/* Add the new Rate Interview button */}
                                                                {candidate.status === 'interview' && (
                                                                    <Tooltip title="Rate Interview">
                                                                        <IconButton 
                                                                            color="success" 
                                                                            size="small"
                                                                            onClick={() => handleOpenRatingDialog(candidate.applicationId, candidate.candidate.name)}
                                                                        >
                                                                            <StarIcon />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                                {/* Add button to view ratings for reviewed applications */}
                                                                {candidate.status === 'reviewed' && (
                                                                    <Tooltip title="View Interview Ratings">
                                                                        <IconButton 
                                                                            color="success" 
                                                                            size="small"
                                                                            onClick={() => handleViewRatings(candidate.applicationId, candidate.candidate.name)}
                                                                        >
                                                                            <RateReviewIcon />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Box>
                                        ))}
                                        
                                    {getFilteredCandidates().filter(candidate => {
                                        if (tabValue === 0) return candidate.matchScore >= 70;
                                        if (tabValue === 1) return candidate.matchScore < 70 && candidate.matchScore >= 50;
                                        return candidate.matchScore < 50;
                                    }).length === 0 && (
                                        <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                                            <Alert severity="info">
                                                No candidates match the current filters. Try adjusting your filter criteria.
                                            </Alert>
                                        </Box>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </>
            )}

            {applications.length === 0 ? (
                <Box textAlign="center" py={4}>
                    <Typography variant="h6" color="textSecondary">
                        No applications received yet
                    </Typography>
                </Box>
            ) : !screeningResults ? (
                <Typography variant="h6" color="textSecondary" mb={2}>
                    Use the "Rank Candidates by Match %" button above to see candidate rankings
                </Typography>
            ) : null}
            
            {showAnalysisModal && selectedApplicationId && (
                <CandidateAnalysis 
                    jobId={id || ''} 
                    applicationId={selectedApplicationId}
                    open={showAnalysisModal}
                    onClose={handleCloseAnalysisModal}
                />
            )}

            {/* Success message for interview scheduling */}
            {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {successMessage}
                </Alert>
            )}
            
            {/* Add the ScheduleInterviewDialog */}
            <ScheduleInterviewDialog
                open={interviewDialogOpen}
                onClose={() => setInterviewDialogOpen(false)}
                jobApplicationId={applicationForInterview}
                jobId={id || ''}
                onSuccess={handleInterviewScheduled}
            />

            {/* Add the interview rating dialog */}
            {applicationForRating && candidateForRating && (
                <InterviewRatingDialog
                    open={ratingDialogOpen}
                    onClose={() => setRatingDialogOpen(false)}
                    applicationId={applicationForRating}
                    candidateName={candidateForRating}
                    onRatingSubmitted={handleRatingSubmitted}
                />
            )}

            {candidateForRating && (
                <InterviewRatingsView
                    open={ratingsViewOpen}
                    onClose={() => setRatingsViewOpen(false)}
                    ratings={interviewRatings}
                    candidateName={candidateForRating}
                />
            )}

            {/* Cover Letter Display Dialog */} 
            <Dialog open={coverLetterModalOpen} onClose={handleCloseCoverLetter} maxWidth="md" fullWidth>
                <DialogTitle>Cover Letter</DialogTitle>
                <DialogContent dividers>
                    <Typography whiteSpace="pre-wrap"> 
                        {selectedCoverLetter || "No cover letter provided."} 
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCoverLetter}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default JobApplications; 