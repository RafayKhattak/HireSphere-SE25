import React, { useState } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Paper,
  Slider,
  InputAdornment,
  useTheme,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import FilterListIcon from '@mui/icons-material/FilterList';

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
  const [salaryRange, setSalaryRange] = useState<number[]>([0, 1000000]);
  const [jobType, setJobType] = useState('');
  const theme = useTheme();

  const handleSalaryChange = (event: Event, newValue: number | number[]) => {
    setSalaryRange(newValue as number[]);
  };

  const handleReset = () => {
    setKeywords('');
    setLocation('');
    setSalaryRange([0, 1000000]);
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
    if (salaryRange[1] < 1000000) filters.maxSalary = salaryRange[1];
    if (jobType) filters.jobType = jobType;
    
    onApplyFilters(filters);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FilterListIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Filter Jobs</Typography>
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1) }}>
        <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
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
        </Box>
        
        <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
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
        </Box>
        
        <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
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
        </Box>
        
        <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', md: '50%' } }}>
          <Typography gutterBottom>Salary Range (PKR)</Typography>
          <Slider
            value={salaryRange}
            onChange={handleSalaryChange}
            valueLabelDisplay="auto"
            min={0}
            max={1000000}
            step={25000}
            valueLabelFormat={(value) => `PKR ${value.toLocaleString()}`}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">PKR {salaryRange[0].toLocaleString()}</Typography>
            <Typography variant="caption">PKR {salaryRange[1].toLocaleString()}</Typography>
          </Box>
        </Box>
        
        <Box sx={{ padding: theme => theme.spacing(1), width: '100%', mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            type="submit"
            onClick={handleSubmit}
          >
            Apply Filters
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default JobFilters; 