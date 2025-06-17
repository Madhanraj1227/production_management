import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  Avatar,
  Fade,
  Zoom,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  History as HistoryIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useNavigate } from 'react-router-dom';

function ReceiveFromProcessing() {
  const [scannedCodes, setScannedCodes] = useState([]);
  const [manualEntry, setManualEntry] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [error, setError] = useState('');

  const [allGeneratedCuts, setAllGeneratedCuts] = useState([]); // All fabric cuts with QR generated
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllGeneratedCuts();
    fetchHistory();
    syncProcessingReceipts();
  }, []);

  // Sync processing receipts with processing orders
  const syncProcessingReceipts = async () => {
    try {
      await axios.post(buildApiUrl('processing-receipts/sync'));
      console.log('Processing receipts synchronized');
    } catch (err) {
      console.error('Failed to sync processing receipts:', err);
    }
  };

  // Fetch all sent fabric cuts from processing orders
  const fetchAllGeneratedCuts = async () => {
    try {
      const response = await axios.get(buildApiUrl('processing-orders'));
      const processingOrders = response.data;
      
      // Flatten all fabric cuts from received processing orders
      const allCuts = processingOrders.flatMap(order =>
        (order.receivedFabricCuts || []).map(cut => {
          console.log(`Processing received cut:`, cut);
          
          return {
            originalFabricNumber: cut.originalFabricNumber || 'N/A',
            newFabricNumber: cut.newFabricNumber,
            orderFormNumber: order.orderFormNumber,
            processingOrderId: order.id,
            processingCenter: order.processingCenter,
            orderNumber: order.orderDetails?.orderNumber || order.orderNumber || 'N/A',
            designName: order.orderDetails?.designName || order.designName || 'N/A',
            designNumber: order.orderDetails?.designNumber || order.designNumber || 'N/A',
            quantity: cut.quantity,
            deliveryNumber: cut.deliveryNumber,
            receivedBy: cut.receivedBy,
            location: cut.location
          };
        })
      );
      
      console.log('All received fabric cuts for processing:', allCuts);
      setAllGeneratedCuts(allCuts);
    } catch (err) {
      console.error('Failed to fetch processing orders:', err);
      setError('Failed to fetch processing orders');
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(buildApiUrl('processing-receipts'));
      const receipts = response.data;
      
      setHistoryData(receipts);
      
    } catch (err) {
      console.error('Failed to fetch history data:', err);
      setError('Failed to fetch history data');
    }
  };



  // Compute pending (unreceived) fabric cuts
  const receivedFabricNumbers = historyData.map(r => r.newFabricNumber || r.fabricNumber);
  const pendingCuts = allGeneratedCuts.filter(cut => !receivedFabricNumbers.includes(cut.newFabricNumber));

  // Debug logging
  console.log('All generated cuts:', allGeneratedCuts);
  console.log('Received fabric numbers:', receivedFabricNumbers);
  console.log('Pending cuts:', pendingCuts);



  // --- Validation ---
  const handleScannedCode = (code) => {
    // Accept WR/00001/01 or WR/00001/0001 (5 digits, then 2-4 digits)
    if (!code.match(/^WR\/\d{5}\/\d{2,4}$/)) {
      setError('Invalid QR code format. Expected format: WR/00001/01 or WR/00001/0001');
      return;
    }
    // Check if already scanned
    if (scannedCodes.some(c => c.fabricNumber === code)) {
      setError('This fabric cut has already been scanned');
      return;
    }
    // Check if already received
    if (receivedFabricNumbers.includes(code)) {
      setError('This fabric cut has already been marked as received');
      return;
    }
    // Check if exists in generated cuts
    console.log('Searching for QR code:', code);
    console.log('Available QR codes:', allGeneratedCuts.map(cut => cut.newFabricNumber));
    const cutDetails = allGeneratedCuts.find(cut => cut.newFabricNumber === code);
    if (!cutDetails) {
      setError(`This fabric cut does not exist in generated QR codes. Available: ${allGeneratedCuts.map(cut => cut.newFabricNumber).join(', ')}`);
      return;
    }
    setScannedCodes(prev => [...prev, {
      ...cutDetails,
      scannedAt: new Date().toISOString()
    }]);
    setError('');
  };

  const handleManualEntry = () => {
    if (!manualEntry.trim()) {
      setError('Please enter a fabric number');
      return;
    }
    handleScannedCode(manualEntry.trim());
    setManualEntry('');
  };

  const handleSubmit = async () => {
    if (scannedCodes.length === 0) {
      setError('Please scan at least one fabric cut');
      return;
    }

    try {
      const newReceipts = scannedCodes.map(code => ({
        ...code,
        fabricNumber: code.newFabricNumber,
        receivedAt: code.scannedAt,
        receivedLocation: code.location // Use location from the scanned cut
      }));

      await axios.post(buildApiUrl('processing-receipts'), {
        receipts: newReceipts
      });

      // Clear scanned codes and update history
      setScannedCodes([]);
      await fetchHistory();
      await syncProcessingReceipts();

      // Show success message
      setError('');
      alert(`Successfully marked ${newReceipts.length} fabric cuts as received!`);

    } catch (err) {
      setError('Failed to submit fabric cuts');
    }
  };



  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header Section */}
      <Fade in timeout={800}>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
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
                    <LocalShippingIcon sx={{ fontSize: 36 }} />
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
                    Receive from Processing
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 300 }}>
                    Enter or scan fabric cut numbers to mark as received
                  </Typography>
                </Box>
              </Box>
              <Zoom in timeout={1200}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<HistoryIcon />}
                  onClick={() => navigate('/processing/receive')}
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
                  View History
                </Button>
              </Zoom>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                      Pending Fabric Cuts (QR Generated, Not Yet Received)
                    </Typography>
                    <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {pendingCuts.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                      Scanned for Receiving (This Session)
                    </Typography>
                    <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {scannedCodes.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Fade>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Section: Manual Entry and Scanned List */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<Avatar sx={{ bgcolor: '#764ba2' }}><AssignmentIcon /></Avatar>}
              title="Manual Entry"
              subheader="Enter fabric number manually or scan with your device"
            />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Fabric Number"
                  variant="outlined"
                  value={manualEntry}
                  onChange={(e) => setManualEntry(e.target.value)}
                  placeholder="Enter fabric number (e.g., WR/0001/01)"
                  sx={{ mb: 2 }}
                  onKeyDown={e => { if (e.key === 'Enter') handleManualEntry(); }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleManualEntry}
                  startIcon={<CheckCircleIcon />}
                >
                  Add Fabric Cut
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<Avatar sx={{ bgcolor: '#667eea' }}><LocalShippingIcon /></Avatar>}
              title="Scanned Fabric Cuts (Ready to Submit)"
              subheader="Review and submit the following cuts as received"
            />
            <CardContent>
              {scannedCodes.length === 0 ? (
                <Typography>No fabric cuts scanned yet.</Typography>
              ) : (
                <Box>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Fabric Number</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Order Form</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Processing Center</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Delivery No</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Place</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Order No</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Design</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {scannedCodes.map((cut, idx) => (
                          <TableRow key={cut.fabricNumber}>
                            <TableCell>{cut.newFabricNumber}</TableCell>
                            <TableCell>{cut.orderFormNumber}</TableCell>
                            <TableCell>{cut.processingCenter || '-'}</TableCell>
                            <TableCell>{cut.deliveryNumber || '-'}</TableCell>
                            <TableCell>{cut.location || '-'}</TableCell>
                            <TableCell>{cut.orderNumber}</TableCell>
                            <TableCell>{cut.designName} ({cut.designNumber})</TableCell>
                            <TableCell>{cut.quantity} m</TableCell>
                            <TableCell>
                              <IconButton color="error" onClick={() => setScannedCodes(prev => prev.filter((_, i) => i !== idx))}>
                                <CloseIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleSubmit}
                    disabled={scannedCodes.length === 0}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      py: 1.5,
                      mt: 2
                    }}
                  >
                    Mark as Received
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>


    </Container>
  );
}

export default ReceiveFromProcessing; 