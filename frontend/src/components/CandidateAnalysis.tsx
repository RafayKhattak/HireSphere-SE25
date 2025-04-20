import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Chip,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { applicationService } from '../services/api';

interface CandidateAnalysisProps {
  jobId: string;
  applicationId: string;
  open: boolean;
  onClose: () => void;
}

interface AnalysisData {
  candidate: {
    id: string;
    name: string;
  };
  overallScore: number;
  recommendation: string;
  skillAnalysis: {
    matchedSkills: string[];
    missingSkills: string[];
    skillMatch: number;
  };
  experienceAnalysis: {
    relevantExperience: {
      title: string;
      company: string;
      description?: string;
    }[];
    yearsOfExperience: string;
    experienceMatch: number;
  };
  educationAnalysis: {
    relevantEducation: {
      degree: string;
      institution: string;
      graduationYear: number;
    }[];
    educationMatch: number;
  };
  coverLetterAnalysis: {
    relevance: number;
    tone: string;
    clarity: string;
    keywords: string[];
  };
  applicationStatus: string;
  appliedAt: string;
}

const CandidateAnalysis: React.FC<CandidateAnalysisProps> = ({ jobId, applicationId, open, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  useEffect(() => {
    if (open) {
      fetchAnalysis();
    }
  }, [jobId, applicationId, open]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await applicationService.getApplicationAnalysis(jobId, applicationId);
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analysis');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#2196f3';
    if (score >= 40) return '#ff9800';
    return '#f44336';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">AI-Based Candidate Analysis</Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" p={3}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Analyzing candidate data...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : analysis ? (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">{analysis.candidate.name}</Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="h4" sx={{ mr: 1 }}>{analysis.overallScore}%</Typography>
                <Box>
                  <Typography variant="caption" color="textSecondary">Overall Match</Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ color: getScoreColor(analysis.overallScore) }}>
                    {analysis.recommendation}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Skills Analysis */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                Skills Analysis
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Skill Match Score</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: getScoreColor(analysis.skillAnalysis.skillMatch) }}>
                    {analysis.skillAnalysis.skillMatch}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.skillAnalysis.skillMatch} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(analysis.skillAnalysis.skillMatch)
                    }
                  }} 
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Matched Skills</Typography>
                  <List dense>
                    {analysis.skillAnalysis.matchedSkills.map((skill, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={skill} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Missing Skills</Typography>
                  <List dense>
                    {analysis.skillAnalysis.missingSkills.map((skill, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <CloseIcon color="error" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={skill} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Experience Analysis */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                Experience Analysis
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Experience Match Score</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: getScoreColor(analysis.experienceAnalysis.experienceMatch) }}>
                    {analysis.experienceAnalysis.experienceMatch}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.experienceAnalysis.experienceMatch} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(analysis.experienceAnalysis.experienceMatch)
                    }
                  }} 
                />
              </Box>

              <Typography variant="body2" gutterBottom>
                Years of Experience: <strong>{analysis.experienceAnalysis.yearsOfExperience}</strong>
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Relevant Experience</Typography>
              <List dense>
                {analysis.experienceAnalysis.relevantExperience.map((exp, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WorkIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${exp.title} at ${exp.company}`} 
                      secondary={exp.description} 
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Education Analysis */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                Education Analysis
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Education Match Score</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: getScoreColor(analysis.educationAnalysis.educationMatch) }}>
                    {analysis.educationAnalysis.educationMatch}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.educationAnalysis.educationMatch} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(analysis.educationAnalysis.educationMatch)
                    }
                  }} 
                />
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Education History</Typography>
              <List dense>
                {analysis.educationAnalysis.relevantEducation.map((edu, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <SchoolIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${edu.degree} from ${edu.institution}`} 
                      secondary={`Graduation Year: ${edu.graduationYear}`} 
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Cover Letter Analysis */}
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                Cover Letter Analysis
              </Typography>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Cover Letter Relevance</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ color: getScoreColor(analysis.coverLetterAnalysis.relevance) }}>
                    {analysis.coverLetterAnalysis.relevance}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysis.coverLetterAnalysis.relevance} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getScoreColor(analysis.coverLetterAnalysis.relevance)
                    }
                  }} 
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>Tone: <strong>{analysis.coverLetterAnalysis.tone}</strong></Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>Clarity: <strong>{analysis.coverLetterAnalysis.clarity}</strong></Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Key Phrases Identified</Typography>
              <Box>
                {analysis.coverLetterAnalysis.keywords.map((keyword, index) => (
                  <Chip 
                    key={index}
                    label={keyword}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        ) : (
          <Alert severity="error">No analysis data available</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CandidateAnalysis; 