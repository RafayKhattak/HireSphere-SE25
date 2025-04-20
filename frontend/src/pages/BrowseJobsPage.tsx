import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import JobList from '../components/JobList';

const BrowseJobsPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            mb: 4, 
            p: 4, 
            backgroundColor: '#f9fafc', 
            borderRadius: 2
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Find Your Dream Job
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse through our curated list of job opportunities. Use the filters to narrow down 
            your search and find the perfect match for your skills and career goals.
          </Typography>
        </Paper>
        
        <JobList />
      </Box>
    </Container>
  );
};

export default BrowseJobsPage; 