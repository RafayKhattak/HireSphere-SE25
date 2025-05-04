import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Rating, TextField, Typography, Box, Chip,
  FormControl, FormLabel, Divider, Alert, CircularProgress,
  Grid, List, ListItem, ListItemText
} from '@mui/material';
import { applicationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AddIcon from '@mui/icons-material/Add';
import { AxiosError } from 'axios';

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
  const [ratings, setRatings] = useState({
    overall: 0,
    technical: 0,
    communication: 0,
    culturalFit: 0,
    problemSolving: 0
  });
  const [feedback, setFeedback] = useState('');
  
  // Strengths and weaknesses
  const [currentStrength, setCurrentStrength] = useState('');
  const [currentWeakness, setCurrentWeakness] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      console.log(`[CandidateRating] Rating dialog opened for candidate ${candidateName} (Application ID: ${applicationId})`);
    }
  }, [open, candidateName, applicationId]);

  const handleAddStrength = () => {
    if (currentStrength.trim() !== '' && !strengths.includes(currentStrength.trim())) {
      const newStrength = currentStrength.trim();
      console.log(`[CandidateRating] Adding strength: "${newStrength}"`);
      setStrengths([...strengths, newStrength]);
      setCurrentStrength('');
    }
  };

  const handleAddWeakness = () => {
    if (currentWeakness.trim() !== '' && !weaknesses.includes(currentWeakness.trim())) {
      const newWeakness = currentWeakness.trim();
      console.log(`[CandidateRating] Adding weakness: "${newWeakness}"`);
      setWeaknesses([...weaknesses, newWeakness]);
      setCurrentWeakness('');
    }
  };

  const handleRemoveStrength = (strength: string) => {
    console.log(`[CandidateRating] Removing strength: "${strength}"`);
    setStrengths(strengths.filter(s => s !== strength));
  };

  const handleRemoveWeakness = (weakness: string) => {
    console.log(`[CandidateRating] Removing weakness: "${weakness}"`);
    setWeaknesses(weaknesses.filter(w => w !== weakness));
  };

  const validateForm = () => {
    if (!ratings.overall) {
      console.log(`[CandidateRating] Validation error: Overall rating is required`);
      setError('Overall rating is required');
      return false;
    }
    if (!feedback.trim()) {
      console.log(`[CandidateRating] Validation error: Feedback is required`);
      setError('Feedback is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    console.log(`[CandidateRating] Attempting to submit rating for application ID: ${applicationId}`);
    
    if (!ratings.overall || !ratings.technical || !ratings.communication || !ratings.culturalFit || !ratings.problemSolving) {
      console.log(`[CandidateRating] Validation error: Missing one or more required ratings`);
      setError('Please provide all ratings before submitting');
      return;
    }
    
    if (feedback.trim() === '') {
      console.log(`[CandidateRating] Validation error: Feedback is empty`);
      setError('Please provide feedback');
      return;
    }

    try {
      setLoading(true);
      console.log(`[CandidateRating] Preparing rating data for submission`);
      
      const ratingData = {
        rating: ratings.overall,
        technicalSkills: ratings.technical,
        communication: ratings.communication,
        culturalFit: ratings.culturalFit,
        problemSolving: ratings.problemSolving,
        strengths,
        weaknesses,
        feedback
      };
      
      console.log(`[CandidateRating] Submitting rating with ${strengths.length} strengths and ${weaknesses.length} weaknesses`);
      await applicationService.rateInterview(applicationId, ratingData);
      
      console.log(`[CandidateRating] Rating submitted successfully for application ID: ${applicationId}`);
      setSuccess(true);
      setTimeout(() => {
        onRatingSubmitted();
      }, 1500);
    } catch (error) {
      console.error(`[CandidateRating] Error submitting rating:`, error);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      console.log(`[CandidateRating] Closing rating dialog for application ID: ${applicationId}`);
      onClose();
    }
  };

  const handleRatingChange = (category: string, value: number | null) => {
    console.log(`[CandidateRating] Updated ${category} rating to ${value || 0}/5`);
    setRatings({ 
      ...ratings, 
      [category]: value || 0 
    });
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
          <Grid component="div" sx={{ gridColumn: 'span 12' }}>
            <Typography component="legend">Overall Rating*</Typography>
            <Rating
              name="overall"
              value={ratings.overall}
              onChange={(event, newValue) => {
                handleRatingChange('overall', newValue);
              }}
              precision={0.5}
              emptyIcon={<StarIcon fontSize="inherit" />}
            />
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
            <Typography component="legend">Technical Skills*</Typography>
            <Rating
              name="technical"
              value={ratings.technical}
              onChange={(event, newValue) => {
                handleRatingChange('technical', newValue);
              }}
              precision={0.5}
            />
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
            <Typography component="legend">Communication*</Typography>
            <Rating
              name="communication"
              value={ratings.communication}
              onChange={(event, newValue) => {
                handleRatingChange('communication', newValue);
              }}
              precision={0.5}
            />
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
            <Typography component="legend">Cultural Fit*</Typography>
            <Rating
              name="culturalFit"
              value={ratings.culturalFit}
              onChange={(event, newValue) => {
                handleRatingChange('culturalFit', newValue);
              }}
              precision={0.5}
            />
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
            <Typography component="legend">Problem Solving*</Typography>
            <Rating
              name="problemSolving"
              value={ratings.problemSolving}
              onChange={(event, newValue) => {
                handleRatingChange('problemSolving', newValue);
              }}
              precision={0.5}
            />
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: 'span 12' }}>
            <TextField
              fullWidth
              label="Feedback"
              multiline
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              margin="normal"
            />
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: 'span 12' }}>
            <Typography variant="subtitle1" gutterBottom>
              Strengths
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {strengths.map((strength, index) => (
                <Chip
                  key={index}
                  label={strength}
                  onDelete={() => handleRemoveStrength(strength)}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Add a strength"
                value={currentStrength}
                onChange={(e) => setCurrentStrength(e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddStrength}
                disabled={!currentStrength.trim()}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Box>
          </Grid>
          
          <Grid component="div" sx={{ gridColumn: 'span 12' }}>
            <Typography variant="subtitle1" gutterBottom>
              Areas to Improve
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {weaknesses.map((weakness, index) => (
                <Chip
                  key={index}
                  label={weakness}
                  onDelete={() => handleRemoveWeakness(weakness)}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Add an area to improve"
                value={currentWeakness}
                onChange={(e) => setCurrentWeakness(e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddWeakness}
                disabled={!currentWeakness.trim()}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Box>
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
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit Rating'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InterviewRatingDialog; 