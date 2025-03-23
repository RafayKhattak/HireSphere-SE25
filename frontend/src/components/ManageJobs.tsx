import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

interface Job {
    _id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    status: string;
    createdAt: string;
}

const ManageJobs: React.FC = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success'
    });

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No authentication token found');
                setLoading(false);
                return;
            }

            const response = await axios.get('http://localhost:5000/api/jobs/employer', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setJobs(response.data);
            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching jobs:', err);
            setError(err.response?.data?.message || 'Failed to fetch jobs');
            setLoading(false);
        }
    };

    const handleEdit = (jobId: string) => {
        navigate(`/jobs/edit/${jobId}`);
    };

    const handleDeleteClick = (jobId: string) => {
        setSelectedJobId(jobId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedJobId) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setSnackbar({
                    open: true,
                    message: 'No authentication token found',
                    severity: 'error'
                });
                return;
            }

            await axios.delete(`http://localhost:5000/api/jobs/${selectedJobId}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setJobs(jobs.filter(job => job._id !== selectedJobId));
            setSnackbar({
                open: true,
                message: 'Job deleted successfully',
                severity: 'success'
            });
            setDeleteDialogOpen(false);
        } catch (err: any) {
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'Failed to delete job',
                severity: 'error'
            });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    if (loading) {
        return (
            <Container>
                <Typography>Loading...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Manage Job Posts
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/jobs/post')}
                >
                    Post New Job
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Title</TableCell>
                            <TableCell>Company</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Posted Date</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {jobs.map((job) => (
                            <TableRow key={job._id}>
                                <TableCell>{job.title}</TableCell>
                                <TableCell>{job.company}</TableCell>
                                <TableCell>{job.location}</TableCell>
                                <TableCell>{job.type}</TableCell>
                                <TableCell>{job.status}</TableCell>
                                <TableCell>
                                    {new Date(job.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleEdit(job._id)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDeleteClick(job._id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this job post?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ManageJobs; 