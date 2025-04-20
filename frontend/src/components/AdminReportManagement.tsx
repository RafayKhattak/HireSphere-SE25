import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Pagination,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface Report {
  _id: string;
  reporter: {
    _id: string;
    name: string;
    email: string;
  };
  entityType: 'Job' | 'User';
  entityId: {
    _id: string;
    name?: string;
    title?: string;
    company?: string;
    email?: string;
    status?: string;
  };
  reason: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string;
  actionTaken: 'none' | 'warning' | 'disabled' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

interface ReportStats {
  total: number;
  byStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
  byEntityType: {
    job: number;
    user: number;
  };
  byAction: {
    none: number;
    warning: number;
    disabled: number;
    deleted: number;
  };
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'none':
      return 'default';
    case 'warning':
      return 'info';
    case 'disabled':
      return 'warning';
    case 'deleted':
      return 'error';
    default:
      return 'default';
  }
}

const AdminReportManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<number>(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<'none' | 'warning' | 'disabled' | 'deleted'>('none');
  const [reportStatus, setReportStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);

  // Check if user is admin and redirect if not
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch reports based on current tab and page
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const entityType = tab === 0 ? 'Job' : 'User';
        const response = await axios.get('/api/reports', {
          params: { 
            entityType,
            page,
            limit: 10
          }
        });
        
        setReports(response.data.reports);
        setTotalPages(response.data.pagination.pages);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.msg || 'Error fetching reports');
        setLoading(false);
      }
    };

    fetchReports();
  }, [tab, page]);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/reports/statistics/summary');
        setStats(response.data);
      } catch (err: any) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleOpenDialog = (report: Report) => {
    setSelectedReport(report);
    setReportStatus(report.status);
    setAdminNotes(report.adminNotes || '');
    setActionTaken(report.actionTaken || 'none');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReport(null);
  };

  const handleReviewSubmit = async () => {
    if (!selectedReport) return;

    try {
      setLoading(true);
      
      await axios.put(`/api/reports/${selectedReport._id}`, {
        status: reportStatus,
        adminNotes,
        actionTaken
      });
      
      // Refresh reports
      const entityType = tab === 0 ? 'Job' : 'User';
      const response = await axios.get('/api/reports', {
        params: { 
          entityType,
          page,
          limit: 10
        }
      });
      
      setReports(response.data.reports);
      
      // Refresh stats
      const statsResponse = await axios.get('/api/reports/statistics/summary');
      setStats(statsResponse.data);
      
      setSuccess('Report updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      handleCloseDialog();
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Error updating report');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Report Management
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Total Reports</Typography>
                  <Typography variant="h3">{stats.total}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    Pending: {stats.byStatus.pending}
                  </Typography>
                  <Typography variant="body2">
                    Resolved: {stats.byStatus.approved + stats.byStatus.rejected}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Job Reports</Typography>
                  <Typography variant="h3">{stats.byEntityType.job}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    {((stats.byEntityType.job / stats.total) * 100).toFixed(1)}% of total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>User Reports</Typography>
                  <Typography variant="h3">{stats.byEntityType.user}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    {((stats.byEntityType.user / stats.total) * 100).toFixed(1)}% of total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Actions Taken</Typography>
                  <Typography variant="h3">{stats.byAction.warning + stats.byAction.disabled + stats.byAction.deleted}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    Warnings: {stats.byAction.warning}
                  </Typography>
                  <Typography variant="body2">
                    Disabled: {stats.byAction.disabled}
                  </Typography>
                  <Typography variant="body2">
                    Deleted: {stats.byAction.deleted}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Tabs for Job/User Reports */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={handleTabChange} centered>
          <Tab label="Job Reports" />
          <Tab label="User Reports" />
        </Tabs>
      </Paper>

      {/* Reports Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reported By</TableCell>
              <TableCell>{tab === 0 ? 'Job Title' : 'User'}</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action Taken</TableCell>
              <TableCell>Date Reported</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            )}
            
            {!loading && reports.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No reports found
                </TableCell>
              </TableRow>
            )}
            
            {!loading && reports.map((report) => (
              <TableRow key={report._id}>
                <TableCell>{report.reporter.name}</TableCell>
                <TableCell>
                  {tab === 0 
                    ? `${report.entityId.title} at ${report.entityId.company}`
                    : report.entityId.name
                  }
                </TableCell>
                <TableCell>{report.reason}</TableCell>
                <TableCell>
                  <Chip 
                    label={report.status} 
                    color={getStatusColor(report.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={report.actionTaken || 'none'} 
                    color={getActionColor(report.actionTaken) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {format(new Date(report.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleOpenDialog(report)}
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary" 
          />
        </Box>
      )}

      {/* Review Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Review Report</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Reported By:</Typography>
                  <Typography variant="body1">
                    {selectedReport.reporter.name} ({selectedReport.reporter.email})
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Date Reported:</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedReport.createdAt), 'MMM d, yyyy h:mm a')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">Entity Type:</Typography>
                  <Typography variant="body1">{selectedReport.entityType}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">
                    {selectedReport.entityType === 'Job' ? 'Job Title:' : 'User:'}
                  </Typography>
                  <Typography variant="body1">
                    {selectedReport.entityType === 'Job' 
                      ? `${selectedReport.entityId.title} at ${selectedReport.entityId.company}`
                      : `${selectedReport.entityId.name} (${selectedReport.entityId.email})`
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Reason:</Typography>
                  <Typography variant="body1">{selectedReport.reason}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Details:</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedReport.details}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Admin Actions</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Report Status</InputLabel>
                    <Select
                      value={reportStatus}
                      onChange={(e) => setReportStatus(e.target.value as any)}
                      label="Report Status"
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="approved">Approve Report</MenuItem>
                      <MenuItem value="rejected">Reject Report</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Action to Take</InputLabel>
                    <Select
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value as any)}
                      label="Action to Take"
                    >
                      <MenuItem value="none">No Action</MenuItem>
                      <MenuItem value="warning">Issue Warning</MenuItem>
                      <MenuItem value="disabled">Disable Entity</MenuItem>
                      <MenuItem value="deleted">Delete/Deactivate Entity</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    margin="normal"
                    label="Admin Notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleReviewSubmit} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReportManagement; 