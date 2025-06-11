import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  Calculate as CalculateIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  DateRange as DateRangeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  AccountCircle as InspectorIcon,
  LocalShipping as FabricIcon,
  Send as SendIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function JobWorkWages() {
  const [warpNumber, setWarpNumber] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rate, setRate] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleFetchDetails = async () => {
    if (!warpNumber) {
      setError('Please enter a warp number.');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const url = buildApiUrl(`warps/wages-details/${warpNumber}`);
      const response = await axios.get(url);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while fetching details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!rate || rate <= 0) {
      setError('Please enter a valid rate per meter');
      return;
    }

    setSubmitting(true);
    try {
      const submissionData = {
        warpNumber: data.warp.warpOrderNumber,
        warpId: data.warp.id,
        companyName: data.loom?.companyName,
        loomName: data.loom?.loomName,
        orderNumber: data.order?.orderNumber,
        designName: data.order?.designName,
        warpQuantity: data.warp.quantity,
        totalOriginalQuantity: totalOriginalQty,
        totalInspectedQuantity: totalInspectedQty,
        totalMistakeQuantity: totalMistakeQty,
        totalActualQuantity: totalActualQty,
        ratePerMeter: rate,
        totalWages: totalAmount,
        fabricCuts: data.fabricCuts,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };

      const response = await axios.post(buildApiUrl('job-work-wages/submit'), submissionData);
      alert(`Job work wages submitted for approval successfully! Invoice Number: ${response.data.invoiceNumber}`);
      
      // Reset form
      setWarpNumber('');
      setData(null);
      setRate(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!rate || rate <= 0) {
      setError('Please enter a valid rate per meter before printing');
      return;
    }

    const printWindow = window.open('', '_blank');
    const printContent = generateInvoiceHTML();
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const generateInvoiceHTML = () => {
    const currentDate = new Date().toLocaleDateString();
    // This shows "PREVIEW" because the actual invoice number is only generated when you submit for approval
    // The real sequential invoice number (AT/W1/0001, AT/W1/0002, etc.) is created by the backend
    const tempInvoiceNumber = `AT/${data.warp.warpOrderNumber}/PREVIEW`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Job Work Wages Invoice - ${data.warp.warpOrderNumber}</title>
        <style>
          @page { 
            size: A4 landscape; 
            margin: 15mm; 
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
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 0;
            color: #000000;
            font-size: 11px;
            line-height: 1.3;
          }
          .container {
            max-width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #800020; 
            padding-bottom: 15px; 
            margin-bottom: 20px;
            position: relative;
          }
          .header-left {
            flex: 0 0 auto;
          }
          .header-center {
            flex: 1;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .header-right {
            flex: 0 0 auto;
            text-align: right;
          }
          .logo {
            width: 120px;
            height: auto;
            display: block;
          }

          .invoice-title { 
            font-size: 24px; 
            font-weight: bold;
            color: #000000; 
            margin: 0;
          }
          .invoice-number {
            font-size: 16px;
            font-weight: bold;
            color: #800020;
            border: 2px solid #800020;
            padding: 8px 12px;
            border-radius: 5px;
            background-color: #f8f8f8;
          }
          .content {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .invoice-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 15px; 
            gap: 20px;
          }
          .info-section { 
            flex: 1; 
            background-color: #f8f8f8;
            padding: 10px;
            border-radius: 5px;
            border-left: 4px solid #800020;
          }
          .info-section h3 { 
            color: #800020; 
            border-bottom: 1px solid #800020; 
            padding-bottom: 3px; 
            margin: 0 0 8px 0;
            font-size: 14px;
          }
          .info-section p {
            margin: 3px 0;
            font-size: 11px;
          }
          .table-container {
            flex: 1;
            margin: 5px 0;
          }
          .table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 10px;
          }
          .table th, .table td { 
            border: 1px solid #000000; 
            padding: 6px 4px; 
            text-align: center; 
          }
          .table th { 
            background-color: #800020; 
            font-weight: bold; 
            color: #ffffff; 
          }
          .table tr:nth-child(even) { 
            background-color: #f9f9f9; 
          }
          .table tr:nth-child(odd) { 
            background-color: #ffffff; 
          }
          .summary-section {
            margin-top: 5px;
          }
          .summary-title {
            color: #800020;
            margin: 5px 0 10px 0;
            font-size: 16px;
            font-weight: bold;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 8px;
          }
          .summary-card {
            background-color: #f8f9fa;
            border: 2px solid #800020;
            border-radius: 8px;
            padding: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .summary-card h4 {
            color: #800020;
            margin: 0 0 8px 0;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .summary-card .value {
            font-size: 16px;
            font-weight: bold;
            color: #000000;
            margin: 0;
          }
          .wage-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 8px;
          }
          .wage-card {
            background-color: #800020;
            color: #ffffff;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          .wage-card h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .wage-card .value {
            font-size: 22px;
            font-weight: bold;
            margin: 0;
          }

          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <img src="${window.location.origin}/at-logo.png" alt="AT Logo" class="logo" />
            </div>
            <div class="header-center">
              <div class="invoice-title">JOB WORK WAGES INVOICE</div>
            </div>
            <div class="header-right">
              <div class="invoice-number">Invoice: ${tempInvoiceNumber}</div>
            </div>
          </div>

          <div class="content">
            <div class="invoice-info">
              <div class="info-section">
                <h3>Warp Details</h3>
                <p><strong>Warp Number:</strong> ${data.warp.warpOrderNumber}</p>
                <p><strong>Company:</strong> ${data.loom?.companyName || 'N/A'}</p>
                <p><strong>Loom:</strong> ${data.loom?.loomName || 'N/A'}</p>
                <p><strong>Order Number:</strong> ${data.order?.orderNumber || 'N/A'}</p>
                <p><strong>Design:</strong> ${data.order?.designName || 'N/A'}</p>
              </div>
              <div class="info-section">
                <h3>Invoice Details</h3>
                <p><strong>Date:</strong> ${currentDate}</p>
                <p><strong>Warp Quantity:</strong> ${data.warp.quantity}m</p>
                <p><strong>Rate per Meter:</strong> ₹${rate.toFixed(2)}</p>
                <p><strong>Status:</strong> Pending Approval</p>
              </div>
            </div>

            <div class="table-container">
              <h3 style="color: #800020; margin: 5px 0; font-size: 14px;">Fabric Cuts Details</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th style="width: 12%;">Fabric #</th>
                    <th style="width: 15%;">Original Qty (m)</th>
                    <th style="width: 15%;">Inspected Qty (m)</th>
                    <th style="width: 15%;">Mistake Qty (m)</th>
                    <th style="width: 15%;">Actual Qty (m)</th>
                    <th style="width: 28%;">Inspectors</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.fabricCuts.map(cut => `
                    <tr>
                      <td class="bold">${cut.fabricNumber}</td>
                      <td>${cut.quantity || 0}</td>
                      <td>${cut.inspectedQuantity || 0}</td>
                      <td style="color: #800020;">${cut.mistakeQuantity || 0}</td>
                      <td class="bold">${cut.actualQuantity || 0}</td>
                      <td style="font-size: 9px;">${cut.inspectors && cut.inspectors.length > 0 
                          ? cut.inspectors.join(', ')
                          : [cut.inspector1, cut.inspector2].filter(Boolean).join(', ') || 'N/A'
                        }</td>
                    </tr>
                  `).join('')}
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
                  <p class="value">₹${rate.toFixed(2)}</p>
                </div>
                <div class="wage-card">
                  <h4>Total Wages</h4>
                  <p class="value">₹${totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };



  const totalOriginalQty = data?.fabricCuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0) || 0;
  const totalInspectedQty = data?.fabricCuts.reduce((sum, cut) => sum + (cut.inspectedQuantity || 0), 0) || 0;
  const totalMistakeQty = data?.fabricCuts.reduce((sum, cut) => sum + (cut.mistakeQuantity || 0), 0) || 0;
  const totalActualQty = data?.fabricCuts.reduce((sum, cut) => sum + (cut.actualQuantity || 0), 0) || 0;
  const totalAmount = totalActualQty * rate;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    if (dateString._seconds) {
      return new Date(dateString._seconds * 1000).toLocaleDateString();
    }
    const date = new Date(dateString);
    if (isNaN(date)) {
        return "Invalid Date";
    }
    return date.toLocaleDateString();
  };

  const getWarpStatus = (warp) => {
    if (!warp) return 'Status N/A';
    
    const { status, startDate, endDate, completionDate } = warp;

    if (!startDate || !endDate) return <Chip label={status || 'Status N/A'} color="default" />;
    
    if (status === 'stopped') {
        return <Chip label="Stopped" color="warning" />;
    }

    if (status !== 'complete') {
        return <Chip label={status || 'Active'} color="info" />;
    }
    
    const expectedEnd = new Date(endDate._seconds ? endDate._seconds * 1000 : endDate);
    const actualEnd = completionDate ? new Date(completionDate._seconds ? completionDate._seconds * 1000 : completionDate) : new Date();

    if (actualEnd <= expectedEnd) {
      return <Chip label="On Time" color="success" />;
    } else {
      return <Chip label="Late" color="error" />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Header Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
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
            <CalculateIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              Job Work Wages
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Calculate wages for completed warp production
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Search Section */}
      <Card sx={{ 
        mb: 4, 
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 3
        }}>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold', mb: 2 }}>
            Search Warp Details
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Enter Warp Number"
              variant="outlined"
              value={warpNumber}
              onChange={(e) => setWarpNumber(e.target.value)}
              sx={{ 
                flex: 1,
                minWidth: 250,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  borderRadius: 2
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              placeholder="e.g., W1, W2, W3..."
            />
            <Button 
              variant="contained" 
              onClick={handleFetchDetails} 
              disabled={loading}
              size="large"
              sx={{ 
                bgcolor: '#4CAF50',
                '&:hover': { bgcolor: '#45a049' },
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontWeight: 'bold',
                minWidth: 140
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Get Details'}
            </Button>
          </Box>
        </Box>
      </Card>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            '& .MuiAlert-icon': { fontSize: 24 }
          }}
          icon={<ErrorIcon />}
        >
          {error}
        </Alert>
      )}

      {data && (
        <Box>
          {/* Warp Details Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 3
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#2196F3', mr: 2 }}>
                      <AssignmentIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1565C0' }}>
                      Warp Information
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <BusinessIcon sx={{ color: '#FF9800', mr: 2 }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Loom</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {data.loom?.loomName || 'N/A'} ({data.loom?.companyName || 'N/A'})
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <AssignmentIcon sx={{ color: '#9C27B0', mr: 2 }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Order Number</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {data.order?.orderNumber || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <FabricIcon sx={{ color: '#4CAF50', mr: 2 }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Design</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {data.order?.designName || 'N/A'} ({data.order?.designNumber || 'N/A'})
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <CalculateIcon sx={{ color: '#FF5722', mr: 2 }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Warp Quantity</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {data.warp?.quantity}m
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(145deg, #f3e5f5 0%, #e1bee7 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 3
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#9C27B0', mr: 2 }}>
                      <ScheduleIcon />
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#7B1FA2' }}>
                      Timeline & Status
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <DateRangeIcon sx={{ color: '#2196F3', mr: 2 }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Start Date</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {formatDate(data.warp?.startDate)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <DateRangeIcon sx={{ color: '#FF9800', mr: 2 }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">End Date</Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {formatDate(data.warp?.endDate)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <CheckCircleIcon sx={{ color: '#4CAF50', mr: 2 }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Status</Typography>
                          <Box sx={{ mt: 1 }}>
                            {getWarpStatus(data.warp)}
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Fabric Cuts Table */}
          <Card sx={{ 
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            borderRadius: 3,
            overflow: 'hidden',
            mb: 4
          }}>
            <Box sx={{ 
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
              p: 3
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <FabricIcon />
                </Avatar>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Fabric Cuts Inspection Details
                </Typography>
              </Box>
            </Box>
            <TableContainer>
              <Table sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Fabric #
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Original Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Inspected Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Mistake Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Actual Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Mistakes
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Inspectors
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      Loom-in Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c3e50' }}>
                      4PT Date
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.fabricCuts.map((cut) => (
                    <TableRow 
                      key={cut.id}
                      sx={{ 
                        '&:hover': { backgroundColor: '#f8f9fa' },
                        '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {cut.fabricNumber}
                      </TableCell>
                      <TableCell sx={{ fontWeight: '600', color: '#666' }}>
                        {cut.quantity || 0}m
                      </TableCell>
                      <TableCell sx={{ fontWeight: '600', color: '#2e7d32' }}>
                        {cut.inspectedQuantity || 0}m
                      </TableCell>
                      <TableCell sx={{ fontWeight: '600', color: '#d32f2f' }}>
                        {cut.mistakeQuantity || 0}m
                      </TableCell>
                      <TableCell sx={{ fontWeight: '600', color: '#1976d2' }}>
                        {cut.actualQuantity || 0}m
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {cut.mistakes?.map(m => (
                            <Chip 
                              key={m} 
                              label={m} 
                              size="small" 
                              sx={{ 
                                backgroundColor: '#ffebee',
                                color: '#c62828',
                                fontWeight: '500',
                                fontSize: '0.75rem'
                              }} 
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <InspectorIcon sx={{ color: '#9C27B0', mr: 1, fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: '500' }}>
                            {cut.inspectors && cut.inspectors.length > 0 
                              ? cut.inspectors.join(', ')
                              : [cut.inspector1, cut.inspector2].filter(Boolean).join(', ') || 'N/A'
                            }
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(cut.loomInDate)}</TableCell>
                      <TableCell>{formatDate(cut.inspectionDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Summary Section */}
          <Card sx={{ 
            background: 'linear-gradient(145deg, #e8f5e8 0%, #d4edda 100%)',
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.2)',
            borderRadius: 3,
            border: '1px solid #c3e6cb'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#4CAF50', mr: 2, width: 48, height: 48 }}>
                  <CalculateIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                  Production Summary
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, bgcolor: '#4CAF50', height: 2 }} />
              
              {/* Summary Stats */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: 3, 
                    bgcolor: 'white', 
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Total Original
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#666' }}>
                      {totalOriginalQty.toFixed(2)}m
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: 3, 
                    bgcolor: 'white', 
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Total Inspected
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                      {totalInspectedQty.toFixed(2)}m
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: 3, 
                    bgcolor: 'white', 
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Total Mistakes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                      {totalMistakeQty.toFixed(2)}m
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: 3, 
                    bgcolor: 'white', 
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Total Actual
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {totalActualQty.toFixed(2)}m
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Wage Calculation Section */}
              <Card sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
                    Wage Calculation
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 3
                  }}>
                    <TextField
                      label="Rate per Meter"
                      type="number"
                      variant="outlined"
                      value={rate}
                      onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                      sx={{ 
                        width: '200px',
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          borderRadius: 2
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            ₹
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Box sx={{ 
                      textAlign: 'center',
                      p: 3,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      borderRadius: 2,
                      minWidth: 250
                    }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        Total Wages
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                        ₹{totalAmount.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Action Buttons */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: 2, 
                    mt: 3,
                    flexWrap: 'wrap'
                  }}>
                    <Button
                      variant="contained"
                      onClick={handlePrint}
                      disabled={!rate || rate <= 0}
                      startIcon={<PrintIcon />}
                      sx={{
                        bgcolor: '#FF9800',
                        '&:hover': { bgcolor: '#F57C00' },
                        px: 3,
                        py: 1.5,
                        fontWeight: 'bold',
                        minWidth: 140
                      }}
                    >
                      Print Invoice
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSubmitForApproval}
                      disabled={!rate || rate <= 0 || submitting}
                      startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                      sx={{
                        bgcolor: '#4CAF50',
                        '&:hover': { bgcolor: '#45a049' },
                        px: 3,
                        py: 1.5,
                        fontWeight: 'bold',
                        minWidth: 180
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Send for Approval'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
                         </CardContent>
           </Card>
        </Box>
      )}
    </Container>
  );
}

export default JobWorkWages; 