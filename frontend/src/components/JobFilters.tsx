import React, { useState } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Typography,
  Paper,
  Slider,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';

interface JobFiltersProps {
  onApplyFilters: (filters: {
    keywords?: string;
    location?: string;
    minSalary?: number;
    maxSalary?: number;
    jobType?: string;
  }) => void;
}

const JobFilters: React.FC<JobFiltersProps> = ({ onApplyFilters }) => {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState<number[]>([0, 200000]);
  const [jobType, setJobType] = useState('');

  const handleSalaryChange = (event: Event, newValue: number | number[]) => {
    setSalaryRange(newValue as number[]);
  };

  const handleReset = () => {
    setKeywords('');
    setLocation('');
    setSalaryRange([0, 200000]);
    setJobType('');
    
    onApplyFilters({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filters: {
      keywords?: string;
      location?: string;
      minSalary?: number;
      maxSalary?: number;
      jobType?: string;
    } = {};
    
    if (keywords) filters.keywords = keywords;
    if (location) filters.location = location;
    if (salaryRange[0] > 0) filters.minSalary = salaryRange[0];
    if (salaryRange[1] < 200000) filters.maxSalary = salaryRange[1];
    if (jobType) filters.jobType = jobType;
    
    onApplyFilters(filters);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Filter Jobs
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Job title, skills, or keywords"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, state, or remote"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocationOnIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Job Type</InputLabel>
              <Select
                value={jobType}
                label="Job Type"
                onChange={(e) => setJobType(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <WorkIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="full-time">Full-time</MenuItem>
                <MenuItem value="part-time">Part-time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="internship">Internship</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                sx={{ flex: 1 }}
              >
                Apply Filters
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                sx={{ flex: 1 }}
              >
                Reset
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Typography gutterBottom>
              Salary Range: ${salaryRange[0].toLocaleString()} - ${salaryRange[1].toLocaleString()}
            </Typography>
            <Slider
              value={salaryRange}
              onChange={handleSalaryChange}
              valueLabelDisplay="auto"
              min={0}
              max={200000}
              step={5000}
              valueLabelFormat={(value) => `$${value.toLocaleString()}`}
            />
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default JobFilters; 