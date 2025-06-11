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
  Box,
  Button,
  Chip,
  Card,
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingActionsIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function Finances() {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  
  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    fetchFinanceSubmissions();
  }, []);

  const fetchFinanceSubmissions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(buildApiUrl('job-work-wages/all'));
      // Filter to only show approved and payment done invoices
      const financeRelevantSubmissions = response.data.filter(
        submission => submission.status === 'approved' || submission.status === 'payment_done'
      );
      setSubmissions(financeRelevantSubmissions);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  // Filter submissions based on status and search text
  const applyFilters = () => {
    let filtered = submissions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(submission => submission.status === statusFilter);
    }

    // Filter by search text (company name or invoice number)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(submission => 
        submission.companyName?.toLowerCase().includes(searchLower) ||
        submission.invoiceNumber?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSubmissions(filtered);
  };

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [submissions, statusFilter, searchText]);

  const getStatusChip = (status) => {
    let color, icon, label;
    
    switch (status) {
      case 'approved':
        color = 'warning';
        icon = <PendingActionsIcon />;
        label = 'Payment Pending';
        break;
      case 'payment_done':
        color = 'success';
        icon = <CheckCircleIcon />;
        label = 'Payment Done';
        break;
      default:
        color = 'default';
        icon = <PendingActionsIcon />;
        label = 'Unknown';
    }

    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        variant="contained"
        size="small"
        sx={{ fontWeight: 'bold' }}
      />
    );
  };

  const handlePaymentClick = (submission) => {
    setSelectedSubmission(submission);
    setPaymentDialogOpen(true);
  };

  const handlePaymentCancel = () => {
    setPaymentDialogOpen(false);
    setSelectedSubmission(null);
  };

  const handlePaymentConfirm = async () => {
    if (!selectedSubmission) return;

    setUpdatingPayment(true);
    try {
      await axios.put(buildApiUrl(`job-work-wages/${selectedSubmission.id}/payment-status`), {
        status: 'payment_done'
      });
      
      // Refresh the submissions list
      await fetchFinanceSubmissions();
      
      // Close dialog
      setPaymentDialogOpen(false);
      setSelectedSubmission(null);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('paymentStatusUpdated', {
        detail: {
          submissionId: selectedSubmission.id,
          invoiceNumber: selectedSubmission.invoiceNumber,
          newStatus: 'payment_done'
        }
      }));
      
      alert('Payment status updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
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
        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
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
            <AccountBalanceIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              Finance Management
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Manage payments for approved job work wages invoices
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filter Section */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <Box sx={{ p: 3, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#495057', mb: 2 }}>
            Filter Options
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Payment Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Invoices</MenuItem>
                  <MenuItem value="approved">Payment Pending</MenuItem>
                  <MenuItem value="payment_done">Payment Done</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search by Company or Invoice Number"
                variant="outlined"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="e.g., ABC Company, INV001..."
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Typography variant="body2" color="textSecondary">
                  Showing {filteredSubmissions.length} of {submissions.length} invoices
                </Typography>
              </Box>
            </Grid>
          </Grid>
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
                <ReceiptIcon />
              </Avatar>
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                Finance Invoices ({filteredSubmissions.length})
              </Typography>
            </Box>
          </Box>
        </Box>

        {filteredSubmissions.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <AccountBalanceIcon sx={{ fontSize: 64, color: '#9e9e9e', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              {submissions.length === 0 ? 'No approved invoices available' : 'No invoices match your filter criteria'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {submissions.length === 0 ? 'Approved invoices will appear here for payment processing' : 'Try adjusting your filters'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Invoice Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Warp Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Total Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Approved Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Payment Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSubmissions.map((submission) => (
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
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessIcon sx={{ color: '#FF9800', mr: 1, fontSize: 18 }} />
                        {submission.companyName}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {submission.warpNumber}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '1.1rem' }}>
                      {formatCurrency(submission.totalWages)}
                      {submission.valuesUpdatedDuringApproval && (
                        <Tooltip title="Values were edited during approval">
                          <EditIcon sx={{ color: '#ff9800', ml: 1, fontSize: 16 }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(submission.approvedAt || submission.submittedAt)}
                    </TableCell>
                    <TableCell>
                      {getStatusChip(submission.status)}
                    </TableCell>
                    <TableCell>
                      {submission.status === 'approved' && (
                        <Tooltip title="Mark Payment as Done">
                          <IconButton
                            color="success"
                            onClick={() => handlePaymentClick(submission)}
                            size="small"
                            sx={{
                              bgcolor: '#4caf50',
                              color: 'white',
                              '&:hover': { bgcolor: '#45a049' }
                            }}
                          >
                            <PaymentIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {submission.status === 'payment_done' && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Paid"
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentDialogOpen} onClose={handlePaymentCancel} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          Confirm Payment
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to mark this invoice as paid?
          </Typography>
          {selectedSubmission && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2"><strong>Invoice Number:</strong> {selectedSubmission.invoiceNumber}</Typography>
              <Typography variant="body2"><strong>Company:</strong> {selectedSubmission.companyName}</Typography>
              <Typography variant="body2"><strong>Warp Number:</strong> {selectedSubmission.warpNumber}</Typography>
              <Typography variant="body2"><strong>Total Amount:</strong> {formatCurrency(selectedSubmission.totalWages)}</Typography>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> This action will change the status from "Payment Pending" to "Payment Done". This action can be reversed if needed.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePaymentCancel} disabled={updatingPayment}>
            Cancel
          </Button>
          <Button 
            onClick={handlePaymentConfirm}
            variant="contained"
            color="success"
            disabled={updatingPayment}
            startIcon={updatingPayment ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {updatingPayment ? 'Processing...' : 'Mark as Paid'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Finances; 