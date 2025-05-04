import React, { useState, useEffect, useCallback } from 'react';
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
  Card,
  CardContent,
  Pagination,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/api';

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
    if (user && user.type !== 'admin') {
      console.log('[FraudManagement] User is not admin, redirecting to dashboard');
      navigate('/dashboard');
    } else if (user && user.type === 'admin') {
      console.log('[FraudManagement] Admin user authenticated: ' + user.email);
    }
  }, [user, navigate]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('[FraudManagement] Fetching reports for tab:', tab === 0 ? 'Jobs' : 'Users');
    try {
      const entityType = tab === 0 ? 'Job' : 'User';
      const params = {
        entityType,
        page,
        limit: 10
      };
      console.log('[FraudManagement] Request params:', params);
      
      const response = await reportService.getReports(params);
      console.log(`[FraudManagement] Received ${response.reports?.length || 0} reports`);
      setReports(response.reports || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (err: any) {
      console.error('[FraudManagement] Error fetching reports:', err);
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  // Fetch reports when tab or page changes
  useEffect(() => {
    fetchReports();
  }, [fetchReports, tab, page]);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      console.log('[FraudManagement] Fetching report statistics');
      try {
        const response = await axios.get('/api/reports/statistics/summary');
        console.log('[FraudManagement] Report statistics:', response.data);
        setStats(response.data);
        
        // Log important metrics
        if (response.data) {
          console.log(`[FraudManagement] Pending reports: ${response.data.byStatus.pending}`);
          console.log(`[FraudManagement] Fraudulent job reports: ${response.data.byEntityType.job}`);
        }
      } catch (err: any) {
        console.error('[FraudManagement] Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    console.log(`[FraudManagement] Switching to tab: ${newValue === 0 ? 'Jobs' : 'Users'}`);
    setTab(newValue);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    console.log(`[FraudManagement] Changing to page ${value}`);
    setPage(value);
  };

  const handleOpenDialog = (report: Report) => {
    console.log(`[FraudManagement] Opening report review dialog for ID: ${report._id}`);
    console.log(`[FraudManagement] Report details: ${report.entityType} - ${report.reason}`);
    setSelectedReport(report);
    setReportStatus(report.status);
    setAdminNotes(report.adminNotes || '');
    setActionTaken(report.actionTaken || 'none');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    console.log('[FraudManagement] Closing report review dialog');
    setOpenDialog(false);
    setSelectedReport(null);
  };

  const handleReviewSubmit = async () => {
    if (!selectedReport) return;

    try {
      console.log(`[FraudManagement] Submitting report review for ID: ${selectedReport._id}`);
      console.log(`[FraudManagement] Status: ${reportStatus}, Action: ${actionTaken}`);
      
      setLoading(true);
      
      await reportService.updateReport(selectedReport._id, {
        status: reportStatus,
        adminNotes,
        actionTaken
      });
      
      console.log(`[FraudManagement] Report updated successfully`);
      
      // Refresh reports
      await fetchReports();
      
      // Refresh stats
      console.log('[FraudManagement] Refreshing statistics after update');
      const statsResponse = await axios.get('/api/reports/statistics/summary');
      setStats(statsResponse.data);
      
      setSuccess('Report updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      handleCloseDialog();
      setLoading(false);
    } catch (err: any) {
      console.error('[FraudManagement] Error updating report:', err);
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1.5) }}>
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Card sx={{ height: '100%' }}>
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
            </Box>
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Job Reports</Typography>
                  <Typography variant="h3">{stats.byEntityType.job}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    {stats.total > 0 ? ((stats.byEntityType.job / stats.total) * 100).toFixed(1) : '0.0'}% of total
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>User Reports</Typography>
                  <Typography variant="h3">{stats.byEntityType.user}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                     {stats.total > 0 ? ((stats.byEntityType.user / stats.total) * 100).toFixed(1) : '0.0'}% of total
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ padding: theme => theme.spacing(1.5), width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Card sx={{ height: '100%' }}>
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
            </Box>
          </Box>
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: theme => theme.spacing(-1) }}>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
                  <Typography variant="subtitle1">Reported By:</Typography>
                  <Typography variant="body1">
                    {selectedReport.reporter.name} ({selectedReport.reporter.email})
                  </Typography>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
                  <Typography variant="subtitle1">Date Reported:</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedReport.createdAt), 'MMM d, yyyy h:mm a')}
                  </Typography>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
                  <Typography variant="subtitle1">Entity Type:</Typography>
                  <Typography variant="body1">{selectedReport.entityType}</Typography>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
                  <Typography variant="subtitle1">
                    {selectedReport.entityType === 'Job' ? 'Job Title:' : 'User:'}
                  </Typography>
                  <Typography variant="body1">
                    {selectedReport.entityType === 'Job' 
                      ? `${selectedReport.entityId.title} at ${selectedReport.entityId.company}`
                      : `${selectedReport.entityId.name} (${selectedReport.entityId.email})`
                    }
                  </Typography>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                  <Typography variant="subtitle1">Reason:</Typography>
                  <Typography variant="body1">{selectedReport.reason}</Typography>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                  <Typography variant="subtitle1">Details:</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedReport.details}
                  </Typography>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Admin Actions</Typography>
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
                  <FormControl fullWidth margin="normal" sx={{ m: 0 }}>
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
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: { xs: '100%', sm: '50%' } }}>
                  <FormControl fullWidth margin="normal" sx={{ m: 0 }}>
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
                </Box>
                <Box sx={{ padding: theme => theme.spacing(1), width: '100%' }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    margin="normal"
                    label="Admin Notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    sx={{ m: 0 }}
                  />
                </Box>
              </Box>
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