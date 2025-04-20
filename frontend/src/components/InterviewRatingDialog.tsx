import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Rating, TextField, Typography, Box, Chip,
  FormControl, FormLabel, Divider, Alert, CircularProgress,
  Grid
} from '@mui/material';
import { applicationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StarIcon from '@mui/icons-material/Star';

interface InterviewRatingDialogProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  candidateName: string;
  onRatingSubmitted: () => void;
}

const InterviewRatingDialog: React.FC<InterviewRatingDialogProps> = ({
  open,
  onClose,
  applicationId,
  candidateName,
  onRatingSubmitted
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Rating state
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [technicalSkills, setTechnicalSkills] = useState<number | null>(null);
  const [communication, setCommunication] = useState<number | null>(null);
  const [culturalFit, setCulturalFit] = useState<number | null>(null);
  const [problemSolving, setProblemSolving] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  
  // Strengths and weaknesses
  const [currentStrength, setCurrentStrength] = useState('');
  const [currentWeakness, setCurrentWeakness] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);

  const handleAddStrength = () => {
    if (currentStrength.trim() !== '' && !strengths.includes(currentStrength.trim())) {
      setStrengths([...strengths, currentStrength.trim()]);
      setCurrentStrength('');
    }
  };

  const handleAddWeakness = () => {
    if (currentWeakness.trim() !== '' && !weaknesses.includes(currentWeakness.trim())) {
      setWeaknesses([...weaknesses, currentWeakness.trim()]);
      setCurrentWeakness('');
    }
  };

  const handleRemoveStrength = (strength: string) => {
    setStrengths(strengths.filter(s => s !== strength));
  };

  const handleRemoveWeakness = (weakness: string) => {
    setWeaknesses(weaknesses.filter(w => w !== weakness));
  };

  const validateForm = () => {
    if (!overallRating) {
      setError('Overall rating is required');
      return false;
    }
    if (!feedback.trim()) {
      setError('Feedback is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const ratingData = {
        rating: overallRating,
        technicalSkills,
        communication,
        culturalFit,
        problemSolving,
        strengths,
        weaknesses,
        feedback
      };
      
      await applicationService.rateInterview(applicationId, ratingData);
      setSuccess(true);
      setTimeout(() => {
        onRatingSubmitted();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      setError(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const labels: { [index: string]: string } = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Rate Interview: {candidateName}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Rating submitted successfully!
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Overall Rating</Typography>
              <Box display="flex" alignItems="center">
                <Rating
                  name="overall-rating"
                  value={overallRating}
                  onChange={(_, newValue) => setOverallRating(newValue)}
                  precision={1}
                  size="large"
                  emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
                />
                {overallRating !== null && (
                  <Box sx={{ ml: 2 }}>{labels[overallRating]}</Box>
                )}
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Technical Skills</Typography>
              <Rating
                name="technical-rating"
                value={technicalSkills}
                onChange={(_, newValue) => setTechnicalSkills(newValue)}
                precision={1}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Communication</Typography>
              <Rating
                name="communication-rating"
                value={communication}
                onChange={(_, newValue) => setCommunication(newValue)}
                precision={1}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Cultural Fit</Typography>
              <Rating
                name="cultural-fit-rating"
                value={culturalFit}
                onChange={(_, newValue) => setCulturalFit(newValue)}
                precision={1}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Problem Solving</Typography>
              <Rating
                name="problem-solving-rating"
                value={problemSolving}
                onChange={(_, newValue) => setProblemSolving(newValue)}
                precision={1}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <FormLabel>Strengths</FormLabel>
              <Box display="flex" sx={{ mb: 1 }}>
                <TextField 
                  fullWidth
                  size="small"
                  value={currentStrength}
                  onChange={(e) => setCurrentStrength(e.target.value)}
                  placeholder="Enter a strength"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStrength();
                    }
                  }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddStrength}
                  disabled={!currentStrength.trim()}
                  sx={{ ml: 1 }}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {strengths.map((strength, index) => (
                  <Chip
                    key={index}
                    label={strength}
                    onDelete={() => handleRemoveStrength(strength)}
                    color="success"
                  />
                ))}
              </Box>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <FormLabel>Areas for Improvement</FormLabel>
              <Box display="flex" sx={{ mb: 1 }}>
                <TextField 
                  fullWidth
                  size="small"
                  value={currentWeakness}
                  onChange={(e) => setCurrentWeakness(e.target.value)}
                  placeholder="Enter an area for improvement"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddWeakness();
                    }
                  }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddWeakness}
                  disabled={!currentWeakness.trim()}
                  sx={{ ml: 1 }}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {weaknesses.map((weakness, index) => (
                  <Chip
                    key={index}
                    label={weakness}
                    onDelete={() => handleRemoveWeakness(weakness)}
                    color="error"
                  />
                ))}
              </Box>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Detailed Feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide detailed feedback about the candidate's performance during the interview..."
              required
              error={feedback.trim() === ''}
              helperText={feedback.trim() === '' ? 'Feedback is required' : ''}
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading || success}
          startIcon={loading && <CircularProgress size={20} color="inherit" />}
        >
          {loading ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InterviewRatingDialog; 