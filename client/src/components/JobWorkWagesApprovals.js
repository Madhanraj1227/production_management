import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Avatar,
  Grid,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Approval as ApprovalIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Calculate as CalculateIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Payment as PaymentIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function JobWorkWagesApprovals() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Status filter state
  const [statusFilter, setStatusFilter] = useState('pending');
  
  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({
    totalInspectedQuantity: 0,
    totalMistakeQuantity: 0,
    totalActualQuantity: 0,
    ratePerMeter: 0,
    totalWages: 0
  });

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  // Listen for payment status updates from Finances component
  useEffect(() => {
    const handlePaymentUpdate = (event) => {
      console.log('JobWorkWagesApprovals: Payment status updated, refreshing data...', event.detail);
      fetchSubmissions();
    };

    window.addEventListener('paymentStatusUpdated', handlePaymentUpdate);
    return () => {
      window.removeEventListener('paymentStatusUpdated', handlePaymentUpdate);
    };
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      let url;
      if (statusFilter === 'all') {
        url = 'job-work-wages/all';
      } else {
        url = statusFilter === 'pending' ? 'job-work-wages/pending' : 'job-work-wages/all';
      }
      
      const response = await axios.get(buildApiUrl(url));
      let data = response.data;
      
      // Filter by status if not 'pending' or 'all'
      if (statusFilter !== 'pending' && statusFilter !== 'all') {
        data = data.filter(submission => submission.status === statusFilter);
      }
      
      console.log('🔄 JobWorkWagesApprovals: Fetched submissions:', data.map(s => ({ id: s.id, status: s.status, invoice: s.invoiceNumber })));
      console.log('🔄 Current statusFilter:', statusFilter);
      data.forEach(sub => {
        console.log(`🔍 API DATA - ID ${sub.id?.substring(0, 8)}: Invoice="${sub.invoiceNumber}" Status="${sub.status}" | Delete Should Show: ${(sub.status === 'pending' || sub.status === 'rejected') ? 'YES' : 'NO'}`);
      });
      setSubmissions(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (submission) => {
    setSelectedSubmission(submission);
    setEditMode(false);
    setEditValues({
      totalInspectedQuantity: submission.totalInspectedQuantity || 0,
      totalMistakeQuantity: submission.totalMistakeQuantity || 0,
      totalActualQuantity: submission.totalActualQuantity || 0,
      ratePerMeter: submission.ratePerMeter || 0,
      totalWages: submission.totalWages || 0
    });
    setDetailsOpen(true);
  };

  const handleApprovalAction = (submission, action) => {
    setSelectedSubmission(submission);
    setActionType(action);
    setRemarks('');
    // Initialize editValues with current submission values for approval
    setEditValues({
      totalInspectedQuantity: submission.totalInspectedQuantity || 0,
      totalMistakeQuantity: submission.totalMistakeQuantity || 0,
      totalActualQuantity: submission.totalActualQuantity || 0,
      ratePerMeter: submission.ratePerMeter || 0,
      totalWages: submission.totalWages || 0
    });
    setApprovalDialogOpen(true);
  };

  const handleDeleteClick = (submission) => {
    setSubmissionToDelete(submission);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSubmissionToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!submissionToDelete) return;

    setDeleting(true);
    try {
      await axios.delete(buildApiUrl(`job-work-wages/${submissionToDelete.id}`));
      
      // Refresh the submissions list
      fetchSubmissions();
      
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('invoiceDeleted', {
        detail: {
          warpId: submissionToDelete.warpId,
          warpNumber: submissionToDelete.warpNumber,
          invoiceNumber: submissionToDelete.invoiceNumber
        }
      }));
      
      alert('Invoice deleted successfully! Fabric cut editing has been re-enabled for this warp.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditModeToggle = () => {
    if (editMode) {
      // Reset to original values when canceling edit
      setEditValues({
        totalInspectedQuantity: selectedSubmission.totalInspectedQuantity || 0,
        totalMistakeQuantity: selectedSubmission.totalMistakeQuantity || 0,
        totalActualQuantity: selectedSubmission.totalActualQuantity || 0,
        ratePerMeter: selectedSubmission.ratePerMeter || 0,
        totalWages: selectedSubmission.totalWages || 0
      });
    }
    setEditMode(!editMode);
  };

  const handleEditValueChange = (field, value) => {
    const newValues = {
      ...editValues,
      [field]: parseFloat(value) || 0
    };

    // Auto-calculate total wages when any value changes
    if (field === 'totalActualQuantity' || field === 'ratePerMeter') {
      newValues.totalWages = newValues.totalActualQuantity * newValues.ratePerMeter;
    }

    // If total actual quantity is being calculated from inspected - mistakes
    if (field === 'totalInspectedQuantity' || field === 'totalMistakeQuantity') {
      newValues.totalActualQuantity = Math.max(0, newValues.totalInspectedQuantity - newValues.totalMistakeQuantity);
      newValues.totalWages = newValues.totalActualQuantity * newValues.ratePerMeter;
    }

    setEditValues(newValues);
  };

  const handleSaveChanges = () => {
    // Update the selected submission with new values
    const updatedSubmission = {
      ...selectedSubmission,
      ...editValues,
// Values updated by user
    };
    setSelectedSubmission(updatedSubmission);
    
    // Update in submissions array
    setSubmissions(prev => prev.map(sub => 
      sub.id === selectedSubmission.id ? updatedSubmission : sub
    ));
    
    setEditMode(false);
    alert('Changes saved! Values will be used for approval.');
  };

  const handleApprovalSubmit = async () => {
    if (!selectedSubmission || !actionType) return;

    setProcessing(true);
    try {
      const requestData = {
        action: actionType,
        remarks: remarks
      };

      // Always include the current values
      requestData.updatedValues = {
        totalInspectedQuantity: editValues.totalInspectedQuantity,
        totalMistakeQuantity: editValues.totalMistakeQuantity,
        totalActualQuantity: editValues.totalActualQuantity,
        ratePerMeter: editValues.ratePerMeter,
        totalWages: editValues.totalWages
      };

      await axios.patch(buildApiUrl(`job-work-wages/${selectedSubmission.id}/approve`), requestData);

      setApprovalDialogOpen(false);
      setRemarks('');
      
      // Emit event to notify other components about the approval
      if (actionType === 'approve') {
        window.dispatchEvent(new CustomEvent('jobWorkWagesApproved', {
          detail: { warpId: selectedSubmission.warpId }
        }));
      }
      
      fetchSubmissions(); // Refresh the list
      
      alert(`Job work wages ${actionType}d successfully!`);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${actionType} submission`);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Header Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #8B0000 0%, #B22222 100%)',
        borderRadius: 3,
        p: 4,
        mb: 4,
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ 
            bgcolor: 'rgba(255,255,255,0.2)', 
            mr: 2, 
            width: 56, 
            height: 56 
          }}>
            <ApprovalIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              Job Work Wages Approvals
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Review and approve job work wages submissions
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Status Filter Buttons */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <Box sx={{ p: 3, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#495057', mb: 2 }}>
            Filter by Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant={statusFilter === 'pending' ? 'contained' : 'outlined'}
              color="warning"
              onClick={() => setStatusFilter('pending')}
              sx={{ minWidth: 120 }}
            >
              Pending ({statusFilter === 'pending' ? submissions.length : '...'})
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => setStatusFilter('approved')}
              sx={{ minWidth: 120 }}
            >
              Approved ({statusFilter === 'approved' ? submissions.length : '...'})
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'contained' : 'outlined'}
              color="error"
              onClick={() => setStatusFilter('rejected')}
              sx={{ minWidth: 120 }}
            >
              Rejected ({statusFilter === 'rejected' ? submissions.length : '...'})
            </Button>
            <Button
              variant={statusFilter === 'payment_done' ? 'contained' : 'outlined'}
              color="info"
              onClick={() => setStatusFilter('payment_done')}
              sx={{ minWidth: 120 }}
            >
              Payment Done ({statusFilter === 'payment_done' ? submissions.length : '...'})
            </Button>
            <Button
              variant={statusFilter === 'all' ? 'contained' : 'outlined'}
              color="primary"
              onClick={() => setStatusFilter('all')}
              sx={{ minWidth: 120 }}
            >
              All ({statusFilter === 'all' ? submissions.length : '...'})
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Submissions Table */}
      <Card sx={{ 
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          p: 3
        }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                <AssignmentIcon />
              </Avatar>
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                {statusFilter === 'pending' ? 'Pending Approvals' : 
                 statusFilter === 'approved' ? 'Approved Invoices' :
                 statusFilter === 'rejected' ? 'Rejected Invoices' :
                 statusFilter === 'payment_done' ? 'Payment Done Invoices' : 
                 'All Invoice Submissions'} ({submissions.length})
              </Typography>
            </Box>
          </Box>
        </Box>

        {submissions.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#4CAF50', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              {statusFilter === 'pending' ? 'No pending approvals' :
               statusFilter === 'approved' ? 'No approved invoices' :
               statusFilter === 'rejected' ? 'No rejected invoices' :
               statusFilter === 'payment_done' ? 'No invoices with payment done' :
               'No invoice submissions found'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {statusFilter === 'pending' ? 'All job work wages have been reviewed' :
               statusFilter === 'approved' ? 'No invoices have been approved yet' :
               statusFilter === 'rejected' ? 'No invoices have been rejected yet' :
               statusFilter === 'payment_done' ? 'No invoices have been marked as paid yet' :
               'No invoice submissions available'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Invoice Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Warp Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Warp Qty (m)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Total Inspected (m)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Total Mistakes (m)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Total Actual (m)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Rate per Meter</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Total Wages</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Submitted Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((submission) => {
                  console.log(`🔄 RENDERING ROW: ID=${submission.id?.substring(0, 8)}, Status="${submission.status}", Delete=${(submission.status === 'pending' || submission.status === 'rejected')}`);
                  return (
                  <TableRow 
                    key={submission.id}
                    sx={{ 
                      '&:hover': { backgroundColor: '#f8f9fa' },
                      '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 'bold', color: '#800020', fontSize: '0.9rem' }}>
                      {submission.invoiceNumber}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {submission.warpNumber}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessIcon sx={{ color: '#FF9800', mr: 1, fontSize: 18 }} />
                        {submission.companyName}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', color: '#666' }}>
                      {submission.warpQuantity}
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', color: '#2e7d32' }}>
                      {submission.totalInspectedQuantity?.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', color: '#d32f2f' }}>
                      {submission.totalMistakeQuantity?.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', color: '#1976d2' }}>
                      {submission.totalActualQuantity?.toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', color: '#9C27B0' }}>
                      {formatCurrency(submission.ratePerMeter)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '1.1rem' }}>
                      {formatCurrency(submission.totalWages)}
                    </TableCell>
                    <TableCell>
                      {formatDate(submission.submittedAt)}
                    </TableCell>
                    <TableCell>
                      {submission.status === 'pending' && (
                        <Chip
                          icon={<AssignmentIcon />}
                          label="Awaiting Approval"
                          color="warning"
                          variant="contained"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                      {submission.status === 'approved' && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Approved"
                          color="success"
                          variant="contained"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                      {submission.status === 'rejected' && (
                        <Chip
                          icon={<CancelIcon />}
                          label="Rejected"
                          color="error"
                          variant="contained"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                      {submission.status === 'payment_done' && (
                        <Chip
                          icon={<PaymentIcon />}
                          label="Payment Done"
                          color="info"
                          variant="contained"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetails(submission)}
                          sx={{ minWidth: 90 }}
                        >
                          View
                        </Button>
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleApprovalAction(submission, 'approve')}
                              sx={{ minWidth: 100 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              startIcon={<CancelIcon />}
                              onClick={() => handleApprovalAction(submission, 'reject')}
                              sx={{ minWidth: 90 }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {/* Delete button - only available for pending and rejected invoices */}
                        {(submission.status === 'pending' || submission.status === 'rejected') && (
                          <Tooltip title={`Delete Invoice (Status: ${submission.status})`}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(submission)}
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* Enhanced Debug info */}
                        <Typography variant="caption" sx={{ ml: 1, fontSize: '0.7rem', color: 'gray', display: 'block' }}>
                          Status: {submission.status} | ID: {submission.id?.substring(0, 8)} | Delete Allowed: {(submission.status === 'pending' || submission.status === 'rejected') ? 'YES' : 'NO'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CalculateIcon sx={{ mr: 2, color: '#1976d2' }} />
            Job Work Wages Details - {selectedSubmission?.warpNumber}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSubmission && (
            <Box sx={{ mt: 2 }}>
              {/* Basic Info */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Warp Information
                      </Typography>
                      <Typography><strong>Invoice Number:</strong> <span style={{color: '#800020', fontWeight: 'bold'}}>{selectedSubmission.invoiceNumber}</span></Typography>
                      <Typography><strong>Warp Number:</strong> {selectedSubmission.warpNumber}</Typography>
                      <Typography><strong>Company:</strong> {selectedSubmission.companyName}</Typography>
                      <Typography><strong>Loom:</strong> {selectedSubmission.loomName}</Typography>
                      <Typography><strong>Order Number:</strong> {selectedSubmission.orderNumber}</Typography>
                      <Typography><strong>Design:</strong> {selectedSubmission.designName}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" color="primary">
                          Production Summary
                        </Typography>
                        <Button
                          size="small"
                          variant={editMode ? "outlined" : "contained"}
                          color={editMode ? "secondary" : "primary"}
                          startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                          onClick={handleEditModeToggle}
                        >
                          {editMode ? 'Cancel' : 'Edit'}
                        </Button>
                      </Box>

                      <Typography><strong>Warp Quantity:</strong> {selectedSubmission.warpQuantity}m</Typography>
                      
                      {editMode ? (
                        <Box sx={{ mt: 2, '& .MuiTextField-root': { mb: 2 } }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Total Inspected (m)"
                            type="number"
                            value={editValues.totalInspectedQuantity}
                            onChange={(e) => handleEditValueChange('totalInspectedQuantity', e.target.value)}
                            inputProps={{ step: "0.01", min: "0" }}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Total Mistakes (m)"
                            type="number"
                            value={editValues.totalMistakeQuantity}
                            onChange={(e) => handleEditValueChange('totalMistakeQuantity', e.target.value)}
                            inputProps={{ step: "0.01", min: "0" }}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Total Actual (m)"
                            type="number"
                            value={editValues.totalActualQuantity}
                            onChange={(e) => handleEditValueChange('totalActualQuantity', e.target.value)}
                            inputProps={{ step: "0.01", min: "0" }}
                            helperText="Auto-calculated from Inspected - Mistakes"
                          />
                          <Divider sx={{ my: 2 }} />
                          <TextField
                            fullWidth
                            size="small"
                            label="Rate per Meter (₹)"
                            type="number"
                            value={editValues.ratePerMeter}
                            onChange={(e) => handleEditValueChange('ratePerMeter', e.target.value)}
                            inputProps={{ step: "0.01", min: "0" }}
                          />
                          <Typography variant="h6" color="success.main" sx={{ mt: 2 }}>
                            <strong>Total Wages: {formatCurrency(editValues.totalWages)}</strong>
                          </Typography>
                          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              startIcon={<SaveIcon />}
                              onClick={handleSaveChanges}
                              fullWidth
                            >
                              Save Changes
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ mt: 1 }}>
                          <Typography><strong>Total Inspected:</strong> {editValues.totalInspectedQuantity?.toFixed(2)}m</Typography>
                          <Typography><strong>Total Mistakes:</strong> {editValues.totalMistakeQuantity?.toFixed(2)}m</Typography>
                          <Typography><strong>Total Actual:</strong> {editValues.totalActualQuantity?.toFixed(2)}m</Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography><strong>Rate per Meter:</strong> {formatCurrency(editValues.ratePerMeter)}</Typography>
                          <Typography variant="h6" color="success.main">
                            <strong>Total Wages: {formatCurrency(editValues.totalWages)}</strong>
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Fabric Cuts Details */}
              <Typography variant="h6" gutterBottom>
                Fabric Cuts Details
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Fabric #</strong></TableCell>
                      <TableCell><strong>Original Qty</strong></TableCell>
                      <TableCell><strong>Inspected Qty</strong></TableCell>
                      <TableCell><strong>Mistake Qty</strong></TableCell>
                      <TableCell><strong>Actual Qty</strong></TableCell>
                      <TableCell><strong>Inspectors</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSubmission.fabricCuts?.map((cut, index) => (
                      <TableRow key={index}>
                        <TableCell>{cut.fabricNumber}</TableCell>
                        <TableCell>{cut.quantity || 0}m</TableCell>
                        <TableCell>{cut.inspectedQuantity || 0}m</TableCell>
                        <TableCell>{cut.mistakeQuantity || 0}m</TableCell>
                        <TableCell>{cut.actualQuantity || 0}m</TableCell>
                        <TableCell>
                          {cut.inspectors && cut.inspectors.length > 0 
                            ? cut.inspectors.join(', ')
                            : [cut.inspector1, cut.inspector2].filter(Boolean).join(', ') || 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve Job Work Wages' : 'Reject Job Work Wages'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to {actionType} the job work wages for <strong>{selectedSubmission?.warpNumber}</strong>?
          </Typography>

          <Typography variant="body2" color="textSecondary" gutterBottom>
            Total Amount: <strong>{formatCurrency(selectedSubmission?.totalWages)}</strong>
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Remarks (Optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            sx={{ mt: 2 }}
            placeholder={`Add any remarks for this ${actionType}...`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprovalSubmit} 
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : (actionType === 'approve' ? <CheckCircleIcon /> : <CancelIcon />)}
          >
            {processing ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          Delete Invoice
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete this invoice?
          </Typography>
          {submissionToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2"><strong>Invoice Number:</strong> {submissionToDelete.invoiceNumber}</Typography>
              <Typography variant="body2"><strong>Warp Number:</strong> {submissionToDelete.warpNumber}</Typography>
              <Typography variant="body2"><strong>Company:</strong> {submissionToDelete.companyName}</Typography>
              <Typography variant="body2"><strong>Total Wages:</strong> {formatCurrency(submissionToDelete.totalWages)}</Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> This action cannot be undone. The invoice will be permanently deleted 
              and fabric cut editing will be re-enabled for this warp.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default JobWorkWagesApprovals; 