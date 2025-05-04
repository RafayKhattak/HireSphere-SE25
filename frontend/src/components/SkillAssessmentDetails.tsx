import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { assessmentService } from '../services/api';
import { SkillAssessment, SkillAssessmentResponse } from '../types';

const SkillAssessmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [assessment, setAssessment] = useState<SkillAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<SkillAssessmentResponse[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAssessment(id);
    }
  }, [id]);

  const fetchAssessment = async (assessmentId: string) => {
    try {
      setLoading(true);
      const data = await assessmentService.getAssessment(assessmentId);
      setAssessment(data);
      
      // Initialize responses if empty
      if (data.status === 'pending' && (!data.responses || data.responses.length === 0)) {
        setResponses([]);
      } else {
        setResponses(data.responses || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (answer: string) => {
    const questionIndex = currentQuestion;
    
    // Update responses
    const existingResponseIndex = responses.findIndex(r => r.questionIndex === questionIndex);
    if (existingResponseIndex >= 0) {
      const updatedResponses = [...responses];
      updatedResponses[existingResponseIndex] = { questionIndex, answer };
      setResponses(updatedResponses);
    } else {
      setResponses([...responses, { questionIndex, answer }]);
    }
  };

  const getCurrentResponse = () => {
    return responses.find(r => r.questionIndex === currentQuestion)?.answer || '';
  };

  const handleNext = () => {
    if (currentQuestion < (assessment?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!assessment || !id) return;
    
    try {
      setSubmitting(true);
      const result = await assessmentService.submitAssessment(id, { responses });
      setAssessment(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const isResponseComplete = () => {
    if (!assessment) return false;
    return responses.length === assessment.questions.length && 
      responses.every(r => r.answer.trim() !== '');
  };

  const renderQuestionContent = () => {
    if (!assessment) return null;
    
    const question = assessment.questions[currentQuestion];
    if (!question) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Question {currentQuestion + 1} of {assessment.questions.length}
        </Typography>
        
        <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8f9fa', mb: 3 }}>
          <Typography variant="body1" fontWeight={500} gutterBottom>
            {question.question}
          </Typography>
        </Paper>

        {question.isOpenEnded ? (
          <TextField
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            label="Your Answer"
            value={getCurrentResponse()}
            onChange={(e) => handleResponseChange(e.target.value)}
            placeholder="Type your answer here..."
          />
        ) : (
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={getCurrentResponse()}
              onChange={(e) => handleResponseChange(e.target.value)}
            >
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                  sx={{ mb: 1 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}

        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            startIcon={<ArrowBackIcon />}
          >
            Previous
          </Button>
          
          {currentQuestion < assessment.questions.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!getCurrentResponse()}
            >
              Next Question
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setConfirmDialogOpen(true)}
              disabled={!isResponseComplete()}
            >
              Finish & Submit
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  const renderResults = () => {
    if (!assessment || assessment.status !== 'evaluated') return null;

    return (
      <Box>
        <Box mb={4} textAlign="center">
          <Typography variant="h4" gutterBottom>
            Assessment Results: {assessment.skill}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Completed on {new Date(assessment.completedAt || '').toLocaleDateString()}
          </Typography>
          
          <Box display="flex" justifyContent="center" my={4}>
            <Box position="relative" display="inline-flex">
              <CircularProgress
                variant="determinate"
                value={assessment.score || 0}
                size={120}
                thickness={5}
                sx={{
                  color: assessment.score && assessment.score >= 70 
                    ? 'success.main' 
                    : assessment.score && assessment.score >= 40 
                      ? 'warning.main' 
                      : 'error.main'
                }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h4" component="div" color="text.primary">
                  {assessment.score}%
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={4}>
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
            <Card sx={{ height: '100%', backgroundColor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="success.main">
                  Strengths
                </Typography>
                <List>
                  {assessment.aiEvaluation?.strengths.map((strength, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ThumbUpIcon color="success" />
                      </ListItemIcon>
                      <ListItemText primary={strength} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
            <Card sx={{ height: '100%', backgroundColor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  Areas for Improvement
                </Typography>
                <List>
                  {assessment.aiEvaluation?.weaknesses.map((weakness, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ThumbDownIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={weakness} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
            <Card sx={{ height: '100%', backgroundColor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Recommendations
                </Typography>
                <List>
                  {assessment.aiEvaluation?.recommendations.map((recommendation, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <LightbulbIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={recommendation} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        </Box>

        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detailed Analysis
            </Typography>
            <Typography variant="body1">
              {assessment.aiEvaluation?.detailedAnalysis}
            </Typography>
          </CardContent>
        </Card>
        
        {assessment.score && assessment.score >= 70 && (
          <Alert severity="success" sx={{ mt: 4 }}>
            <Typography variant="subtitle1">
              <strong>Congratulations!</strong> Your score qualifies for your profile. This skill has been added to your profile and will be visible to employers.
            </Typography>
          </Alert>
        )}
        
        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/assessments')}
          >
            Back to Assessments
          </Button>
        </Box>
      </Box>
    );
  };

  const renderAssessmentContent = () => {
    if (!assessment) return null;

    switch (assessment.status) {
      case 'pending':
        return renderQuestionContent();
      case 'completed':
        return (
          <Box textAlign="center" py={6}>
            <CircularProgress size={60} />
            <Typography variant="h6" mt={3}>
              Evaluating your assessment...
            </Typography>
            <Typography variant="body2" color="textSecondary" mt={1}>
              Our AI is analyzing your responses. This may take a moment.
            </Typography>
          </Box>
        );
      case 'evaluated':
        return renderResults();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!assessment) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 4 }}>
          Assessment not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box py={4}>
        <Box mb={4}>
          {assessment.status === 'pending' && (
            <LinearProgress 
              variant="determinate" 
              value={((currentQuestion + 1) / assessment.questions.length) * 100}
              sx={{ mb: 3 }}
            />
          )}
          
          <Box display="flex" alignItems="center" mb={2}>
            <AssessmentIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h5" component="h1">
              {assessment.status === 'pending' 
                ? `${assessment.skill} Assessment` 
                : `${assessment.skill} Assessment Results`}
            </Typography>
          </Box>
        </Box>

        {renderAssessmentContent()}
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Submit Assessment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit your assessment? You won't be able to change your answers after submission.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setConfirmDialogOpen(false);
              handleSubmit();
            }}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SkillAssessmentDetails; 