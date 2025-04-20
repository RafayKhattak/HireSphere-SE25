import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Stack,
  useTheme
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import { assessmentService } from '../services/api';
import { SkillAssessment } from '../types';

const SkillAssessments: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAssessmentData, setNewAssessmentData] = useState({
    skill: '',
    questionCount: 5,
    includeOpenEnded: true,
    aiProvider: 'groq'
  });

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const data = await assessmentService.getMyAssessments();
      setAssessments(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setNewAssessmentData({
      ...newAssessmentData,
      [name as string]: value
    });
  };

  const handleCreateAssessment = async () => {
    try {
      setLoading(true);
      const newAssessment = await assessmentService.generateAssessment(newAssessmentData);
      setDialogOpen(false);
      navigate(`/assessments/${newAssessment._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create assessment');
      setLoading(false);
    }
  };

  const renderScoreBadge = (score: number | undefined) => {
    if (score === undefined) return null;
    
    let color = 'error';
    if (score >= 80) color = 'success';
    else if (score >= 60) color = 'warning';
    
    return (
      <Box position="absolute" top={16} right={16}>
        <Chip 
          label={`Score: ${score}%`} 
          color={color as 'error' | 'warning' | 'success'} 
          variant="filled"
        />
      </Box>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1">
            Skill Assessments
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New Assessment
          </Button>
        </Box>

        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            AI-Powered Skill Evaluations
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Showcase your skills with our AI-driven assessments. Complete assessments to verify 
            your expertise and increase your chances of getting hired. High-scoring assessments 
            will be added to your profile and visible to potential employers.
          </Typography>
        </Box>

        {loading && assessments.length === 0 ? (
          <Box display="flex" justifyContent="center" my={6}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : assessments.length === 0 ? (
          <Card variant="outlined" sx={{ textAlign: 'center', p: 4, backgroundColor: '#f8f9fa' }}>
            <Box mb={2}>
              <AssessmentIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.7 }} />
            </Box>
            <Typography variant="h6" gutterBottom>
              No Assessments Yet
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
              Take your first skill assessment to showcase your expertise to potential employers.
            </Typography>
            <Button
              variant="contained"
              onClick={() => setDialogOpen(true)}
            >
              Start Your First Assessment
            </Button>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {assessments.map((assessment) => (
              <Grid item xs={12} md={6} lg={4} key={assessment._id}>
                <Card sx={{ height: '100%', position: 'relative' }}>
                  {renderScoreBadge(assessment.score)}
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {assessment.skill}
                    </Typography>
                    <Box mb={2}>
                      <Chip 
                        label={assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)} 
                        color={
                          assessment.status === 'evaluated' 
                            ? 'success' 
                            : assessment.status === 'completed' 
                              ? 'warning' 
                              : 'default'
                        }
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Created: {formatDate(assessment.createdAt)}
                    </Typography>
                    {assessment.completedAt && (
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Completed: {formatDate(assessment.completedAt)}
                      </Typography>
                    )}
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" gutterBottom>
                      {assessment.questions.length} questions
                    </Typography>
                    <Box mt={2}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => navigate(`/assessments/${assessment._id}`)}
                      >
                        {assessment.status === 'pending' 
                          ? 'Take Assessment' 
                          : 'View Results'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* New Assessment Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Skill Assessment</DialogTitle>
        <DialogContent>
          <Box py={1}>
            <Typography variant="body2" color="textSecondary" paragraph>
              Select a skill to assess. Our AI will generate relevant questions to test your 
              knowledge and provide detailed feedback on your performance.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Skill to Assess"
                  name="skill"
                  value={newAssessmentData.skill}
                  onChange={handleInputChange}
                  placeholder="e.g., JavaScript, React, UI/UX Design, Python"
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Number of Questions</InputLabel>
                  <Select
                    value={newAssessmentData.questionCount}
                    name="questionCount"
                    label="Number of Questions"
                    onChange={handleInputChange}
                  >
                    <MenuItem value={3}>3 (Quick)</MenuItem>
                    <MenuItem value={5}>5 (Standard)</MenuItem>
                    <MenuItem value={8}>8 (In-depth)</MenuItem>
                    <MenuItem value={10}>10 (Comprehensive)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Question Types</InputLabel>
                  <Select
                    value={newAssessmentData.includeOpenEnded}
                    name="includeOpenEnded"
                    label="Question Types"
                    onChange={handleInputChange}
                  >
                    <MenuItem value={true}>Mixed (Multiple-choice & Open-ended)</MenuItem>
                    <MenuItem value={false}>Multiple-choice Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>AI Provider</InputLabel>
                  <Select
                    value={newAssessmentData.aiProvider}
                    name="aiProvider"
                    label="AI Provider"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="groq">Groq (Default)</MenuItem>
                    <MenuItem value="gemini">Google Gemini</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateAssessment}
            disabled={!newAssessmentData.skill.trim()}
          >
            Create Assessment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SkillAssessments; 