import React, { useState, useEffect, useCallback } from 'react';
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
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Alert,
  Chip,
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
  Grid,
  Divider,
  Fade,
  Zoom,
  Collapse,
  CardHeader
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
  LocalShipping as LocalShippingIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  CalendarToday as CalendarTodayIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  MoveToInbox as ReceiveIcon,
  Save as SaveIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import QRCode from 'qrcode';
import CreateProcessingCenter from './CreateProcessingCenter';
import ProcessingOrderForm from './ProcessingOrderForm';

function SendForProcessing() {
  const navigate = useNavigate();
  const [processingOrders, setProcessingOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [orderToView, setOrderToView] = useState(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [orderToReceive, setOrderToReceive] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Filter states
  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [processingCenterFilter, setProcessingCenterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Add new state for edit/delete delivery functionality
  const [editDeliveryDialogOpen, setEditDeliveryDialogOpen] = useState(false);
  const [deleteDeliveryDialogOpen, setDeleteDeliveryDialogOpen] = useState(false);
  const [deliveryToEdit, setDeliveryToEdit] = useState(null);
  const [deliveryToDelete, setDeliveryToDelete] = useState(null);
  const [orderToModify, setOrderToModify] = useState(null);

  useEffect(() => {
    fetchProcessingOrders();
  }, []);

  useEffect(() => {
    // Pre-process orders to group received cuts by delivery number
    const ordersWithGroupedCuts = processingOrders.map(order => {
      if (!order.receivedFabricCuts || !order.deliveryHistory) {
        return order;
      }

      const receivedFabricCutsByDelivery = order.receivedFabricCuts.reduce((acc, cut) => {
        const key = cut.deliveryNumber;
        if (key) {
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(cut);
        }
        return acc;
      }, {});

      return { ...order, receivedFabricCutsByDelivery };
    });
    setFilteredOrders(ordersWithGroupedCuts);

  }, [processingOrders]);

  const applyFiltersCallback = useCallback(() => {
    let filtered = processingOrders;

    // Filter by order number
    if (orderNumberFilter.trim()) {
      filtered = filtered.filter(order => 
        order.orderFormNumber?.toLowerCase().includes(orderNumberFilter.toLowerCase())
      );
    }

    // Filter by processing center
    if (processingCenterFilter && processingCenterFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.processingCenter === processingCenterFilter
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Pre-process for display
    const ordersWithGroupedCuts = filtered.map(order => {
      if (!order.receivedFabricCuts || !order.deliveryHistory) {
        return order;
      }
       const receivedFabricCutsByDelivery = order.receivedFabricCuts.reduce((acc, cut) => {
        const key = cut.deliveryNumber;
        if (key) {
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(cut);
        }
        return acc;
      }, {});

      return { ...order, receivedFabricCutsByDelivery };
    });

    setFilteredOrders(ordersWithGroupedCuts);
  }, [processingOrders, orderNumberFilter, processingCenterFilter, statusFilter]);

  useEffect(() => {
    applyFiltersCallback();
  }, [applyFiltersCallback]);

  const fetchProcessingOrders = async () => {
    try {
      setLoading(true);
      // Fetch from API
      const response = await axios.get(buildApiUrl('processing-orders'));
      const existingOrders = response.data;
      
      // Ensure each order has required fields if not present
      const ordersWithDefaults = existingOrders.map(order => ({
        ...order,
        createdAt: order.createdAt || new Date().toISOString(),
        status: order.status || 'sent'
      }));
      
      setProcessingOrders(ordersWithDefaults);
      setFilteredOrders(ordersWithDefaults);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch processing orders');
    } finally {
      setLoading(false);
    }
  };



  const getUniqueProcessingCenters = () => {
    const centers = [...new Set(processingOrders.map(order => order.processingCenter))];
    return centers.filter(Boolean);
  };

  const handleCreateNewOrder = () => {
    setShowCreateForm(true);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    fetchProcessingOrders(); // Refresh the list
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      'sent': { color: 'info', label: 'Sent for Processing' },
      'in_progress': { color: 'secondary', label: 'In Progress' },
      'partially_received': { color: 'warning', label: 'Partially Received' },
      'completed': { color: 'success', label: 'Completed' },
      'returned': { color: 'primary', label: 'Returned' }
    };

    const config = statusConfig[status] || { color: 'default', label: 'Unknown' };
    return (
      <Chip
        label={config.label}
        color={config.color}
        variant="contained"
        size="small"
        sx={{ fontWeight: 'bold' }}
      />
    );
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    try {
      let date;
      
      // Handle Firestore timestamp format
      if (dateInput && typeof dateInput === 'object' && dateInput._seconds) {
        date = new Date(dateInput._seconds * 1000);
      } 
      // Handle Firestore timestamp with toDate() method
      else if (dateInput && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
      }
      // Handle regular date string/object
      else {
        date = new Date(dateInput);
      }
      
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatProcesses = (processes) => {
    if (!processes || processes.length === 0) return 'N/A';
    return processes.map(process => process.charAt(0).toUpperCase() + process.slice(1)).join(', ');
  };

  const handlePrintOrder = (order) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Generate the processing order HTML
    const orderHTML = generateProcessingOrderHTML(order);
    
    printWindow.document.write(orderHTML);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  };



  const handleDeleteClick = (order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleViewDetails = (order) => {
    setOrderToView(order);
    setViewDetailsDialogOpen(true);
  };

  const handleViewDetailsClose = () => {
    setViewDetailsDialogOpen(false);
    setOrderToView(null);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    setDeleting(true);
    try {
      // Delete from API
      await axios.delete(buildApiUrl(`processing-orders/${orderToDelete.id}`));
      
      // Refresh the orders list
      await fetchProcessingOrders();
      
      // Close dialog
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      
      // Show success message
      console.log('Processing order deleted successfully');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete processing order');
    } finally {
      setDeleting(false);
    }
  };

  const generateProcessingOrderHTML = (order) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Processing Order Form - ${order.orderFormNumber}</title>
        <style>
          @page { 
            size: A4; 
            margin: 12mm; 
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .header {
              background-color: #800020 !important;
              color: #ffffff !important;
            }
            .table th {
              background-color: #800020 !important;
              color: #ffffff !important;
            }
            .info-title {
              color: #800020 !important;
              border-bottom-color: #800020 !important;
            }
            .summary-title {
              color: #800020 !important;
            }
            .summary-value {
              color: #800020 !important;
            }
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #000000;
            font-size: 12px;
            line-height: 1.4;
          }
          .container { 
            max-width: 100%; 
            margin: 0 auto; 
            padding: 8px;
          }
          .header { 
            background: linear-gradient(135deg, #800020 0%, #B22222 100%);
            color: white;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo {
            width: 60px;
            height: 60px;
            background-color: rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 4px;
          }
          .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 4px;
          }
          .company-info {
            text-align: left;
          }
          .company-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .company-tagline {
            font-size: 12px;
            opacity: 0.9;
          }
          .form-section {
            text-align: center;
            flex-grow: 1;
          }
          .form-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .order-number {
            font-size: 16px;
            font-weight: bold;
            background-color: rgba(255,255,255,0.2);
            padding: 6px 12px;
            border-radius: 4px;
            display: inline-block;
          }
          .qr-header {
            text-align: right;
          }
          .qr-code-header {
            width: 80px;
            height: 80px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            background-color: white;
            padding: 5px;
          }
          .info-section { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 15px;
          }
          .info-card { 
            border: 2px solid #800020; 
            border-radius: 8px; 
            padding: 12px;
            background-color: #fafafa;
          }
          .info-title { 
            font-size: 13px; 
            font-weight: bold; 
            color: #800020; 
            margin-bottom: 8px; 
            border-bottom: 2px solid #800020; 
            padding-bottom: 4px;
          }
          .info-card p {
            margin: 6px 0;
            font-size: 11px;
          }
          .table { 
            width: 100%; 
            border-collapse: collapse; 
            border: 2px solid #800020;
            margin: 15px 0;
            font-size: 10px;
          }
          .table th, .table td { 
            border: 1px solid #800020; 
            padding: 8px; 
            text-align: left; 
            font-size: 10px;
          }
          .table th { 
            background-color: #800020; 
            color: #ffffff; 
            font-weight: bold;
          }
          .table tbody tr:nth-child(even) {
            background-color: #f8f8f8;
          }
          .summary-section {
            margin-top: 15px;
            background: linear-gradient(135deg, #fef7f7 0%, #f8f0f0 100%);
            padding: 12px;
            border-radius: 8px;
            border: 2px solid #800020;
          }
          .summary-title { 
            font-size: 15px; 
            font-weight: bold; 
            color: #800020; 
            margin-bottom: 8px; 
            text-align: center;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          .summary-item {
            text-align: center;
            background-color: white;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #800020;
          }
          .summary-label {
            font-size: 9px;
            color: #666;
            margin-bottom: 4px;
          }
          .summary-value {
            font-size: 13px;
            font-weight: bold;
            color: #800020;
          }
          .qr-section {
            text-align: center;
            margin-top: 15px;
            padding: 12px;
            border: 2px solid #800020;
            border-radius: 8px;
            background: linear-gradient(135deg, #fef7f7 0%, #f8f0f0 100%);
            display: none;
          }
          .qr-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: #800020;
            font-size: 13px;
          }
          .qr-subtitle {
            font-size: 10px;
            margin-bottom: 8px;
            color: #666;
          }
          .qr-code-large {
            width: 120px;
            height: 120px;
            border: 2px solid #800020;
            border-radius: 4px;
            background-color: white;
            padding: 5px;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(128, 0, 32, 0.05);
            font-weight: bold;
            z-index: -1;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="watermark">ASHOK TEXTILES</div>
        <div class="container">
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                <img src="/AT-Logo.png" alt="Ashok Textiles Logo" />
              </div>
              <div class="company-info">
                <div class="company-name">ASHOK TEXTILES</div>
                <div class="company-tagline">Quality Fabric Manufacturing</div>
              </div>
            </div>
            <div class="form-section">
              <div class="form-title">PROCESSING ORDER FORM</div>
              <div class="order-number">${order.orderFormNumber}</div>
            </div>
            <div class="qr-header">
              ${order.qrCode && order.qrCode !== '' ? `<img src="${order.qrCode}" alt="Order QR Code" class="qr-code-header" style="object-fit: contain;"/>` : '<div style="width: 80px; height: 80px; border: 2px dashed rgba(255,255,255,0.5); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: rgba(255,255,255,0.7);">QR Code</div>'}
            </div>
          </div>

          <div class="info-section">
            <div class="info-card">
              <div class="info-title">📋 Processing Details</div>
              <p><strong>Processing Center:</strong> ${order.processingCenter}</p>
              <p><strong>Processes:</strong> ${formatProcesses(order.processes)}</p>
              <p><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
              <p><strong>Order Status:</strong> ${order.status === 'sent' ? 'Sent for Processing' : order.status}</p>
            </div>
            <div class="info-card">
              <div class="info-title">🚚 Delivery Information</div>
              <p><strong>Delivery Date:</strong> ${formatDate(order.deliveryDate)}</p>
              <p><strong>Vehicle Number:</strong> ${order.vehicleNumber}</p>
              <p><strong>Total Fabric Cuts:</strong> ${order.totalFabricCuts}</p>
              <p><strong>Total Quantity:</strong> ${order.totalQuantity?.toFixed(2)}m</p>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th style="width: 6%;">S.No</th>
                <th style="width: 20%;">Fabric Cut Number</th>
                <th style="width: 12%;">Warp Number</th>
                <th style="width: 14%;">Order Number</th>
                <th style="width: 12%;">Design Number</th>
                <th style="width: 20%;">Design Name</th>
                <th style="width: 10%;">Quantity (m)</th>
                <th style="width: 6%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${order.fabricCuts?.map((cut, index) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                  <td style="font-weight: bold; color: #800020;">${cut.fabricNumber}</td>
                  <td>${cut.warpNumber}</td>
                  <td style="color: #9C27B0;">${cut.orderNumber || 'N/A'}</td>
                  <td style="color: #FF9800;">${cut.designNumber || 'N/A'}</td>
                  <td style="color: #795548;">${cut.designName || 'N/A'}</td>
                  <td style="text-align: right; font-weight: bold;">${cut.inspectedQuantity?.toFixed(2) || '0.00'}</td>
                  <td style="text-align: center; color: #008000;">✓</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>

          <div class="summary-section">
            <div class="summary-title">📊 Order Summary</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Fabric Cuts</div>
                <div class="summary-value">${order.totalFabricCuts}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Quantity</div>
                <div class="summary-value">${order.totalQuantity?.toFixed(2)}m</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Processing Center</div>
                <div class="summary-value" style="font-size: 11px;">${order.processingCenter}</div>
              </div>
            </div>
          </div>

          <div class="qr-section">
            <div class="qr-title">📱 Order Tracking QR Code</div>
            <div class="qr-subtitle">Scan this QR code to track processing status and updates</div>
            ${order.qrCode && order.qrCode !== '' ? `<img src="${order.qrCode}" alt="QR Code" class="qr-code-large" style="object-fit: contain;"/>` : '<div style="width: 120px; height: 120px; border: 2px dashed #800020; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; color: #800020;">QR Code Unavailable</div>'}
            <div style="margin-top: 8px; font-size: 11px; font-weight: bold; color: #800020;">${order.orderFormNumber}</div>
            <div style="margin-top: 4px; font-size: 9px; color: #666;">Generated: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="footer">
            <p><strong>ASHOK TEXTILES</strong> - Quality Fabric Manufacturing Since 1985</p>
            <p>📧 info@ashoktextiles.com | 📞 +91-XXXXX-XXXXX | 🌐 www.ashoktextiles.com</p>
            <p>This is a computer-generated document. No signature required.</p>
            <p>Printed on: ${new Date().toLocaleString()} | Document ID: ${order.orderFormNumber}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleReceiveClick = (order) => {
    setOrderToReceive(order);
    setReceiveDialogOpen(true);
  };

  const handleReceiveDialogClose = () => {
    setReceiveDialogOpen(false);
    setOrderToReceive(null);
  };

  // Handler functions for edit/delete delivery functionality
  const handleEditDelivery = (order, delivery, cuts, deliveryIndex) => {
    setOrderToModify(order);
    setDeliveryToEdit({
      ...delivery,
      cuts: cuts,
      deliveryIndex: deliveryIndex
    });
    setEditDeliveryDialogOpen(true);
  };

  const handleDeleteDelivery = (order, delivery, cuts, deliveryIndex) => {
    setOrderToModify(order);
    setDeliveryToDelete({
      ...delivery,
      cuts: cuts,
      deliveryIndex: deliveryIndex
    });
    setDeleteDeliveryDialogOpen(true);
  };

  const handleEditDeliveryClose = () => {
    setEditDeliveryDialogOpen(false);
    setDeliveryToEdit(null);
    setOrderToModify(null);
  };

  const handleDeleteDeliveryClose = () => {
    setDeleteDeliveryDialogOpen(false);
    setDeliveryToDelete(null);
    setOrderToModify(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (formVisible) return <CreateProcessingCenter onClose={() => { setFormVisible(false); }} />;
  if (showCreateForm) return <ProcessingOrderForm onClose={handleFormClose} />;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Modern Header Section */}
      <Fade in timeout={800}>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="white" fill-opacity="0.05"%3E%3Cpath d="m0 40l40-40h-40v40zm0 0h40v-40l-40 40z"/%3E%3C/g%3E%3C/svg%3E")',
          }
        }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Zoom in timeout={1000}>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(255,255,255,0.15)', 
                    mr: 3, 
                    width: 64, 
                    height: 64,
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}>
                    <SendIcon sx={{ fontSize: 36 }} />
                  </Avatar>
                </Zoom>
                <Box>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 800, 
                    mb: 1,
                    background: 'linear-gradient(45deg, #ffffff, #f0f0f0)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Processing Orders
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 300 }}>
                    Manage fabric processing workflow with style
                  </Typography>
                </Box>
              </Box>
              <Zoom in timeout={1200}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNewOrder}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 'bold',
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.25)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Create New Order
                </Button>
              </Zoom>
            </Box>
          </Box>
        </Box>
      </Fade>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Modern Filter Section */}
      <Fade in timeout={1000}>
        <Card sx={{ 
          mb: 4, 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
          <Box 
            sx={{ 
              p: 3, 
              cursor: 'pointer', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: filtersOpen ? '1px solid #dee2e6' : 'none'
            }} 
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterListIcon sx={{ color: '#667eea', mr: 2, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                Filter & Search Orders
              </Typography>
            </Box>
            <IconButton size="small">
              <ExpandMoreIcon sx={{ 
                transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease-in-out'
              }} />
            </IconButton>
          </Box>
          <Collapse in={filtersOpen}>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="🔍 Search by Order Number"
                    value={orderNumberFilter}
                    onChange={(e) => setOrderNumberFilter(e.target.value)}
                    placeholder="e.g., AT/POF/00001"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'white',
                        '&:hover fieldset': { borderColor: '#667eea' },
                        '&.Mui-focused fieldset': { borderColor: '#667eea' }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>🏭 Processing Center</InputLabel>
                    <Select
                      value={processingCenterFilter}
                      label="🏭 Processing Center"
                      onChange={(e) => setProcessingCenterFilter(e.target.value)}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: 'white',
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' }
                      }}
                    >
                      <MenuItem value="">All Centers</MenuItem>
                      <MenuItem value="all">All Centers</MenuItem>
                      {getUniqueProcessingCenters().map((center) => (
                        <MenuItem key={center} value={center}>{center}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>📊 Status Filter</InputLabel>
                    <Select
                      value={statusFilter}
                      label="📊 Status Filter"
                      onChange={(e) => setStatusFilter(e.target.value)}
                      sx={{
                        borderRadius: 2,
                        backgroundColor: 'white',
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' }
                      }}
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="sent">Sent for Processing</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="returned">Returned</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                  Showing {filteredOrders.length} of {processingOrders.length} orders
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setOrderNumberFilter('');
                    setProcessingCenterFilter('');
                    setStatusFilter('all');
                  }}
                  sx={{ borderColor: '#667eea', color: '#667eea' }}
                >
                  Clear Filters
                </Button>
              </Box>
            </CardContent>
          </Collapse>
        </Card>
      </Fade>

      {/* Modern Processing Orders Table */}
      <Fade in timeout={1200}>
        <Card sx={{ 
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: 3,
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ 
                  bgcolor: 'rgba(255,255,255,0.15)', 
                  mr: 2,
                  backdropFilter: 'blur(10px)'
                }}>
                  <AssignmentIcon />
                </Avatar>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Processing Orders ({filteredOrders.length})
                </Typography>
              </Box>
            </Box>
          </Box>

          {filteredOrders.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <SendIcon sx={{ fontSize: 64, color: '#9e9e9e', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                {processingOrders.length === 0 ? 'No processing orders created yet' : 'No orders match your filter criteria'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {processingOrders.length === 0 ? 'Create your first processing order form to get started' : 'Try adjusting your filters'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 1400 }}>
                <TableHead>
                  <TableRow sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '& .MuiTableCell-head': { 
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.95rem'
                    }
                  }}>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Order Form Number</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Order No.</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Design</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Processing Center</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Sent Quantity (m)</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Received Qty (m)</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Shortage</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Delivery No.</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Created On</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Delivery Date</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Status</TableCell>
                    <TableCell sx={{ color: 'white !important', fontWeight: 'bold', border: 0 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.map((order) => {
                    return (
                      <React.Fragment key={order.id}>
                        <TableRow 
                          sx={{ 
                            '&:hover': { 
                              backgroundColor: '#f3f4f6',
                              transform: 'scale(1.001)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            },
                            '&:nth-of-type(odd)': { backgroundColor: 'rgba(103, 126, 234, 0.03)' },
                            transition: 'all 0.2s ease',
                            '& > *': { borderBottom: 'unset' }
                          }}
                        >
                          <TableCell 
                            sx={{ fontWeight: 'bold', color: '#667eea', fontSize: '0.9rem', cursor: 'pointer' }}
                            onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                          >
                            {order.orderFormNumber}
                          </TableCell>
                          <TableCell sx={{ fontWeight: '500' }}>
                            {order.orderDetails?.orderNumber || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: '600' }}>{order.orderDetails?.designName || 'N/A'}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{order.orderDetails?.designNumber || 'N/A'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <BusinessIcon sx={{ color: '#FF9800', mr: 1, fontSize: 18 }} />
                              {order.processingCenter}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '1.1rem' }}>
                              {order.totalQuantity?.toFixed(2)}m
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {order.totalFabricCuts || order.fabricCuts?.length || 0} cuts
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 'bold', color: '#0288d1', fontSize: '1.1rem' }}>
                              {order.receivedFabricCuts?.reduce((sum, cut) => sum + (cut.quantity || 0), 0).toFixed(2) || '0.00'}m
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                              {order.receivedFabricCuts?.length || 0} cuts
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography sx={{ fontWeight: 'bold', color: '#d32f2f', fontSize: '1.1rem' }}>
                                {(order.totalQuantity - (order.receivedFabricCuts?.reduce((sum, cut) => sum + (cut.quantity || 0), 0) || 0)).toFixed(2)}m
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                {(((order.totalQuantity - (order.receivedFabricCuts?.reduce((sum, cut) => sum + (cut.quantity || 0), 0) || 0)) / order.totalQuantity) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {order.deliveryHistory?.map(d => d.deliveryNumber).join(', ') || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarTodayIcon sx={{ color: '#9C27B0', mr: 1, fontSize: 18 }} />
                              {formatDate(order.createdAt)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocalShippingIcon sx={{ color: '#FF9800', mr: 1, fontSize: 18 }} />
                              {formatDate(order.deliveryDate)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {getStatusChip(order.status)}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="View Order Details">
                                <IconButton
                                  color="info"
                                  size="small"
                                  onClick={() => handleViewDetails(order)}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Print Order Form">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handlePrintOrder(order)}
                                >
                                  <PrintIcon />
                                </IconButton>
                              </Tooltip>
                              {(order.status === 'sent' || order.status === 'partially_received') && (
                                <Tooltip title="Receive Fabric">
                                  <IconButton
                                    color="success"
                                    size="small"
                                    onClick={() => handleReceiveClick(order)}
                                  >
                                    <ReceiveIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Delete Order">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteClick(order)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0, backgroundColor: 'rgba(103, 126, 234, 0.04)' }} colSpan={11}>
                            <Collapse in={expandedOrderId === order.id} timeout="auto" unmountOnExit>
                              <Box sx={{ 
                                margin: 2, 
                                p: 3, 
                                bgcolor: 'white', 
                                borderRadius: 2, 
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' 
                              }}>
                                <Grid container spacing={4}>
                                  {/* Sent Details */}
                                  <Grid item xs={12} md={5}>
                                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                      <CardHeader
                                        avatar={<Avatar sx={{ bgcolor: '#667eea' }}><LocalShippingIcon /></Avatar>}
                                        title={<Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>Sent Details</Typography>}
                                        sx={{ pb: 1 }}
                                      />
                                      <CardContent>
                                        <Typography variant="body2" gutterBottom><strong>Processes:</strong> {formatProcesses(order.processes)}</Typography>
                                        <Typography variant="body2" gutterBottom><strong>Created On:</strong> {formatDate(order.createdAt)}</Typography>
                                        <Typography variant="body2" gutterBottom><strong>Delivery Date:</strong> {formatDate(order.deliveryDate)}</Typography>
                                        <Typography variant="body2" gutterBottom><strong>Vehicle Number:</strong> {order.vehicleNumber}</Typography>
                                        <Typography variant="body2" gutterBottom><strong>Delivered By:</strong> {order.deliveredBy || 'N/A'}</Typography>
                                        
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>Original Fabric Cuts</Typography>
                                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                                                    <TableRow>
                                                        <TableCell sx={{fontWeight: 'bold'}}>Fabric Number</TableCell>
                                                        <TableCell align="right" sx={{fontWeight: 'bold'}}>Quantity (m)</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {(order.fabricCuts || []).map((cut) => (
                                                        <TableRow key={cut.id}>
                                                            <TableCell>{cut.fabricNumber}</TableCell>
                                                            <TableCell align="right">{(cut.inspectedQuantity || 0).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                      </CardContent>
                                    </Card>
                                  </Grid>

                                  {/* Receiving History */}
                                  <Grid item xs={12} md={7}>
                                     <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                        <CardHeader
                                          avatar={<Avatar sx={{ bgcolor: '#764ba2' }}><AssignmentTurnedInIcon /></Avatar>}
                                          title={<Typography variant="h6" sx={{ fontWeight: 'bold', color: '#764ba2' }}>Receiving History</Typography>}
                                          subheader={order.deliveryHistory?.length > 0 ? `${order.deliveryHistory.length} deliveries` : "No deliveries received yet"}
                                          sx={{ pb: 1 }}
                                        />
                                        <CardContent>
                                          {order.deliveryHistory && order.deliveryHistory.length > 0 ? (
                                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                                               <Table size="small" stickyHeader>
                                                  <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                                                    <TableRow>
                                                      <TableCell sx={{fontWeight: 'bold'}}>Received Date</TableCell>
                                                      <TableCell sx={{fontWeight: 'bold'}}>Delivery No.</TableCell>
                                                      <TableCell sx={{fontWeight: 'bold'}}>Received By</TableCell>
                                                      <TableCell sx={{fontWeight: 'bold'}}>Location</TableCell>
                                                      <TableCell align="right" sx={{fontWeight: 'bold'}}>Cuts</TableCell>
                                                      <TableCell align="right" sx={{fontWeight: 'bold'}}>Quantity (m)</TableCell>
                                                      <TableCell sx={{fontWeight: 'bold'}}>New Fabric No(s).</TableCell>
                                                      <TableCell sx={{fontWeight: 'bold'}}>Actions</TableCell>
                                                    </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                    {(() => {
                                                      let receivedCutIndex = 0;
                                                      return order.deliveryHistory.map((delivery, index) => {
                                                        const cutsForThisDelivery = (order.receivedFabricCuts || []).slice(
                                                          receivedCutIndex,
                                                          receivedCutIndex + delivery.cutsReceived
                                                        );
                                                        receivedCutIndex += delivery.cutsReceived;

                                                        const receivedDate = cutsForThisDelivery.length > 0
                                                          ? cutsForThisDelivery[0].receivedAt
                                                          : delivery.date;

                                                        return (
                                                          <TableRow key={index}>
                                                            <TableCell>{formatDate(receivedDate)}</TableCell>
                                                            <TableCell>{delivery.deliveryNumber}</TableCell>
                                                            <TableCell>{delivery.receivedBy || 'N/A'}</TableCell>
                                                            <TableCell>{delivery.location || 'N/A'}</TableCell>
                                                            <TableCell align="right">{cutsForThisDelivery.length}</TableCell>
                                                            <TableCell align="right">
                                                              {cutsForThisDelivery.reduce((acc, cut) => acc + (cut.quantity || 0), 0).toFixed(2)}
                                                            </TableCell>
                                                            <TableCell>{cutsForThisDelivery.map(c => c.newFabricNumber).join(', ')}</TableCell>
                                                            <TableCell>
                                                              <Box sx={{ display: 'flex', gap: 1 }}>
                                                                <IconButton
                                                                  size="small"
                                                                  onClick={() => handleEditDelivery(order, delivery, cutsForThisDelivery, index)}
                                                                  sx={{ color: '#1976d2' }}
                                                                  title="Edit Delivery"
                                                                >
                                                                  <EditIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                  size="small"
                                                                  onClick={() => handleDeleteDelivery(order, delivery, cutsForThisDelivery, index)}
                                                                  sx={{ color: '#d32f2f' }}
                                                                  title="Delete Delivery"
                                                                >
                                                                  <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                              </Box>
                                                            </TableCell>
                                                          </TableRow>
                                                        );
                                                      });
                                                    })()}
                                                  </TableBody>
                                                </Table>
                                            </TableContainer>
                                          ) : (
                                            <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                                              No fabric received for this order yet.
                                            </Typography>
                                          )}
                                        </CardContent>
                                      </Card>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Fade>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
          Delete Processing Order
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete this processing order?
          </Typography>
          {orderToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2"><strong>Order Number:</strong> {orderToDelete.orderFormNumber}</Typography>
              <Typography variant="body2"><strong>Processing Center:</strong> {orderToDelete.processingCenter}</Typography>
              <Typography variant="body2"><strong>Total Fabric Cuts:</strong> {orderToDelete.totalFabricCuts}</Typography>
              <Typography variant="body2"><strong>Total Quantity:</strong> {orderToDelete.totalQuantity?.toFixed(2)}m</Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> This action cannot be undone. All fabric cuts in this order will be available for other processing orders.
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
            {deleting ? 'Deleting...' : 'Delete Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsDialogOpen} onClose={handleViewDetailsClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ color: '#1976d2', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0' }}>
          📋 Processing Order Details - {orderToView?.orderFormNumber}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {orderToView && (
            <Box sx={{ p: 3 }}>
              {/* Order Summary Section */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                  📦 Order Summary
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                  <Card sx={{ bgcolor: '#ede7f6', borderLeft: '4px solid #673ab7' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">Order Number</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#673ab7' }}>
                        {orderToView.orderNumber || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#fce4ec', borderLeft: '4px solid #e91e63' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">Design</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e91e63' }}>
                        {orderToView.orderDetails?.designName || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        ({orderToView.orderDetails?.designNumber || 'N/A'})
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">Processing Center</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {orderToView.processingCenter}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#f3e5f5', borderLeft: '4px solid #9c27b0' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">Processes</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                        {formatProcesses(orderToView.processes)}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#e8f5e8', borderLeft: '4px solid #4caf50' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">Total Fabric Cuts</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                        {orderToView.totalFabricCuts}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">Total Quantity</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                        {orderToView.totalQuantity?.toFixed(2)}m
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#fce4ec', borderLeft: '4px solid #e91e63' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">Delivery Date</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e91e63' }}>
                        {formatDate(orderToView.deliveryDate)}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: '#e0f2f1', borderLeft: '4px solid #009688' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="body2" color="textSecondary">Vehicle Number</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#009688' }}>
                        {orderToView.vehicleNumber}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              {/* Fabric Cuts Details Section */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                  🧵 Fabric Cuts Details
                </Typography>
                <TableContainer component={Paper} sx={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#1976d2' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>S.No</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fabric Cut Number</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Warp Number</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Order Number</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Design Number</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Design Name</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Quantity (m)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderToView.fabricCuts?.map((cut, index) => (
                        <TableRow 
                          key={index}
                          sx={{ 
                            '&:hover': { backgroundColor: '#f5f5f5' },
                            '&:nth-of-type(odd)': { backgroundColor: '#fafafa' }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 'bold', color: '#666' }}>
                            {index + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                            {cut.fabricNumber}
                          </TableCell>
                          <TableCell sx={{ color: '#9c27b0', fontWeight: '600' }}>
                            {cut.warpNumber}
                          </TableCell>
                          <TableCell sx={{ color: '#9c27b0', fontWeight: '600' }}>
                            {cut.orderNumber || 'N/A'}
                          </TableCell>
                          <TableCell sx={{ color: '#ff9800', fontWeight: '600' }}>
                            {cut.designNumber || 'N/A'}
                          </TableCell>
                          <TableCell sx={{ color: '#795548', fontWeight: '600' }}>
                            {cut.designName || 'N/A'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                            {cut.inspectedQuantity?.toFixed(2) || '0.00'}
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body2" color="textSecondary">
                              No fabric cuts found for this order
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={handleViewDetailsClose}
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receive Fabric Dialog */}
      <ReceiveFabricDialog
        open={receiveDialogOpen}
        onClose={handleReceiveDialogClose}
        order={orderToReceive}
        onReceiveComplete={fetchProcessingOrders}
      />

      {/* Delete Delivery Dialog */}
      <DeleteDeliveryDialog 
        open={deleteDeliveryDialogOpen}
        onClose={handleDeleteDeliveryClose}
        delivery={deliveryToDelete}
        order={orderToModify}
        onDeleteComplete={fetchProcessingOrders}
      />

      {/* Edit Delivery Dialog */}
      <EditDeliveryDialog 
        open={editDeliveryDialogOpen}
        onClose={handleEditDeliveryClose}
        delivery={deliveryToEdit}
        order={orderToModify}
        onEditComplete={fetchProcessingOrders}
      />
    </Container>
  );
}

function ReceiveFabricDialog({ open, onClose, order, onReceiveComplete }) {
  const [deliveryNumber, setDeliveryNumber] = useState('');
  const [numberOfCuts, setNumberOfCuts] = useState('');
  const [receivedCuts, setReceivedCuts] = useState([]);
  const [receivedBy, setReceivedBy] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalCutsAlreadyReceived = order?.receivedFabricCuts?.length || 0;
  const totalSentCuts = order?.totalFabricCuts || order?.fabricCuts?.length || 0;
  const maxAllowedCuts = order ? Math.max(0, totalSentCuts - totalCutsAlreadyReceived) : 0;
  const totalReceivedQty = receivedCuts.reduce((sum, cut) => sum + (parseFloat(cut.quantity) || 0), 0);
  
  // Calculate quantity validation
  const totalSentQuantity = order?.totalQuantity || 0;
  const alreadyReceivedQuantity = order?.receivedFabricCuts?.reduce((sum, cut) => sum + (cut.quantity || 0), 0) || 0;
  const balanceQuantity = Math.max(0, totalSentQuantity - alreadyReceivedQuantity);
  const maxAllowedQuantity = balanceQuantity;

  const handleQuantityChange = useCallback((id, value) => {
    setReceivedCuts(prev => prev.map(cut => 
      cut.id === id ? { ...cut, quantity: value } : cut
    ));
  }, []);

  useEffect(() => {
    if (open) {
      setDeliveryNumber('');
      setNumberOfCuts('');
      setReceivedCuts([]);
      setReceivedBy('');
      setLocation('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    const num = parseInt(numberOfCuts, 10);
    if (!isNaN(num) && num > 0 && order) {
      if (num > maxAllowedCuts) {
        setError(`Cannot receive more than ${maxAllowedCuts} cuts. You have already received ${totalCutsAlreadyReceived} out of ${totalSentCuts} cuts.`);
        setReceivedCuts([]);
        return;
      }

      const numToCreate = Math.min(num, maxAllowedCuts);
      const newCuts = Array.from({ length: numToCreate }, (_, i) => ({
        id: i + 1,
        quantity: receivedCuts[i]?.quantity || ''
      }));
      setReceivedCuts(newCuts);
      setError('');
    } else {
      setReceivedCuts([]);
      if (numberOfCuts !== '') {
        setError('');
      }
    }
  }, [numberOfCuts, order, maxAllowedCuts, totalCutsAlreadyReceived, totalSentCuts]);

  const handleSubmit = async () => {
    try {
      // Additional validation
      if (!order || !order.orderFormNumber) {
        setError('Invalid order information. Please try again.');
        return;
      }

      // Validation
      if (!deliveryNumber.trim()) {
        setError('Please enter the delivery number from the processing center.');
        return;
      }

      if (!receivedBy.trim()) {
        setError('Please enter who received the fabric.');
        return;
      }

      if (!location.trim()) {
        setError('Please select the location where fabric was received.');
        return;
      }

      if (receivedCuts.length === 0) {
        setError('Please specify the number of cuts to receive.');
        return;
      }

      // Check if number of cuts exceeds maximum allowed
      if (receivedCuts.length > maxAllowedCuts) {
        setError(`Cannot receive ${receivedCuts.length} cuts. Maximum allowed is ${maxAllowedCuts} cuts.`);
        return;
      }

      const invalidCuts = receivedCuts.filter(cut => !cut.quantity || parseFloat(cut.quantity) <= 0);
      if (invalidCuts.length > 0) {
        setError('Please enter valid quantities for all fabric cuts.');
        return;
      }

      // Check if total receiving quantity exceeds balance quantity
      if (totalReceivedQty > maxAllowedQuantity) {
        setError(`Total receiving quantity (${totalReceivedQty.toFixed(2)}m) exceeds balance quantity (${maxAllowedQuantity.toFixed(2)}m). Total sent: ${totalSentQuantity.toFixed(2)}m, Already received: ${alreadyReceivedQuantity.toFixed(2)}m.`);
        return;
      }

      setError('');
      setSubmitting(true);

      // Prepare the payload
      const payload = {
        deliveryNumber: deliveryNumber.trim(),
        receivedBy: receivedBy.trim(),
        location: location.trim(),
        cuts: receivedCuts.map(cut => ({
          quantity: parseFloat(cut.quantity)
        }))
      };

      // Generate new fabric numbers for the received cuts
      const orderNumberPart = order.orderFormNumber ? order.orderFormNumber.split('/').pop() || '00001' : '00001';
      
      // Get all existing fabric numbers for this order to find the next available number
      const existingFabricNumbers = new Set();
      if (order.receivedFabricCuts) {
        order.receivedFabricCuts.forEach(cut => {
          if (cut.newFabricNumber) {
            existingFabricNumbers.add(cut.newFabricNumber);
          }
        });
      }
      
      // Function to find next available fabric number
      const getNextAvailableFabricNumber = (orderPart, existingNumbers) => {
        let cutNumber = 1;
        let fabricNumber;
        do {
          const cutNumberStr = String(cutNumber).padStart(2, '0');
          fabricNumber = `WR/${orderPart}/${cutNumberStr}`;
          cutNumber++;
        } while (existingNumbers.has(fabricNumber));
        return fabricNumber;
      };
      
      const newReceivedCuts = payload.cuts.map((cut, index) => {
        const fabricNumber = getNextAvailableFabricNumber(orderNumberPart, existingFabricNumbers);
        existingFabricNumbers.add(fabricNumber); // Add to set to avoid duplicates in this batch
        
        return {
          id: `${order.id}-${Date.now() + index}`,
          newFabricNumber: fabricNumber,
          quantity: cut.quantity,
          receivedAt: new Date().toISOString(),
          processingCenter: order.processingCenter || '',
          location: payload.location,
          deliveryNumber: payload.deliveryNumber,
          receivedBy: payload.receivedBy,
        };
      });

      // Update the order with new received cuts
      const updatedOrder = {
        ...order,
        receivedFabricCuts: [...(order.receivedFabricCuts || []), ...newReceivedCuts],
        status: newReceivedCuts.length + totalCutsAlreadyReceived >= totalSentCuts ? 'completed' : 'partially_received',
        deliveryHistory: [...(order.deliveryHistory || []), {
          deliveryNumber: deliveryNumber.trim(),
          date: new Date().toISOString(),
          cutsReceived: newReceivedCuts.length,
          totalQuantityReceived: newReceivedCuts.reduce((sum, cut) => sum + cut.quantity, 0),
          receivedBy: receivedBy.trim(),
          location: payload.location
        }]
      };

      // Update via API
      await axios.put(buildApiUrl(`processing-orders/${order.id}`), updatedOrder);

      // Generate and print QR code stickers
      const stickers = newReceivedCuts.map(cut => ({
        fabricNumber: cut.newFabricNumber,
        orderNumber: order.orderDetails?.orderNumber || 'N/A',
        designNumber: order.orderDetails?.designNumber || 'N/A',
        designName: order.orderDetails?.designName || 'N/A',
        quantity: cut.quantity,
        location: cut.location
      }));

      const stickerHTML = await generateStickerSheetHTML(stickers);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(stickerHTML);
        printWindow.document.close();
      }

      onReceiveComplete();
      onClose();

    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Function to generate QR sticker sheet HTML
  const generateStickerSheetHTML = async (stickers) => {
    // Generate QR codes for each sticker
    const stickersWithQR = await Promise.all(stickers.map(async (sticker, index) => {
      try {
        const qrData = sticker.fabricNumber;
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        return { ...sticker, qrCode: qrCodeDataUrl, index };
      } catch (error) {
        console.error('Error generating QR code for sticker:', error);
        return { ...sticker, qrCode: '', index };
      }
    }));

    const stickersHTML = stickersWithQR.map((sticker) => `
      <div class="sticker">
        <div class="company-name">ASHOK TEXTILES</div>
        <div class="content">
          <div class="qr-section">
            <img src="${sticker.qrCode}" alt="QR Code" onload="window.qrLoaded${sticker.index} = true" />
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="label">Order:</span>
              <span class="value">${sticker.orderNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Design:</span>
              <span class="value">${sticker.designName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Design No:</span>
              <span class="value">${sticker.designNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Quantity:</span>
              <span class="value">${sticker.quantity}m</span>
            </div>
            <div class="info-row">
              <span class="label">Fabric No:</span>
              <span class="value">${sticker.fabricNumber}</span>
            </div>
            <div class="info-row">
              <span class="label">Location:</span>
              <span class="value">${sticker.location || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    return `
      <html>
        <head>
          <title>Received Fabric QR Stickers</title>
          <style>
            @page {
              size: 9.5cm 5.5cm;
              margin: 2mm;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              font-size: 8px;
            }
            .sticker {
              border: 1px solid #000;
              padding: 2mm;
              width: 9.1cm;
              height: 5.1cm;
              box-sizing: border-box;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .sticker:last-child {
              page-break-after: avoid;
            }
            .company-name {
              text-align: center;
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 2mm;
              border-bottom: 1px solid #ccc;
              padding-bottom: 1mm;
              flex-shrink: 0;
            }
            .content {
              display: flex;
              flex: 1;
              min-height: 0;
            }
            .qr-section {
              width: 45%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-section img {
              max-width: 32mm;
              max-height: 32mm;
            }
            .info-section {
              width: 55%;
              padding-left: 2mm;
              display: flex;
              flex-direction: column;
              justify-content: space-around;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 0.5mm;
            }
            .label {
              font-weight: bold;
              color: #333;
              font-size: 7px;
            }
            .value {
              color: #000;
              font-size: 7px;
            }
          </style>
        </head>
        <body>
          ${stickersHTML}
          <script>
            ${stickersWithQR.map((_, index) => `window.qrLoaded${index} = false;`).join('\n            ')}
            function waitForAllQRAndPrint() {
              const allLoaded = ${stickersWithQR.map((_, index) => `window.qrLoaded${index}`).join(' && ')};
              if (allLoaded) {
                // Wait an additional 200ms for all images to fully render
                setTimeout(() => {
                  window.print();
                }, 200);
              } else {
                // Check again in 100ms
                setTimeout(waitForAllQRAndPrint, 100);
              }
            }
            // Start checking after the page loads
            window.onload = function() {
              waitForAllQRAndPrint();
            };
          </script>
        </body>
      </html>
    `;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f3f4f6' }}>
        <Avatar sx={{ bgcolor: '#10b981', mr: 2 }}><ReceiveIcon /></Avatar>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Receive Fabric for Order: {order?.orderFormNumber}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={3}>
          {/* Form Inputs */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
                <CardHeader title="Delivery Details" sx={{ bgcolor: '#f8f9fa' }} />
                <CardContent>
                    <TextField
                      autoFocus
                      fullWidth
                      label="Processing Center's Delivery Number"
                      variant="outlined"
                      value={deliveryNumber}
                      onChange={(e) => setDeliveryNumber(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Received By"
                      placeholder="Enter name of receiver"
                      variant="outlined"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Location</InputLabel>
                      <Select
                        value={location}
                        label="Location"
                        onChange={(e) => setLocation(e.target.value)}
                      >
                        <MenuItem value="">Select Location</MenuItem>
                        <MenuItem value="Veerapandi">Veerapandi</MenuItem>
                        <MenuItem value="Salem">Salem</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      type="number"
                      label={`Number of Fabric Cuts to Receive (Max: ${maxAllowedCuts})`}
                      variant="outlined"
                      value={numberOfCuts}
                      onChange={(e) => setNumberOfCuts(e.target.value)}
                      inputProps={{ min: 1, max: maxAllowedCuts }}
                      disabled={maxAllowedCuts === 0}
                    />
                </CardContent>
            </Card>
          </Grid>
          
          {/* Quantity Inputs */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardHeader title="Received Cuts" sx={{ bgcolor: '#f8f9fa' }} />
              <CardContent>
                {receivedCuts.length > 0 && (
                  <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Received Quantity (m)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {receivedCuts.map((cut) => (
                          <TableRow key={cut.id}>
                            <TableCell>{cut.id}</TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={cut.quantity}
                                onChange={(e) => handleQuantityChange(cut.id, e.target.value)}
                                inputProps={{ min: 0, step: 0.01 }}
                                size="small"
                                fullWidth
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ position: 'sticky', top: 16 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Summary
                </Typography>
                <Divider sx={{ my: 1 }} />
                
                {/* Quantity Summary */}
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
                  Quantity Overview:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                  <Typography variant="body2">Total Sent Quantity:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>{totalSentQuantity.toFixed(2)} m</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                  <Typography variant="body2">Already Received:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{alreadyReceivedQuantity.toFixed(2)} m</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1, p: 1, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ffcc02' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Balance to Receive:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f57c00' }}>{balanceQuantity.toFixed(2)} m</Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Cuts Summary */}
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#666' }}>
                  Cuts Overview:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                  <Typography variant="body2">Total Sent Cuts:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{order?.totalFabricCuts || order?.fabricCuts?.length || 0} cuts</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                  <Typography variant="body2">Already Received Cuts:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{totalCutsAlreadyReceived} cuts</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                  <Typography variant="body2">Cuts Available to Receive:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#666' }}>{maxAllowedCuts} cuts</Typography>
                </Box>

                <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2, color: '#666' }}>
                  Original Sent Fabrics:
                </Typography>
                <Box sx={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', p: 1, borderRadius: 1, my: 1, bgcolor: '#fcfcfc' }}>
                  {order?.fabricCuts?.map((cut, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', py: 0.5, px: 1 }}>
                      <Typography variant="body2">{cut.fabricNumber}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{cut.inspectedQuantity?.toFixed(2)} m</Typography>
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1.5, color: 'green' }}>
                  <Typography sx={{ fontWeight: 'bold' }}>Receiving Now:</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{receivedCuts.length} cuts</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                
                {/* Current Receiving Summary */}
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#2e7d32' }}>
                  Current Receiving:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                  <Typography variant="body2">Receiving Now (Cuts):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{receivedCuts.length} cuts</Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  my: 1, 
                  p: 1, 
                  borderRadius: 1,
                  bgcolor: totalReceivedQty > maxAllowedQuantity ? '#ffebee' : '#e8f5e8',
                  border: `1px solid ${totalReceivedQty > maxAllowedQuantity ? '#f44336' : '#4caf50'}`
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total Receiving Qty:</Typography>
                  <Typography variant="body2" sx={{ 
                    fontWeight: 'bold', 
                    color: totalReceivedQty > maxAllowedQuantity ? '#d32f2f' : '#2e7d32'
                  }}>
                    {totalReceivedQty.toFixed(2)} m
                  </Typography>
                </Box>
                
                {totalReceivedQty > maxAllowedQuantity && (
                  <Box sx={{ 
                    p: 1, 
                    bgcolor: '#ffebee', 
                    border: '1px solid #f44336', 
                    borderRadius: 1, 
                    mt: 1 
                  }}>
                    <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                      ⚠️ Exceeds balance quantity by {(totalReceivedQty - maxAllowedQuantity).toFixed(2)} m
                    </Typography>
                  </Box>
                )}
                
                {totalReceivedQty <= maxAllowedQuantity && totalReceivedQty > 0 && (
                  <Box sx={{ 
                    p: 1, 
                    bgcolor: '#e8f5e8', 
                    border: '1px solid #4caf50', 
                    borderRadius: 1, 
                    mt: 1 
                  }}>
                    <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                      ✅ Within allowed limit. Remaining: {(maxAllowedQuantity - totalReceivedQty).toFixed(2)} m
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #ddd' }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={submitting || receivedCuts.length === 0 || totalReceivedQty > maxAllowedQuantity}
        >
          {submitting ? 'Submitting...' : 'Submit & Generate QR'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Delete Delivery Dialog Component
function DeleteDeliveryDialog({ open, onClose, delivery, order, onDeleteComplete }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteConfirm = async () => {
    if (!delivery || !order) return;

    try {
      setDeleting(true);
      setError('');

      // Remove the delivery from the order's delivery history
      const updatedDeliveryHistory = order.deliveryHistory.filter((_, index) => index !== delivery.deliveryIndex);
      
      // Remove the associated fabric cuts from receivedFabricCuts
      const updatedReceivedFabricCuts = order.receivedFabricCuts.filter(cut => 
        cut.deliveryNumber !== delivery.deliveryNumber
      );

      // Calculate new status based on remaining received cuts
      const totalSentCuts = order.totalFabricCuts || order.fabricCuts?.length || 0;
      const newStatus = updatedReceivedFabricCuts.length === 0 ? 'sent' : 
                       updatedReceivedFabricCuts.length >= totalSentCuts ? 'completed' : 'partially_received';

      const updatedOrder = {
        ...order,
        deliveryHistory: updatedDeliveryHistory,
        receivedFabricCuts: updatedReceivedFabricCuts,
        status: newStatus
      };

      // Update via API
      await axios.put(buildApiUrl(`processing-orders/${order.id}`), updatedOrder);

      onDeleteComplete();
      onClose();

    } catch (err) {
      console.error('Error deleting delivery:', err);
      setError('Failed to delete delivery. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
        Delete Delivery
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Typography variant="body1" gutterBottom>
          Are you sure you want to delete this delivery?
        </Typography>
        
        {delivery && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2"><strong>Delivery Number:</strong> {delivery.deliveryNumber}</Typography>
            <Typography variant="body2"><strong>Received By:</strong> {delivery.receivedBy || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Location:</strong> {delivery.location || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Cuts Received:</strong> {delivery.cuts?.length || 0}</Typography>
            <Typography variant="body2"><strong>Total Quantity:</strong> {delivery.cuts?.reduce((sum, cut) => sum + (cut.quantity || 0), 0).toFixed(2) || 0}m</Typography>
          </Box>
        )}
        
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Warning:</strong> This action cannot be undone. All fabric cuts associated with this delivery will be removed, and the order status will be updated accordingly.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button 
          onClick={handleDeleteConfirm}
          variant="contained"
          color="error"
          disabled={deleting}
          startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
        >
          {deleting ? 'Deleting...' : 'Delete Delivery'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Edit Delivery Dialog Component
function EditDeliveryDialog({ open, onClose, delivery, order, onEditComplete }) {
  const [editedDelivery, setEditedDelivery] = useState({
    deliveryNumber: '',
    receivedBy: '',
    location: '',
    cuts: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && delivery) {
      setEditedDelivery({
        deliveryNumber: delivery.deliveryNumber || '',
        receivedBy: delivery.receivedBy || '',
        location: delivery.location || '',
        cuts: delivery.cuts?.map(cut => ({ ...cut })) || []
      });
      setError('');
    }
  }, [open, delivery]);

  const handleCutQuantityChange = (cutIndex, newQuantity) => {
    setEditedDelivery(prev => ({
      ...prev,
      cuts: prev.cuts.map((cut, index) => 
        index === cutIndex ? { ...cut, quantity: parseFloat(newQuantity) || 0 } : cut
      )
    }));
  };

  const handleRemoveCut = (cutIndex) => {
    setEditedDelivery(prev => ({
      ...prev,
      cuts: prev.cuts.filter((_, index) => index !== cutIndex)
    }));
  };

  // Function to print QR sticker for a fabric cut
  const handlePrintQRSticker = async (cut) => {
    try {
      // Generate QR code for the fabric cut
      const qrCodeDataUrl = await QRCode.toDataURL(cut.newFabricNumber, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const stickerHTML = `
        <html>
          <head>
            <title>QR Sticker - ${cut.newFabricNumber}</title>
            <style>
              @page {
                size: 9.5cm 5.5cm;
                margin: 2mm;
              }
              @media print {
                body { -webkit-print-color-adjust: exact; }
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 2mm;
                width: 9.1cm;
                height: 5.1cm;
                font-size: 8px;
                overflow: hidden;
              }
              .sticker {
                border: 1px solid #000;
                padding: 2mm;
                height: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
              }
              .company-name {
                text-align: center;
                font-weight: bold;
                font-size: 12px;
                margin-bottom: 2mm;
                border-bottom: 1px solid #ccc;
                padding-bottom: 1mm;
                flex-shrink: 0;
              }
              .content {
                display: flex;
                flex: 1;
                min-height: 0;
              }
              .qr-section {
                width: 45%;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .qr-section img {
                max-width: 32mm;
                max-height: 32mm;
              }
              .info-section {
                width: 55%;
                padding-left: 2mm;
                display: flex;
                flex-direction: column;
                justify-content: space-around;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5mm;
              }
              .label {
                font-weight: bold;
                color: #333;
                font-size: 7px;
              }
              .value {
                color: #000;
                font-size: 7px;
              }
            </style>
          </head>
          <body>
            <div class="sticker">
              <div class="company-name">ASHOK TEXTILES</div>
              <div class="content">
                <div class="qr-section">
                  <img src="${qrCodeDataUrl}" alt="QR Code" onload="window.qrLoaded = true" />
                </div>
                <div class="info-section">
                  <div class="info-row">
                    <span class="label">Order:</span>
                    <span class="value">${order?.orderDetails?.orderNumber || order?.orderNumber || 'N/A'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Design:</span>
                    <span class="value">${order?.orderDetails?.designName || order?.designName || 'N/A'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Design No:</span>
                    <span class="value">${order?.orderDetails?.designNumber || order?.designNumber || 'N/A'}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Quantity:</span>
                    <span class="value">${cut.quantity}m</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Fabric No:</span>
                    <span class="value">${cut.newFabricNumber}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Location:</span>
                    <span class="value">${cut.location || editedDelivery.location || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            <script>
              window.qrLoaded = false;
              function waitForQRAndPrint() {
                if (window.qrLoaded) {
                  // Wait an additional 100ms for the image to fully render
                  setTimeout(() => {
                    window.print();
                    window.close();
                  }, 100);
                } else {
                  // Check again in 50ms
                  setTimeout(waitForQRAndPrint, 50);
                }
              }
              // Start checking after the page loads
              window.onload = function() {
                waitForQRAndPrint();
              };
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(stickerHTML);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error generating QR sticker:', error);
      alert('Error generating QR sticker. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!delivery || !order) return;

    try {
      setSaving(true);
      setError('');

      // Validation
      if (!editedDelivery.deliveryNumber.trim()) {
        setError('Delivery number is required.');
        return;
      }

      if (!editedDelivery.receivedBy.trim()) {
        setError('Received by field is required.');
        return;
      }

      if (!editedDelivery.location.trim()) {
        setError('Location is required.');
        return;
      }

      if (editedDelivery.cuts.length === 0) {
        setError('At least one fabric cut is required.');
        return;
      }

      // Check for invalid quantities
      const invalidCuts = editedDelivery.cuts.filter(cut => !cut.quantity || cut.quantity <= 0);
      if (invalidCuts.length > 0) {
        setError('All fabric cuts must have valid quantities greater than 0.');
        return;
      }

      // Update the order's delivery history
      const updatedDeliveryHistory = order.deliveryHistory.map((del, index) => 
        index === delivery.deliveryIndex ? {
          ...del,
          deliveryNumber: editedDelivery.deliveryNumber.trim(),
          receivedBy: editedDelivery.receivedBy.trim(),
          location: editedDelivery.location.trim(),
          cutsReceived: editedDelivery.cuts.length,
          totalQuantityReceived: editedDelivery.cuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0)
        } : del
      );

      // Update the receivedFabricCuts
      const updatedReceivedFabricCuts = order.receivedFabricCuts.map(cut => {
        if (cut.deliveryNumber === delivery.deliveryNumber) {
          // Find the corresponding edited cut
          const editedCut = editedDelivery.cuts.find(editCut => 
            editCut.newFabricNumber === cut.newFabricNumber
          );
          if (editedCut) {
            return {
              ...cut,
              deliveryNumber: editedDelivery.deliveryNumber.trim(),
              receivedBy: editedDelivery.receivedBy.trim(),
              location: editedDelivery.location.trim(),
              quantity: editedCut.quantity
            };
          }
          return null; // Cut was removed
        }
        return cut;
      }).filter(Boolean); // Remove null values (removed cuts)

      // Calculate new status
      const totalSentCuts = order.totalFabricCuts || order.fabricCuts?.length || 0;
      const newStatus = updatedReceivedFabricCuts.length === 0 ? 'sent' : 
                       updatedReceivedFabricCuts.length >= totalSentCuts ? 'completed' : 'partially_received';

      const updatedOrder = {
        ...order,
        deliveryHistory: updatedDeliveryHistory,
        receivedFabricCuts: updatedReceivedFabricCuts,
        status: newStatus
      };

      // Update via API
      await axios.put(buildApiUrl(`processing-orders/${order.id}`), updatedOrder);

      onEditComplete();
      onClose();

    } catch (err) {
      console.error('Error updating delivery:', err);
      setError('Failed to update delivery. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ color: '#1976d2', fontWeight: 'bold' }}>
        Edit Delivery
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Delivery Number"
              value={editedDelivery.deliveryNumber}
              onChange={(e) => setEditedDelivery(prev => ({ ...prev, deliveryNumber: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Received By"
              value={editedDelivery.receivedBy}
              onChange={(e) => setEditedDelivery(prev => ({ ...prev, receivedBy: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>Location</InputLabel>
              <Select
                value={editedDelivery.location}
                label="Location"
                onChange={(e) => setEditedDelivery(prev => ({ ...prev, location: e.target.value }))}
              >
                <MenuItem value="">Select Location</MenuItem>
                <MenuItem value="Veerapandi">Veerapandi</MenuItem>
                <MenuItem value="Salem">Salem</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>
          Fabric Cuts
        </Typography>
        
        {editedDelivery.cuts.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Fabric Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Quantity (m)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editedDelivery.cuts.map((cut, index) => (
                  <TableRow key={index}>
                    <TableCell>{cut.newFabricNumber}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={cut.quantity}
                        onChange={(e) => handleCutQuantityChange(index, e.target.value)}
                        inputProps={{ min: 0, step: 0.01 }}
                        size="small"
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handlePrintQRSticker(cut)}
                        title="Print QR Sticker"
                        sx={{ mr: 1 }}
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveCut(index)}
                        title="Remove this cut"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
            No fabric cuts remaining in this delivery.
          </Typography>
        )}

        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2">
            <strong>Total Cuts:</strong> {editedDelivery.cuts.length}
          </Typography>
          <Typography variant="body2">
            <strong>Total Quantity:</strong> {editedDelivery.cuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0).toFixed(2)}m
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          disabled={saving || editedDelivery.cuts.length === 0}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SendForProcessing;