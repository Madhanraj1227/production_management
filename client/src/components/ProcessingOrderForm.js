import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  Avatar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

const steps = [
  'Order Form Details',
  'Processing Center & Processes',
  'Scan Fabric Cuts',
  'Delivery Details',
  'Review & Submit'
];

const availableProcesses = [
  { value: 'zero-zero', label: 'Zero-Zero' },
  { value: 'brushing', label: 'Brushing' },
  { value: 'de-sizing', label: 'De-sizing' }
];

function ProcessingOrderForm({ onClose }) {
  const navigate = useNavigate();
  
  // Form State
  const [activeStep, setActiveStep] = useState(0);
  const [orderFormNumber, setOrderFormNumber] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [processingCenters, setProcessingCenters] = useState([]);
  const [selectedProcessingCenter, setSelectedProcessingCenter] = useState('');
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [scannedFabricCuts, setScannedFabricCuts] = useState([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveredBy, setDeliveredBy] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const generateQRCode = useCallback(async () => {
    if (!orderFormNumber) return;
    try {
      const dataUrl = await QRCode.toDataURL(orderFormNumber, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }, [orderFormNumber]);

  useEffect(() => {
    generateOrderFormNumber();
    fetchProcessingCenters();
  }, []);

  useEffect(() => {
      generateQRCode();
  }, [generateQRCode]);

  useEffect(() => {
    const total = scannedFabricCuts.reduce((sum, cut) => sum + (cut.inspectedQuantity || 0), 0);
    setTotalQuantity(total);
  }, [scannedFabricCuts]);

  const generateOrderFormNumber = async () => {
    try {
      // Get next sequential number from backend
      const response = await axios.get(buildApiUrl('processing-orders'));
      const existingOrders = response.data;
      const nextNumber = existingOrders.length + 1;
      const formattedNumber = String(nextNumber).padStart(5, '0');
      setOrderFormNumber(`AT/POF/${formattedNumber}`);
    } catch (error) {
      console.error('Error generating order form number:', error);
      setErrorMessage('Failed to generate order form number');
    }
  };

  const fetchProcessingCenters = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.get(buildApiUrl('processing-centers'));
      // setProcessingCenters(response.data);
      
      // Mock data for now
      setProcessingCenters([
        { id: 1, name: 'ABC Finishing Works', address: '123 Industrial Area, Chennai' },
        { id: 2, name: 'XYZ Processing Unit', address: '456 Textile Hub, Coimbatore' },
        { id: 3, name: 'Premium Fabric Finishers', address: '789 Manufacturing Zone, Erode' }
      ]);
    } catch (error) {
      console.error('Error fetching processing centers:', error);
      setErrorMessage('Failed to fetch processing centers');
    }
  };

  const handleProcessChange = (event) => {
    const value = event.target.value;
    setSelectedProcesses(typeof value === 'string' ? value.split(',') : value);
  };

  const handleScanFabricCut = async () => {
    if (!scanInput.trim() || isScanning) {
      return;
    }

    setIsScanning(true);
    setScanError('');

    try {
      const trimmedInput = scanInput.trim();

      // Use the for-processing endpoint that validates 4-point inspection
      const response = await axios.get(buildApiUrl(`fabric-cuts/for-processing/${encodeURIComponent(trimmedInput)}`));
      const fabricCutData = response.data;

      // Now that we have the canonical fabric number, check if it's already in the list
      if (scannedFabricCuts.some(cut => cut.fabricNumber.toLowerCase() === fabricCutData.fabricNumber.toLowerCase())) {
        setScanError(`Fabric cut ${fabricCutData.fabricNumber} has already been added to this order.`);
        return;
      }
      
      // Check if fabric cut is already used in other processing orders using its canonical number
      const checkResponse = await axios.get(buildApiUrl(`processing-orders/check-fabric-cut/${encodeURIComponent(fabricCutData.fabricNumber)}`));
      if (checkResponse.data.isUsed) {
        setScanError(`Fabric cut ${fabricCutData.fabricNumber} is already in processing order ${checkResponse.data.orderFormNumber}.`);
        return;
      }

      // Double-check inspection status
      if (!fabricCutData.hasInspection) {
        setScanError(`Fabric cut ${fabricCutData.fabricNumber} has not completed 4-point inspection.`);
        return;
      }

      // Check if this fabric cut belongs to the same order as previously scanned ones
      if (orderDetails && fabricCutData.orderNumber && fabricCutData.orderNumber !== orderDetails.orderNumber) {
        setScanError(`❌ This cut is from order ${fabricCutData.orderNumber}. This form is for order ${orderDetails.orderNumber}.`);
        return;
      }

      // Create fabric cut object with real data
      const fabricCut = {
        fabricNumber: fabricCutData.fabricNumber,
        warpNumber: fabricCutData.warpNumber,
        inspectedQuantity: fabricCutData.inspectedQuantity,
        orderNumber: fabricCutData.orderNumber,
        designNumber: fabricCutData.designNumber,
        designName: fabricCutData.designName
      };

      // Add to scanned list
      setScannedFabricCuts(prev => [...prev, fabricCut]);
      
      // Capture order details from the first fabric cut
      if (scannedFabricCuts.length === 0 && fabricCutData.orderNumber) {
        setOrderDetails({
          orderNumber: fabricCutData.orderNumber,
          designNumber: fabricCutData.designNumber,
          designName: fabricCutData.designName
        });
      }
      
      setScanInput('');
      setSuccessMessage(`✅ Fabric cut ${fabricCutData.fabricNumber} added successfully! (${fabricCutData.inspectedQuantity}m)`);
      
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Error validating fabric cut:', error);
      if (error.response?.status === 404) {
        setScanError(`❌ Fabric cut "${scanInput.trim()}" not found.`);
      } else if (error.response?.status === 400) {
        setScanError(`❌ ${error.response.data.message || 'This cut has not been inspected.'}`);
      } else {
        setScanError('❌ Failed to validate fabric cut.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemoveFabricCut = (fabricNumber) => {
    setScannedFabricCuts(prev => prev.filter(cut => cut.fabricNumber !== fabricNumber));
  };

  const handleNext = () => {
    if (activeStep === 1) {
      if (!selectedProcessingCenter || selectedProcesses.length === 0) {
        setErrorMessage('Please select a processing center and at least one process');
        return;
      }
    }
    if (activeStep === 2) {
      if (scannedFabricCuts.length === 0) {
        setErrorMessage('Please scan at least one fabric cut');
        return;
      }
    }
    if (activeStep === 3) {
      if (!vehicleNumber || !deliveryDate) {
        setErrorMessage('Please enter vehicle number and delivery date');
        return;
      }
    }
    
    setErrorMessage('');
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const orderData = {
        orderFormNumber,
        processingCenter: getSelectedProcessingCenterName(),
        processingCenterId: selectedProcessingCenter,
        processes: selectedProcesses,
        fabricCuts: scannedFabricCuts,
        totalFabricCuts: scannedFabricCuts.length,
        totalQuantity,
        vehicleNumber,
        deliveryDate,
        deliveredBy,
        status: 'sent',
        createdAt: new Date().toISOString(),
        orderDetails: {
        orderNumber: orderDetails?.orderNumber || null,
        designNumber: orderDetails?.designNumber || null,
        designName: orderDetails?.designName || null
        }
      };

      await axios.post(buildApiUrl('processing-orders'), orderData);
      
      setSuccessMessage(`Processing order ${orderFormNumber} created successfully!`);
      setConfirmDialogOpen(true);

    } catch (error) {
      console.error('Error submitting processing order:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to create processing order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmClose = () => {
    setConfirmDialogOpen(false);
    if (onClose) {
      onClose();
    } else {
      navigate('/processing/send');
    }
  };

  const handlePrintOrder = () => {
    try {
      // Create order data for printing
      const orderData = {
        orderFormNumber,
        qrCode: qrCodeDataUrl,
        processingCenter: getSelectedProcessingCenterName(),
        processingCenterId: selectedProcessingCenter,
        processes: selectedProcesses,
        fabricCuts: scannedFabricCuts,
        totalFabricCuts: scannedFabricCuts.length,
        totalQuantity,
        vehicleNumber,
        deliveryDate,
        status: 'sent',
        createdAt: new Date().toISOString(),
        // Include order details
        orderNumber: orderDetails?.orderNumber || null,
        designNumber: orderDetails?.designNumber || null,
        designName: orderDetails?.designName || null
      };

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      
      // Generate the processing order HTML
      const orderHTML = generateProcessingOrderHTML(orderData);
      
      printWindow.document.write(orderHTML);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error) {
      console.error('Error printing processing order:', error);
      setErrorMessage('Failed to print processing order. Please try again.');
    }
  };

  const formatProcesses = (processes) => {
    if (!processes || processes.length === 0) return 'N/A';
    return processes.map(process => availableProcesses.find(p => p.value === process)?.label || process).join(', ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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

          ${order.orderNumber ? `
          <div class="info-section">
            <div class="info-card">
              <div class="info-title">📦 Order & Design Details</div>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Design Number:</strong> ${order.designNumber || 'N/A'}</p>
              <p><strong>Design Name:</strong> ${order.designName || 'N/A'}</p>
            </div>
          </div>
          ` : ''}

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

  const getSelectedProcessingCenterName = () => {
    const center = processingCenters.find(c => c.id === selectedProcessingCenter);
    return center ? center.name : '';
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Order Form Number"
                  variant="outlined"
                  value={orderFormNumber}
                  disabled
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="textSecondary">
                  This number is automatically generated and will be embedded in the QR code
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>QR Code</Typography>
                  {qrCodeDataUrl && (
                    <img src={qrCodeDataUrl} alt="Order Form QR Code" style={{ maxWidth: '200px' }} />
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Processing Center *</InputLabel>
                  <Select
                    value={selectedProcessingCenter}
                    label="Processing Center *"
                    onChange={(e) => setSelectedProcessingCenter(e.target.value)}
                  >
                    {processingCenters.map((center) => (
                      <MenuItem key={center.id} value={center.id}>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {center.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {center.address}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Processes *</InputLabel>
                  <Select
                    multiple
                    value={selectedProcesses}
                    onChange={handleProcessChange}
                    input={<OutlinedInput label="Processes *" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const process = availableProcesses.find(p => p.value === value);
                          return (
                            <Chip key={value} label={process?.label || value} size="small" />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {availableProcesses.map((process) => (
                      <MenuItem key={process.value} value={process.value}>
                        <Checkbox checked={selectedProcesses.indexOf(process.value) > -1} />
                        <ListItemText primary={process.label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Select one or more processes for this order
                </Typography>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <QrCodeScannerIcon sx={{ mr: 1 }} />
                  Scan Fabric Cuts
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📱 Scanning Requirements:
                  </Typography>
                  <Typography variant="body2" component="div">
                    • ✅ Each fabric cut can only be scanned <strong>once per order</strong><br/>
                    • ✅ Fabric cut must have completed <strong>4-point inspection</strong><br/>
                    • ✅ Cannot reuse fabric cuts from other processing orders<br/>
                    • 📝 Format: W1/01, W2/05, etc.
                  </Typography>
                </Alert>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Fabric Cut Number"
                    variant="outlined"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Enter fabric cut number or scan QR code"
                    onKeyPress={(e) => e.key === 'Enter' && handleScanFabricCut()}
                    error={!!scanError}
                    helperText={scanError || `${scannedFabricCuts.length}/50 fabric cuts added`}
                    disabled={isScanning}
                  />
                  <Button
                    variant="contained"
                    onClick={handleScanFabricCut}
                    startIcon={isScanning ? <CircularProgress size={20} color="inherit" /> : <QrCodeScannerIcon />}
                    sx={{ minWidth: 120 }}
                    disabled={!scanInput.trim() || scannedFabricCuts.length >= 50 || isScanning}
                  >
                    {isScanning ? 'Adding...' : 'Add'}
                  </Button>
                </Box>
                
                {successMessage && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {successMessage}
                  </Alert>
                )}
                
                {/* Order Details Display */}
                {orderDetails && (
                  <Card sx={{ mb: 3, bgcolor: '#e3f2fd', border: '2px solid #1976d2' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1976d2', fontWeight: 'bold' }}>
                        📋 Order & Design Details
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                            <Typography variant="body2" color="textSecondary">Order Number</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                              {orderDetails.orderNumber}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                            <Typography variant="body2" color="textSecondary">Design Number</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                              {orderDetails.designNumber || 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2 }}>
                            <Typography variant="body2" color="textSecondary">Design Name</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                              {orderDetails.designName || 'N/A'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Note:</strong> All fabric cuts in this processing order must belong to the same order number: <strong>{orderDetails.orderNumber}</strong>
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                    Total Fabric Cuts: {scannedFabricCuts.length}
                  </Typography>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                    Total Quantity: {totalQuantity.toFixed(2)}m
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {scannedFabricCuts.length > 0 && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Fabric Cut Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Warp Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Order Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Design Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Design Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Inspected Quantity (m)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scannedFabricCuts.map((cut, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                          {cut.fabricNumber}
                        </TableCell>
                        <TableCell>{cut.warpNumber}</TableCell>
                        <TableCell sx={{ color: '#9C27B0' }}>{cut.orderNumber}</TableCell>
                        <TableCell sx={{ color: '#FF9800' }}>{cut.designNumber}</TableCell>
                        <TableCell sx={{ color: '#795548' }}>{cut.designName}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                          {cut.inspectedQuantity?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Remove from list">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleRemoveFabricCut(cut.fabricNumber)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Vehicle Number *"
                  variant="outlined"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g., TN01AB1234"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Delivery Date *"
                  type="date"
                  variant="outlined"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Delivered By"
                  placeholder="Enter the name of the delivery person"
                  variant="outlined"
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: '#1976d2' }}>
              Review Processing Order Details
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Order Information</Typography>
                    <Typography><strong>Order Form Number:</strong> {orderFormNumber}</Typography>
                    <Typography><strong>Processing Center:</strong> {getSelectedProcessingCenterName()}</Typography>
                    <Typography><strong>Processes:</strong> {selectedProcesses.map(p => availableProcesses.find(ap => ap.value === p)?.label).join(', ')}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Delivery Information</Typography>
                    <Typography><strong>Vehicle Number:</strong> {vehicleNumber}</Typography>
                    <Typography><strong>Delivery Date:</strong> {new Date(deliveryDate).toLocaleDateString()}</Typography>
                    <Typography><strong>Total Fabric Cuts:</strong> {scannedFabricCuts.length}</Typography>
                    <Typography><strong>Total Quantity:</strong> {totalQuantity.toFixed(2)}m</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
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
            <AssignmentIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              Create Processing Order Form
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {orderFormNumber || 'Generating order form number...'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => onClose ? onClose() : navigate('/processing/send')}
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Back to List
          </Button>
        </Box>
      </Box>

      {/* Alert Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Stepper */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Form Content */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          {renderStepContent()}
        </CardContent>

        {/* Navigation Buttons */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          p: 3,
          borderTop: '1px solid #dee2e6'
        }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isSubmitting}
                startIcon={<SaveIcon />}
                sx={{ 
                  background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                  minWidth: 200
                }}
              >
                {isSubmitting ? 'Creating Order...' : 'Create Processing Order'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ minWidth: 120 }}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleConfirmClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#4caf50', fontWeight: 'bold' }}>
          Processing Order Created Successfully!
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Your processing order has been created with the following details:
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2"><strong>Order Form Number:</strong> {orderFormNumber}</Typography>
            <Typography variant="body2"><strong>Processing Center:</strong> {getSelectedProcessingCenterName()}</Typography>
            <Typography variant="body2"><strong>Total Fabric Cuts:</strong> {scannedFabricCuts.length}</Typography>
            <Typography variant="body2"><strong>Total Quantity:</strong> {totalQuantity.toFixed(2)}m</Typography>
            <Typography variant="body2"><strong>Delivery Date:</strong> {deliveryDate}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handlePrintOrder}
            variant="outlined"
            startIcon={<PrintIcon />}
            sx={{ 
              borderColor: '#4caf50',
              color: '#4caf50',
              '&:hover': { 
                borderColor: '#45a049',
                backgroundColor: 'rgba(76, 175, 80, 0.04)' 
              }
            }}
          >
            🖨️ Print Order Form
          </Button>
          <Button 
            onClick={handleConfirmClose}
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)' }}
          >
            Return to Processing Orders
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ProcessingOrderForm; 