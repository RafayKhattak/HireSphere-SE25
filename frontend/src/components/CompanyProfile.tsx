import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  Box, 
  Grid,
  Card, 
  CardContent, 
  Divider, 
  Avatar, 
  Button, 
  Chip, 
  Rating, 
  Tab, 
  Tabs, 
  CircularProgress, 
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Tooltip,
  Pagination
} from '@mui/material';
import Business from '@mui/icons-material/Business'; 
import LocationOn from '@mui/icons-material/LocationOn'; 
import Language from '@mui/icons-material/Language'; 
import Facebook from '@mui/icons-material/Facebook'; 
import Twitter from '@mui/icons-material/Twitter'; 
import LinkedIn from '@mui/icons-material/LinkedIn';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Group from '@mui/icons-material/Group';
import Category from '@mui/icons-material/Category';
import Work from '@mui/icons-material/Work';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';
import ThumbUp from '@mui/icons-material/ThumbUp';
import ThumbDown from '@mui/icons-material/ThumbDown';
import FilterList from '@mui/icons-material/FilterList';
import Sort from '@mui/icons-material/Sort';
import { useAuth } from '../context/AuthContext';
import { companyService, jobService, reviewService } from '../services/api';

// Types
interface CompanyData {
  _id: string;
  companyName: string;
  companyDescription: string;
  companyLogo?: string;
  companyWebsite?: string;
  companySize?: string;
  industry?: string;
  foundedYear?: number;
  location?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

interface Job {
  _id: string;
  title: string;
  location: string;
  type: string;
  createdAt: string;
}

interface CompanyReview {
  _id: string;
  rating: number;
  title: string;
  review: string;
  pros?: string;
  cons?: string;
  position?: string;
  isCurrentEmployee: boolean;
  employmentStatus: string;
  workDuration?: string;
  createdAt: string;
  reviewer: {
    name: string;
    _id?: string;
  };
  categories?: {
    workLifeBalance?: number;
    compensation?: number;
    jobSecurity?: number;
    management?: number;
    cultureValues?: number;
  };
}

interface RatingsSummary {
  averageRating: number;
  workLifeBalance: number;
  compensation: number;
  jobSecurity: number;
  management: number;
  cultureValues: number;
  totalReviews: number;
}

interface ReviewsPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`company-tabpanel-${index}`}
      aria-labelledby={`company-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const CompanyProfile: React.FC = () => {
  const { employerId } = useParams<{ employerId: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [ratings, setRatings] = useState<RatingsSummary | null>(null);
  const [pagination, setPagination] = useState<ReviewsPagination | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsSort, setReviewsSort] = useState('recent');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Add new state for reviews loading/error independent of main loading
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // New review form state
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewPros, setReviewPros] = useState('');
  const [reviewCons, setReviewCons] = useState('');
  const [position, setPosition] = useState('');
  const [isCurrentEmployee, setIsCurrentEmployee] = useState(false);
  const [employmentStatus, setEmploymentStatus] = useState('prefer-not-to-say');
  const [workDuration, setWorkDuration] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Category ratings
  const [workLifeBalance, setWorkLifeBalance] = useState<number | null>(null);
  const [compensation, setCompensation] = useState<number | null>(null);
  const [jobSecurity, setJobSecurity] = useState<number | null>(null);
  const [management, setManagement] = useState<number | null>(null);
  const [cultureValues, setCultureValues] = useState<number | null>(null);

  const fetchCompanyData = useCallback(async () => {
    if (!employerId) return;
    setLoading(true);
    setError(null);
    try {
      // Use companyService.getCompanyProfile
      const profileRes = await companyService.getCompanyProfile(employerId);
      setCompany(profileRes.data);

      // Use companyService.getCompanyJobs
      const jobsRes = await companyService.getCompanyJobs(employerId);
      setJobs(jobsRes.data);

      // Use companyService.getCompanyReviews
      const reviewsRes = await companyService.getCompanyReviews(employerId);
      setReviews(reviewsRes.data.reviews);
      setRatings(reviewsRes.data.ratings);

    } catch (err: any) {
      console.error('Error fetching company data:', err);
      setError(err.response?.data?.message || 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  }, [employerId]);

  // Define fetchReviews function
  const fetchReviews = useCallback(async (page: number, sort: string) => {
    if (!employerId) return;
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      // Use companyService.getCompanyReviews with page and sort parameters
      const reviewsRes = await companyService.getCompanyReviews(employerId, { page, sort });
      setReviews(reviewsRes.data.reviews);
      setRatings(reviewsRes.data.ratings);
      setPagination(reviewsRes.data.pagination);
      setReviewsPage(page); // Update the current page state
      setReviewsSort(sort); // Update the current sort state
    } catch (err: any) {
      console.error('Error fetching company reviews:', err);
      setReviewsError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  }, [employerId]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    fetchReviews(value, reviewsSort);
  };

  const handleSortChange = (sort: string) => {
    fetchReviews(1, sort);
  };

  const handleReviewDialogOpen = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/company/${employerId}` } });
      return;
    }
    
    if (user?.type !== 'jobseeker') {
      setError('Only job seekers can submit company reviews');
      return;
    }
    
    setReviewDialogOpen(true);
  };

  const handleReviewDialogClose = () => {
    setReviewDialogOpen(false);
    resetReviewForm();
  };

  const resetReviewForm = () => {
    setReviewRating(0);
    setReviewTitle('');
    setReviewText('');
    setReviewPros('');
    setReviewCons('');
    setPosition('');
    setIsCurrentEmployee(false);
    setEmploymentStatus('prefer-not-to-say');
    setWorkDuration('');
    setIsAnonymous(false);
    setWorkLifeBalance(null);
    setCompensation(null);
    setJobSecurity(null);
    setManagement(null);
    setCultureValues(null);
    setFormError(null);
  };

  const handleReviewSubmit = async () => {
    if (!employerId || !user) return;
    // Validate form
    if (reviewRating === 0) {
      setFormError('Please provide an overall rating');
      return;
    }
    
    if (!reviewTitle.trim()) {
      setFormError('Please provide a review title');
      return;
    }
    
    if (!reviewText.trim()) {
      setFormError('Please provide a review');
      return;
    }
    
    setSubmitting(true);
    setFormError(null);
    
    try {
      const reviewData = {
        rating: reviewRating,
        title: reviewTitle,
        review: reviewText,
        pros: reviewPros,
        cons: reviewCons,
        position,
        isCurrentEmployee,
        employmentStatus,
        workDuration,
        isAnonymous,
        categories: {
          workLifeBalance: workLifeBalance || undefined,
          compensation: compensation || undefined,
          jobSecurity: jobSecurity || undefined,
          management: management || undefined,
          cultureValues: cultureValues || undefined
        }
      };
      
      // Use reviewService.submitReview
      await reviewService.submitReview(employerId, reviewData);
      
      // Close dialog and refresh reviews
      handleReviewDialogClose();
      fetchCompanyData();
      
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setFormError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !company) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Company not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Company Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', margin: theme => theme.spacing(-1.5) }}>
          <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: 'calc(100% / 6)' }, display: 'flex', justifyContent: 'center' }}>
            <Avatar
              src={company.companyLogo}
              alt={company.companyName}
              sx={{ 
                width: 100, 
                height: 100,
                border: '1px solid #eee'
              }}
            >
              {!company.companyLogo && company.companyName.charAt(0)}
            </Avatar>
          </Box>
          
          <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: 'calc(100% * 5 / 6)' } }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {company.companyName}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              {ratings && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Rating 
                    value={ratings.averageRating} 
                    precision={0.1} 
                    readOnly 
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {ratings.averageRating.toFixed(1)} ({ratings.totalReviews} reviews)
                  </Typography>
                </Box>
              )}
              
              {company.location && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOn fontSize="small" color="action" sx={{ mr: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {company.location}
                  </Typography>
                </Box>
              )}
              
              {company.industry && (
                <Chip 
                  icon={<Category fontSize="small" />} 
                  label={company.industry} 
                  size="small" 
                  sx={{ borderRadius: 1 }}
                />
              )}
              
              {company.companySize && (
                <Chip 
                  icon={<Group fontSize="small" />} 
                  label={`${company.companySize} employees`} 
                  size="small" 
                  sx={{ borderRadius: 1 }}
                />
              )}
              
              {company.foundedYear && (
                <Chip 
                  icon={<CalendarToday fontSize="small" />} 
                  label={`Founded ${company.foundedYear}`} 
                  size="small" 
                  sx={{ borderRadius: 1 }}
                />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              {company.companyWebsite && (
                <IconButton 
                  href={company.companyWebsite.startsWith('http') 
                    ? company.companyWebsite 
                    : `https://${company.companyWebsite}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  size="small"
                  color="primary"
                >
                  <Language />
                </IconButton>
              )}
              
              {company.socialMedia?.linkedin && (
                <IconButton 
                  href={company.socialMedia.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  size="small"
                  color="primary"
                >
                  <LinkedIn />
                </IconButton>
              )}
              
              {company.socialMedia?.twitter && (
                <IconButton 
                  href={company.socialMedia.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  size="small"
                  color="primary"
                >
                  <Twitter />
                </IconButton>
              )}
              
              {company.socialMedia?.facebook && (
                <IconButton 
                  href={company.socialMedia.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  size="small"
                  color="primary"
                >
                  <Facebook />
                </IconButton>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
      
      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="company tabs"
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
        >
          <Tab label="About" id="company-tab-0" aria-controls="company-tabpanel-0" />
          <Tab label="Reviews" id="company-tab-1" aria-controls="company-tabpanel-1" />
          <Tab label="Jobs" id="company-tab-2" aria-controls="company-tabpanel-2" />
        </Tabs>
      </Box>
      
      {/* About Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>About {company.companyName}</Typography>
        <Typography variant="body1" paragraph>
          {company.companyDescription || 'No company description available.'}
        </Typography>
      </TabPanel>
      
      {/* Reviews Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Employee Reviews 
            {ratings && ratings.totalReviews > 0 && 
              ` (${ratings.totalReviews})`
            }
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleReviewDialogOpen}
          >
            Write a Review
          </Button>
        </Box>
        
        {/* Ratings Summary */}
        {ratings && ratings.totalReviews > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5), mb: 4 }}>
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: 'calc(100% / 3)' } }}>
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <Typography variant="h2" color="primary">
                  {ratings.averageRating.toFixed(1)}
                </Typography>
                <Rating 
                  value={ratings.averageRating} 
                  precision={0.1} 
                  readOnly 
                  size="large"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Based on {ratings.totalReviews} reviews
                </Typography>
              </Paper>
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: 'calc(100% * 2 / 3)' } }}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Ratings Breakdown</Typography>
                
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Work-Life Balance</Typography>
                    <Typography variant="body2">{ratings.workLifeBalance.toFixed(1)}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(ratings.workLifeBalance / 5) * 100} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Compensation & Benefits</Typography>
                    <Typography variant="body2">{ratings.compensation.toFixed(1)}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(ratings.compensation / 5) * 100} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Job Security</Typography>
                    <Typography variant="body2">{ratings.jobSecurity.toFixed(1)}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(ratings.jobSecurity / 5) * 100} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Management</Typography>
                    <Typography variant="body2">{ratings.management.toFixed(1)}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(ratings.management / 5) * 100} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Culture & Values</Typography>
                    <Typography variant="body2">{ratings.cultureValues.toFixed(1)}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(ratings.cultureValues / 5) * 100} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Paper>
            </Box>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 4 }}>
            No reviews yet. Be the first to review {company.companyName}!
          </Alert>
        )}
        
        {/* Sort Controls */}
        {ratings && ratings.totalReviews > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="reviews-sort-label">Sort By</InputLabel>
              <Select
                labelId="reviews-sort-label"
                value={reviewsSort}
                label="Sort By"
                onChange={(e) => handleSortChange(e.target.value)}
                startAdornment={<Sort sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="recent">Most Recent</MenuItem>
                <MenuItem value="highest">Highest Rated</MenuItem>
                <MenuItem value="lowest">Lowest Rated</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
        
        {/* Reviews List */}
        {reviews.length > 0 ? (
          <List>
            {reviews.map((review) => (
              <Paper key={review._id} elevation={1} sx={{ mb: 2, overflow: 'hidden' }}>
                <ListItem
                  alignItems="flex-start"
                  sx={{ 
                    borderLeft: 4,
                    borderColor: 
                      review.rating >= 4 ? 'success.main' :
                      review.rating >= 3 ? 'info.main' :
                      'error.main',
                    py: 2
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', margin: theme => theme.spacing(-0.5), mb: 1 }}>
                        <Box sx={{ padding: theme => theme.spacing(0.5), width: { xs: '100%', sm: 'calc(100% * 2 / 3)' } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Rating value={review.rating} readOnly size="small" />
                          </Box>
                        </Box>
                        <Box sx={{ padding: theme => theme.spacing(0.5), width: { xs: '100%', sm: 'calc(100% * 1 / 3)' }, textAlign: { xs: 'left', sm: 'right' } }}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography 
                          variant="body2" 
                          color="text.primary"
                          sx={{ mb: 1, whiteSpace: 'pre-line' }}
                        >
                          {review.review}
                        </Typography>
                        
                        {(review.pros || review.cons) && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1), mt: 1 }}>
                            {review.pros && (
                              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                  <ThumbUp color="success" sx={{ mr: 1, fontSize: 18 }} />
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">Pros</Typography>
                                    <Typography variant="body2">{review.pros}</Typography>
                                  </Box>
                                </Box>
                              </Box>
                            )}
                            {review.cons && (
                              <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                  <ThumbDown color="error" sx={{ mr: 1, fontSize: 18 }} />
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">Cons</Typography>
                                    <Typography variant="body2">{review.cons}</Typography>
                                  </Box>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                          {review.position && (
                            <Chip 
                              size="small" 
                              label={review.position} 
                              variant="outlined"
                            />
                          )}
                          {review.employmentStatus !== 'prefer-not-to-say' && (
                            <Chip 
                              size="small" 
                              label={review.employmentStatus}
                              variant="outlined"
                            />
                          )}
                          {review.isCurrentEmployee ? (
                            <Chip 
                              size="small" 
                              label="Current Employee" 
                              variant="outlined"
                              color="success"
                            />
                          ) : (
                            <Chip 
                              size="small" 
                              label="Former Employee" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, color: 'text.secondary' }}>
                          <Typography variant="caption">
                            By {review.reviewer.name} • {new Date(review.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              </Paper>
            ))}
          </List>
        ) : (
          ratings && ratings.totalReviews > 0 ? (
            <Alert severity="info">No reviews match the current filter.</Alert>
          ) : null
        )}
        
        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
              count={pagination.pages} 
              page={pagination.page} 
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </TabPanel>
      
      {/* Jobs Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Open Positions {jobs.length > 0 && `(${jobs.length})`}
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/jobs', { state: { employerId } })}
          >
            View All Jobs
          </Button>
        </Box>
        
        {jobs.length > 0 ? (
          <Box>
            {jobs.map((job) => (
              <Box key={job._id} sx={{ mb: 2 }}>
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    '&:hover': { 
                      boxShadow: 3,
                      cursor: 'pointer'
                    },
                    transition: 'box-shadow 0.3s ease-in-out'
                  }}
                  onClick={() => navigate(`/jobs/${job._id}`)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6" component="h3">{job.title}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary', mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography variant="body2">{job.location}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Work fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography variant="body2" textTransform="capitalize">{job.type.replace('-', ' ')}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarToday fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography variant="body2">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/jobs/${job._id}`);
                      }}
                    >
                      View
                    </Button>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>
        ) : (
          <Alert severity="info">No open positions available at the moment.</Alert>
        )}
      </TabPanel>
      
      {/* Write Review Dialog */}
      <Dialog 
        open={reviewDialogOpen} 
        onClose={handleReviewDialogClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Typography variant="h5">Write a Review for {company.companyName}</Typography>
          <Typography variant="body2" color="text.secondary">
            Share your experience working at this company
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>
          )}
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <Typography gutterBottom>Overall Rating*</Typography>
              <Rating
                name="overall-rating"
                value={reviewRating}
                onChange={(event, newValue) => {
                  setReviewRating(newValue || 0);
                }}
                size="large"
                sx={{ mb: 1 }}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <TextField
                label="Review Title*"
                fullWidth
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                inputProps={{ maxLength: 100 }}
                helperText={`${reviewTitle.length}/100 characters`}
                required
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <TextField
                label="Your Review*"
                fullWidth
                multiline
                rows={5}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                inputProps={{ maxLength: 2000 }}
                helperText={`${reviewText.length}/2000 characters - What did you like or dislike about working here?`}
                required
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <TextField
                label="Pros"
                fullWidth
                multiline
                rows={3}
                value={reviewPros}
                onChange={(e) => setReviewPros(e.target.value)}
                inputProps={{ maxLength: 1000 }}
                helperText={`${reviewPros.length}/1000 characters - Best parts of working here`}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <TextField
                label="Cons"
                fullWidth
                multiline
                rows={3}
                value={reviewCons}
                onChange={(e) => setReviewCons(e.target.value)}
                inputProps={{ maxLength: 1000 }}
                helperText={`${reviewCons.length}/1000 characters - Areas for improvement`}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <TextField
                label="Job Title"
                fullWidth
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <FormControl fullWidth>
                <InputLabel>Employment Status</InputLabel>
                <Select
                  value={employmentStatus}
                  label="Employment Status"
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                >
                  <MenuItem value="full-time">Full-time</MenuItem>
                  <MenuItem value="part-time">Part-time</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                  <MenuItem value="internship">Internship</MenuItem>
                  <MenuItem value="former">Former Employee</MenuItem>
                  <MenuItem value="prefer-not-to-say">Prefer not to say</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <TextField
                label="Employment Duration"
                fullWidth
                placeholder="e.g. 2018-2021 or 3 years"
                value={workDuration}
                onChange={(e) => setWorkDuration(e.target.value)}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={isCurrentEmployee} 
                    onChange={(e) => setIsCurrentEmployee(e.target.checked)} 
                  />
                }
                label="I currently work here"
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <Divider />
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Category Ratings (Optional)
              </Typography>
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <Typography variant="body2" gutterBottom>
                Work-Life Balance
              </Typography>
              <Rating
                name="work-life-balance"
                value={workLifeBalance}
                onChange={(event, newValue) => {
                  setWorkLifeBalance(newValue);
                }}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <Typography variant="body2" gutterBottom>
                Compensation & Benefits
              </Typography>
              <Rating
                name="compensation"
                value={compensation}
                onChange={(event, newValue) => {
                  setCompensation(newValue);
                }}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <Typography variant="body2" gutterBottom>
                Job Security
              </Typography>
              <Rating
                name="job-security"
                value={jobSecurity}
                onChange={(event, newValue) => {
                  setJobSecurity(newValue);
                }}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <Typography variant="body2" gutterBottom>
                Management
              </Typography>
              <Rating
                name="management"
                value={management}
                onChange={(event, newValue) => {
                  setManagement(newValue);
                }}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', md: '50%' } }}>
              <Typography variant="body2" gutterBottom>
                Culture & Values
              </Typography>
              <Rating
                name="culture-values"
                value={cultureValues}
                onChange={(event, newValue) => {
                  setCultureValues(newValue);
                }}
              />
            </Box>
            
            <Box sx={{ padding: theme => theme.spacing(1.5), width: '100%' }}>
              <Divider />
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={isAnonymous} 
                    onChange={(e) => setIsAnonymous(e.target.checked)} 
                  />
                }
                label="Post anonymously"
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleReviewDialogClose}>Cancel</Button>
          <Button 
            onClick={handleReviewSubmit} 
            variant="contained" 
            color="primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CompanyProfile; 