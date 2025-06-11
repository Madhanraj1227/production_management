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
  Card,
  CardContent,
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
  Receipt as ReceiptIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function InvoiceApprovalStatus() {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [warpNumberSearch, setWarpNumberSearch] = useState('');
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAllSubmissions();
  }, []);

  // Listen for payment status updates from Finances component
  useEffect(() => {
    const handlePaymentUpdate = () => {
      fetchAllSubmissions();
    };

    window.addEventListener('paymentStatusUpdated', handlePaymentUpdate);
    return () => {
      window.removeEventListener('paymentStatusUpdated', handlePaymentUpdate);
    };
  }, []);

  const fetchAllSubmissions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(buildApiUrl('job-work-wages/all'));
      setSubmissions(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  // Filter submissions based on status and warp number
  const applyFilters = () => {
    let filtered = submissions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(submission => submission.status === statusFilter);
    }

    // Filter by warp number
    if (warpNumberSearch.trim()) {
      filtered = filtered.filter(submission => 
        submission.warpNumber?.toLowerCase().includes(warpNumberSearch.toLowerCase())
      );
    }

    setFilteredSubmissions(filtered);
  };

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [submissions, statusFilter, warpNumberSearch]);

  const getStatusChip = (status, hasEdits = false) => {
    let color, icon, label;
    
    switch (status) {
      case 'pending':
        color = 'warning';
        icon = <HourglassEmptyIcon />;
        label = 'Awaiting Approval';
        break;
      case 'approved':
        color = 'success';
        icon = <CheckCircleIcon />;
        label = 'Approved';
        break;
      case 'rejected':
        color = 'error';
        icon = <CancelIcon />;
        label = 'Rejected';
        break;
      case 'payment_done':
        color = 'info';
        icon = <PaymentIcon />;
        label = 'Payment Done';
        break;
      default:
        color = 'default';
        icon = <HourglassEmptyIcon />;
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

  const handlePrintInvoice = async (submission) => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      
      // Generate the invoice HTML (reuse from JobWorkWages component)
      const invoiceHTML = generateInvoiceHTML(submission);
      
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (err) {
      console.error('Error printing invoice:', err);
      alert('Failed to print invoice');
    }
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
      await fetchAllSubmissions();
      
      // Close dialog
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);

      // Dispatch custom event to notify other components
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

  const generateInvoiceHTML = (submission) => {
    const totalOriginalQty = submission.fabricCuts?.reduce((sum, cut) => sum + (cut.quantity || 0), 0) || 0;
    const totalInspectedQty = submission.totalInspectedQuantity || 0;
    const totalMistakeQty = submission.totalMistakeQuantity || 0;
    const totalActualQty = submission.totalActualQuantity || 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Job Work Wages Invoice - ${submission.invoiceNumber}</title>
        <style>
          @page { 
            size: A4 landscape; 
            margin: 10mm; 
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .wage-card {
              background-color: #800020 !important;
              color: #ffffff !important;
            }
            .table th {
              background-color: #800020 !important;
              color: #ffffff !important;
            }
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #000000;
            font-size: 11px;
            line-height: 1.2;
          }
          .invoice-container { 
            max-width: 100%; 
            margin: 0 auto; 
            padding: 5px;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 8px; 
            border-bottom: 2px solid #800020; 
            padding-bottom: 8px;
            flex-shrink: 0;
          }
          .logo-company { 
            display: flex; 
            align-items: center; 
            gap: 10px;
          }
          .company-details {
            text-align: left;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #800020;
            margin: 0;
          }
          .company-address {
            font-size: 10px;
            color: #666;
            margin: 2px 0 0 0;
          }
          .title-section { 
            text-align: center; 
            flex-grow: 1;
          }
          .invoice-title { 
            font-size: 20px; 
            font-weight: bold; 
            color: #800020; 
            margin: 0;
          }
          .invoice-number-section { 
            text-align: right;
          }
          .invoice-number { 
            font-size: 16px; 
            font-weight: bold; 
            color: #800020;
          }
          .info-section { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 12px; 
            margin-bottom: 8px;
            flex-shrink: 0;
          }
          .info-card { 
            border: 1px solid #800020; 
            border-radius: 4px; 
            padding: 6px;
          }
          .info-title { 
            font-size: 12px; 
            font-weight: bold; 
            color: #800020; 
            margin-bottom: 4px; 
            border-bottom: 1px solid #800020; 
            padding-bottom: 2px;
          }
          .info-card p {
            margin: 2px 0;
            font-size: 10px;
          }
          .table-container { 
            margin: 4px 0;
            flex-grow: 1;
            overflow: hidden;
          }
          .table { 
            width: 100%; 
            border-collapse: collapse; 
            border: 1px solid #800020;
            font-size: 9px;
          }
          .table th, .table td { 
            border: 1px solid #800020; 
            padding: 3px; 
            text-align: left; 
            font-size: 9px;
          }
          .table th { 
            background-color: #800020; 
            color: #ffffff; 
            font-weight: bold;
          }
          .summary-section {
            margin-top: 4px;
            flex-shrink: 0;
          }
          .summary-title { 
            font-size: 14px; 
            font-weight: bold; 
            color: #800020; 
            margin-bottom: 4px; 
            text-align: center;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-bottom: 4px;
          }
          .summary-card {
            background-color: #f8f9fa;
            border: 1px solid #800020;
            border-radius: 4px;
            padding: 4px;
            text-align: center;
          }
          .summary-card h4 { 
            font-size: 9px; 
            margin: 0 0 2px 0; 
            color: #800020;
          }
          .summary-card .value {
            font-size: 11px;
            font-weight: bold;
            color: #000000;
            margin: 0;
          }
          .wage-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-top: 4px;
          }
          .wage-card {
            background-color: #800020;
            color: #ffffff;
            border-radius: 4px;
            padding: 6px;
            text-align: center;
          }
          .wage-card h4 { 
            font-size: 10px; 
            margin: 0 0 2px 0;
          }
          .wage-card .amount { 
            font-size: 14px; 
            font-weight: bold; 
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="logo-company">
              <div class="company-details">
                <h2 class="company-name">ASHOK TEXTILES</h2>
                <p class="company-address">Quality Fabric Manufacturing</p>
              </div>
            </div>
            <div class="title-section">
              <h1 class="invoice-title">JOB WORK WAGES INVOICE</h1>
            </div>
            <div class="invoice-number-section">
              <div class="invoice-number">${submission.invoiceNumber || 'PREVIEW'}</div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-card">
              <div class="info-title">Warp Information</div>
              <p><strong>Warp Number:</strong> ${submission.warpNumber}</p>
              <p><strong>Company:</strong> ${submission.companyName}</p>
              <p><strong>Loom:</strong> ${submission.loomName}</p>
              <p><strong>Order Number:</strong> ${submission.orderNumber}</p>
              <p><strong>Design:</strong> ${submission.designName}</p>
            </div>
            <div class="info-card">
              <div class="info-title">Production Details</div>
              <p><strong>Warp Quantity:</strong> ${submission.warpQuantity}m</p>
              <p><strong>Submission Date:</strong> ${new Date(submission.submittedAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${submission.status}</p>
              ${submission.valuesUpdatedDuringApproval ? '<p><strong>Note:</strong> Values edited during approval</p>' : ''}
            </div>
          </div>

          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Fabric Number</th>
                  <th>Original Qty (m)</th>
                  <th>Inspected Qty (m)</th>
                  <th>Mistake Qty (m)</th>
                  <th>Actual Qty (m)</th>
                  <th>Inspectors</th>
                </tr>
              </thead>
              <tbody>
                ${submission.fabricCuts?.map(cut => `
                  <tr>
                    <td>${cut.fabricNumber}</td>
                    <td>${cut.quantity || 0}</td>
                    <td>${cut.inspectedQuantity || 0}</td>
                    <td>${cut.mistakeQuantity || 0}</td>
                    <td>${cut.actualQuantity || 0}</td>
                    <td>${cut.inspectors && cut.inspectors.length > 0 
                      ? cut.inspectors.join(', ')
                      : [cut.inspector1, cut.inspector2].filter(Boolean).join(', ') || 'N/A'
                    }</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
          </div>

          <div class="summary-section">
            <h3 class="summary-title">Production Summary</h3>
            
            <div class="summary-cards">
              <div class="summary-card">
                <h4>Total Original</h4>
                <p class="value">${totalOriginalQty.toFixed(2)}m</p>
              </div>
              <div class="summary-card">
                <h4>Total Inspected</h4>
                <p class="value">${totalInspectedQty.toFixed(2)}m</p>
              </div>
              <div class="summary-card">
                <h4>Total Mistakes</h4>
                <p class="value">${totalMistakeQty.toFixed(2)}m</p>
              </div>
              <div class="summary-card">
                <h4>Total Actual</h4>
                <p class="value">${totalActualQty.toFixed(2)}m</p>
              </div>
            </div>
            
            <div class="wage-cards">
              <div class="wage-card">
                <h4>Rate per Meter</h4>
                <p class="amount">₹${parseFloat(submission.ratePerMeter || 0).toFixed(2)}</p>
              </div>
              <div class="wage-card">
                <h4>Total Wages</h4>
                <p class="amount">₹${parseFloat(submission.totalWages || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
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
            <ReceiptIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              Invoice Approval Status
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Track job work wages invoice submissions and approvals
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
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status Filter"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="pending">Awaiting Approval</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="payment_done">Payment Done</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search by Warp Number"
                variant="outlined"
                value={warpNumberSearch}
                onChange={(e) => setWarpNumberSearch(e.target.value)}
                placeholder="e.g., W1, W2..."
              />
            </Grid>
            <Grid item xs={12} md={4}>
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
                Invoice Submissions ({filteredSubmissions.length})
              </Typography>
            </Box>
          </Box>
        </Box>

        {filteredSubmissions.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <ReceiptIcon sx={{ fontSize: 64, color: '#9e9e9e', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              {submissions.length === 0 ? 'No invoices submitted yet' : 'No invoices match your filter criteria'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {submissions.length === 0 ? 'Invoice submissions will appear here' : 'Try adjusting your filters'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 1400 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Invoice Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Warp Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Total Actual (m)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Rate per Meter</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Total Wages</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Submitted Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>Status</TableCell>
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
                    <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {submission.warpNumber}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BusinessIcon sx={{ color: '#FF9800', mr: 1, fontSize: 18 }} />
                        {submission.companyName}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', color: '#1976d2' }}>
                      {submission.totalActualQuantity?.toFixed(2)}
                      {submission.valuesUpdatedDuringApproval && (
                        <Tooltip title="Values were edited during approval">
                          <EditIcon sx={{ color: '#ff9800', ml: 1, fontSize: 16 }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', color: '#9C27B0' }}>
                      {formatCurrency(submission.ratePerMeter)}
                      {submission.valuesUpdatedDuringApproval && (
                        <Tooltip title="Values were edited during approval">
                          <EditIcon sx={{ color: '#ff9800', ml: 1, fontSize: 16 }} />
                        </Tooltip>
                      )}
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
                      {formatDate(submission.submittedAt)}
                    </TableCell>
                    <TableCell>
                      {getStatusChip(submission.status, submission.valuesUpdatedDuringApproval)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Print Invoice">
                          <IconButton
                            color="primary"
                            onClick={() => handlePrintInvoice(submission)}
                            size="small"
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                        {/* Delete button - only available for pending and rejected invoices */}
                        {(submission.status === 'pending' || submission.status === 'rejected') && (
                          <Tooltip title="Delete Invoice">
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteClick(submission)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
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
              <strong>Note:</strong> Deleting this invoice will re-enable fabric cut editing for this warp. This action cannot be undone.
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

export default InvoiceApprovalStatus; 