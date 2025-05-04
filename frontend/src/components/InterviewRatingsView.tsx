import React, { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Rating, Typography, Box, Chip, Divider,
  List, ListItem, ListItemText, Avatar, Grid, Paper
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TimerIcon from '@mui/icons-material/Timer';
import { format } from 'date-fns';

interface RatingCategory {
  name: string;
  value: number | null;
}

interface InterviewRating {
  _id: string;
  rating: number;
  technicalSkills: number | null;
  communication: number | null;
  culturalFit: number | null;
  problemSolving: number | null;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  interviewer: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
}

interface InterviewRatingsViewProps {
  open: boolean;
  onClose: () => void;
  ratings: InterviewRating[];
  candidateName: string;
}

const InterviewRatingsView: React.FC<InterviewRatingsViewProps> = ({
  open,
  onClose,
  ratings,
  candidateName
}) => {
  useEffect(() => {
    if (open) {
      console.log(`[CandidateRating] Viewing ratings for candidate ${candidateName}`);
      console.log(`[CandidateRating] Found ${ratings.length} ratings to display`);
    }
  }, [open, ratings, candidateName]);

  if (!ratings.length) {
    console.log(`[CandidateRating] No ratings found for candidate ${candidateName}`);
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const labels: { [index: string]: string } = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
  };

  // Calculate average ratings
  const calculateAverages = () => {
    console.log(`[CandidateRating] Calculating average ratings from ${ratings.length} ratings`);
    
    const sum = {
      overall: 0,
      technical: 0,
      communication: 0,
      cultural: 0,
      problemSolving: 0
    };
    
    const count = {
      overall: 0,
      technical: 0,
      communication: 0,
      cultural: 0,
      problemSolving: 0
    };
    
    ratings.forEach(rating => {
      // Overall is required
      sum.overall += rating.rating;
      count.overall++;
      
      // Other categories are optional
      if (rating.technicalSkills) {
        sum.technical += rating.technicalSkills;
        count.technical++;
      }
      
      if (rating.communication) {
        sum.communication += rating.communication;
        count.communication++;
      }
      
      if (rating.culturalFit) {
        sum.cultural += rating.culturalFit;
        count.cultural++;
      }
      
      if (rating.problemSolving) {
        sum.problemSolving += rating.problemSolving;
        count.problemSolving++;
      }
    });
    
    const result = {
      overall: count.overall ? Math.round((sum.overall / count.overall) * 10) / 10 : 0,
      technical: count.technical ? Math.round((sum.technical / count.technical) * 10) / 10 : null,
      communication: count.communication ? Math.round((sum.communication / count.communication) * 10) / 10 : null,
      cultural: count.cultural ? Math.round((sum.cultural / count.cultural) * 10) / 10 : null,
      problemSolving: count.problemSolving ? Math.round((sum.problemSolving / count.problemSolving) * 10) / 10 : null
    };
    
    console.log(`[CandidateRating] Average ratings calculated - Overall: ${result.overall}`);
    if (result.technical) console.log(`[CandidateRating] Technical: ${result.technical}`);
    if (result.communication) console.log(`[CandidateRating] Communication: ${result.communication}`);
    if (result.cultural) console.log(`[CandidateRating] Cultural Fit: ${result.cultural}`);
    if (result.problemSolving) console.log(`[CandidateRating] Problem Solving: ${result.problemSolving}`);
    
    return result;
  };

  const averages = calculateAverages();

  // Collect all strengths and weaknesses
  const aggregateStrengthsAndWeaknesses = () => {
    console.log(`[CandidateRating] Aggregating strengths and weaknesses from all ratings`);
    
    const allStrengths: { [key: string]: number } = {};
    const allWeaknesses: { [key: string]: number } = {};
    
    ratings.forEach(rating => {
      rating.strengths.forEach(strength => {
        allStrengths[strength] = (allStrengths[strength] || 0) + 1;
      });
      
      rating.weaknesses.forEach(weakness => {
        allWeaknesses[weakness] = (allWeaknesses[weakness] || 0) + 1;
      });
    });
    
    const result = {
      strengths: Object.entries(allStrengths)
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count),
      weaknesses: Object.entries(allWeaknesses)
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
    };
    
    console.log(`[CandidateRating] Found ${result.strengths.length} unique strengths and ${result.weaknesses.length} unique weaknesses`);
    
    return result;
  };

  const { strengths, weaknesses } = aggregateStrengthsAndWeaknesses();

  const handleClose = () => {
    console.log(`[CandidateRating] Closing ratings view for candidate ${candidateName}`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Interview Ratings for {candidateName}
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Summary Section */}
          <Grid sx={{ gridColumn: 'span 12' }}>
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Rating Summary</Typography>
              
              <Grid container spacing={2}>
                <Grid sx={{ gridColumn: 'span 12', sm: 'span 6' }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Overall Rating
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Rating
                        value={averages.overall}
                        precision={0.5}
                        readOnly
                        size="large"
                        emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
                      />
                      <Typography variant="h5" sx={{ ml: 1.5, fontWeight: 'bold' }}>
                        {averages.overall.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        ({ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'})
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                {/* Category Ratings */}
                <Grid sx={{ gridColumn: 'span 12', sm: 'span 6' }}>
                  <Grid container spacing={1}>
                    {[
                      { name: 'Technical Skills', value: averages.technical },
                      { name: 'Communication', value: averages.communication },
                      { name: 'Cultural Fit', value: averages.cultural },
                      { name: 'Problem Solving', value: averages.problemSolving }
                    ].map((category: RatingCategory) => (
                      category.value ? (
                        <Grid sx={{ gridColumn: 'span 6' }} key={category.name}>
                          <Typography variant="body2" color="text.secondary">
                            {category.name}
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <Rating
                              value={category.value}
                              precision={0.5}
                              readOnly
                              size="small"
                            />
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {category.value.toFixed(1)}
                            </Typography>
                          </Box>
                        </Grid>
                      ) : null
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Strengths & Weaknesses */}
          <Grid sx={{ gridColumn: 'span 12', sm: 'span 6' }}>
            <Typography variant="h6" gutterBottom>Key Strengths</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {strengths.map(({ text, count }) => (
                <Chip
                  key={text}
                  label={text}
                  color="success"
                  variant="outlined"
                  size="small"
                  icon={count > 1 ? <Typography sx={{ fontSize: '0.75rem', ml: 1 }}>{count}×</Typography> : undefined}
                />
              ))}
              {strengths.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No strengths recorded yet
                </Typography>
              )}
            </Box>
          </Grid>
          
          <Grid sx={{ gridColumn: 'span 12', sm: 'span 6' }}>
            <Typography variant="h6" gutterBottom>Areas for Improvement</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {weaknesses.map(({ text, count }) => (
                <Chip
                  key={text}
                  label={text}
                  color="error"
                  variant="outlined"
                  size="small"
                  icon={count > 1 ? <Typography sx={{ fontSize: '0.75rem', ml: 1 }}>{count}×</Typography> : undefined}
                />
              ))}
              {weaknesses.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No areas for improvement recorded yet
                </Typography>
              )}
            </Box>
          </Grid>
          
          {/* Individual Ratings */}
          <Grid sx={{ gridColumn: 'span 12' }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Interview Feedback</Typography>
            
            <List>
              {ratings.map((rating) => (
                <React.Fragment key={rating._id}>
                  <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Box display="flex" alignItems="flex-start">
                      <Avatar 
                        src={rating.interviewer.profileImage} 
                        sx={{ mr: 2 }}
                      >
                        {getInitials(rating.interviewer.name)}
                      </Avatar>
                      
                      <Box flex={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1">
                            {rating.interviewer.name}
                          </Typography>
                          
                          <Box display="flex" alignItems="center">
                            <TimerIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(rating.createdAt), 'PPp')}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Box display="flex" alignItems="center" my={1}>
                          <Rating value={rating.rating} readOnly size="small" />
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {labels[rating.rating] || ''}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          <FormatQuoteIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                          {rating.feedback}
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          {rating.strengths.length > 0 && (
                            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                              <Typography variant="caption" color="success.main">
                                Strengths:
                              </Typography>
                              <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                                {rating.strengths.map((strength, i) => (
                                  <Typography component="li" variant="caption" key={i}>
                                    {strength}
                                  </Typography>
                                ))}
                              </Box>
                            </Grid>
                          )}
                          
                          {rating.weaknesses.length > 0 && (
                            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                              <Typography variant="caption" color="error.main">
                                Areas for Improvement:
                              </Typography>
                              <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                                {rating.weaknesses.map((weakness, i) => (
                                  <Typography component="li" variant="caption" key={i}>
                                    {weakness}
                                  </Typography>
                                ))}
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    </Box>
                  </Paper>
                </React.Fragment>
              ))}
            </List>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InterviewRatingsView; 