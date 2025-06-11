import React, { useState, useRef, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import ChecklistIcon from '@mui/icons-material/Checklist';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { buildApiUrl } from '../config/api';

const mistakeOptions = [
  'MISSED ENDS',
  'TEMPER YARN CUT', 
  'REED DRAWING MISTAKE',
  'DOUBLE ENDS',
  'END DRAWING MISTAKE',
  'REED GAP',
  'THICK REED',
  'THICK ENDS',
  'SHRINKED ENDS',
  'DOBBY MISTAKE',
  'REED MISTAKE',
  'WRONG COLOURED ENDS',
  'CONTINUE FLOATS',
  'TWILL SIDE MISTAKE',
  'DOUBLE PICK',
  'WEFT DESIGN MISTAKE',
  'THICK PLACE',
  'GAP PLACE',
  'SHRINKED YARN',
  'SHORT PICK',
  'MORE PICK',
  'LESS PICK',
  'COLOUR STREAKS',
  'HOLES',
  'THIRAI',
  'COLOUR PATTAI',
  'EXTRA YARN',
  'LESS SHRINK',
  'FACE SIDE MISTAKE',
  'PICK UNEVEN',
  'COLOUR CONE PLACEMENT CHANGE',
  'FLOAT',
  'OIL STAIN',
  'STRAIN'
];

const dummyInspectors = [
  'Inspector A',
  'Inspector B', 
  'Inspector C',
  'Inspector D',
  'Inspector E'
];

function FourPointInspection() {
  const [step, setStep] = useState('scan'); // scan, details, inspection
  const [qrScanning, setQrScanning] = useState(false);
  const [fabricData, setFabricData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form data
  const [inspectedQuantity, setInspectedQuantity] = useState('');
  const [mistakeQuantity, setMistakeQuantity] = useState('');
  const [selectedMistakes, setSelectedMistakes] = useState([]);
  const [inspector1, setInspector1] = useState('');
  const [inspector2, setInspector2] = useState('');
  
  const scannerRef = useRef(null);

  // Recalculate actual quantity safely
  const actualQuantity = (parseFloat(inspectedQuantity) || 0) - (parseFloat(mistakeQuantity) || 0);

  const startQRScan = () => {
    setQrScanning(true);
    setError('');
    
    // Add a small delay to ensure DOM element is rendered
    setTimeout(() => {
      try {
        const qrReaderElement = document.getElementById("qr-reader");
        if (!qrReaderElement) {
          setError('Camera interface not ready. Please try again.');
          setQrScanning(false);
          return;
        }

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
          },
          false
        );

        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
      } catch (error) {
        console.error('Error initializing QR scanner:', error);
        setError('Failed to initialize camera. Please check camera permissions.');
        setQrScanning(false);
      }
    }, 100);
  };

  const onScanSuccess = async (decodedText) => {
    stopScanning();
    
    if (!decodedText || decodedText.trim() === '') {
      setError('Invalid QR code. Please try scanning again.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Scanning QR code:', decodedText);
      
      // Check if fabric cut exists and is scanned at loom-in
      const response = await fetch(buildApiUrl(`fabric-cuts/by-qr/${encodeURIComponent(decodedText.trim())}`));
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Fabric cut not found in database');
        } else if (response.status === 400) {
          // Handle already inspected error
          const errorData = await response.json();
          if (errorData.error === 'ALREADY_INSPECTED') {
            const inspectionDate = errorData.inspectionDate ? 
              new Date(errorData.inspectionDate).toLocaleDateString() : 'Unknown date';
            throw new Error(`This fabric cut (${errorData.fabricNumber}) has already been inspected with 4-Point Inspection on ${inspectionDate}`);
          }
          throw new Error(errorData.message || 'Invalid fabric cut');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      const fabricCut = await response.json();
      
      if (!fabricCut) {
        throw new Error('No fabric cut data received');
      }
      
      // Check if loom-in is scanned
      if (!fabricCut.inspectionArrival) {
        setError('Fabric not scanned at Loom-In. Please scan at Loom-In first.');
        setStep('scan');
        return;
      }
      
      setFabricData(fabricCut);
      setStep('details');
      setSuccess('Fabric cut found and verified!');
      
    } catch (error) {
      console.error('Error verifying fabric cut:', error);
      setError('Error: ' + error.message);
      setStep('scan');
    } finally {
      setLoading(false);
    }
  };

  const onScanFailure = (error) => {
    // Only log actual errors, not routine scanning attempts
    if (error && !error.includes('No MultiFormat Readers')) {
      console.warn(`QR scan error: ${error}`);
    }
  };

  const stopScanning = () => {
    setQrScanning(false);
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.log('Error stopping scanner:', error);
      }
    }
  };

  const handleMistakeChange = (event) => {
    const value = event.target.value;
    setSelectedMistakes(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    console.log('=== FRONTEND INSPECTION SUBMISSION DEBUG ===');
    console.log('fabricData:', fabricData);
    console.log('inspectedQuantity:', inspectedQuantity);
    console.log('mistakeQuantity:', mistakeQuantity);
    console.log('inspector1:', inspector1);
    console.log('inspector2:', inspector2);
    console.log('selectedMistakes:', selectedMistakes);

    if (!fabricData) {
      setError('Please scan a fabric QR code first.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const inspectionData = {
        fabricCutId: fabricData.id,
        inspectionType: '4-point',
        originalQuantity: parseFloat(fabricData.quantity) || 0,
        inspectedQuantity: parseFloat(inspectedQuantity) || 0,
        mistakeQuantity: parseFloat(mistakeQuantity) || 0,
        actualQuantity: actualQuantity,
        mistakes: selectedMistakes,
        inspectors: [inspector1, inspector2].filter(Boolean), // Remove empty inspector fields
        inspectionDate: new Date().toISOString(),
        status: 'completed'
      };

      console.log('Final inspection data being sent:', JSON.stringify(inspectionData, null, 2));

      const response = await fetch(buildApiUrl('inspections'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inspectionData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to create inspection';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.log('Parsed error data:', errorData);
        } catch (parseError) {
          console.log('Failed to parse error response as JSON:', parseError);
          errorMessage = responseText || errorMessage;
        }
        throw new Error(`Server Error ${response.status}: ${errorMessage}`);
      }

      const result = JSON.parse(responseText);
      console.log('Success response:', result);

      setSuccess('4-Point inspection completed successfully!');
      
      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
      }, 3000);

    } catch (error) {
      console.error('Error saving inspection:', error);
      setError('Error saving inspection: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('scan');
    setFabricData(null);
    setInspectedQuantity('');
    setMistakeQuantity('');
    setSelectedMistakes([]);
    setInspector1('');
    setInspector2('');
    setError('');
    setSuccess('');
  };

  // Cleanup scanner on component unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (error) {
          console.log('Scanner cleanup error:', error);
        }
      }
    };
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <ChecklistIcon sx={{ mr: 2, fontSize: { xs: 28, sm: 32 }, color: '#8B0000' }} />
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            color: '#8B0000', 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          4-Point Inspection
        </Typography>
      </Box>

      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Step 1: QR Scanning */}
      {step === 'scan' && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ textAlign: 'center' }}>
            <QrCodeScannerIcon sx={{ fontSize: 64, color: '#8B0000', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Scan Fabric QR Code
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Scan the QR code on the fabric cut to verify it's been processed at Loom-In
            </Typography>
            
            {!qrScanning ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<CameraAltIcon />}
                onClick={startQRScan}
                sx={{ 
                  backgroundColor: '#8B0000',
                  '&:hover': { backgroundColor: '#A00000' },
                  mb: 2
                }}
              >
                Start Scanning
              </Button>
            ) : (
              <Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Point your camera at the QR code
                </Typography>
                <div id="qr-reader" style={{ margin: '0 auto' }}></div>
                <Button 
                  onClick={stopScanning}
                  sx={{ mt: 2 }}
                  variant="outlined"
                >
                  Cancel Scan
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Step 2: Fabric Details */}
      {step === 'details' && fabricData && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#8B0000' }}>
            Fabric Details
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary">Fabric Number</Typography>
                  <Typography variant="body1" fontWeight="bold">{fabricData.fabricNumber}</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
                              <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">Warp Number</Typography>
                    <Typography variant="body1" fontWeight="bold">{fabricData.warp?.warpOrderNumber || fabricData.warpNumber || 'N/A'}</Typography>
                  </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
                              <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">Order Number</Typography>
                    <Typography variant="body1" fontWeight="bold">{fabricData.warp?.order?.orderNumber || fabricData.orderNumber || 'N/A'}</Typography>
                  </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
                              <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">Design Name</Typography>
                    <Typography variant="body1" fontWeight="bold">{fabricData.warp?.order?.designName || fabricData.designName || 'N/A'}</Typography>
                  </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
                              <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">Design Number</Typography>
                    <Typography variant="body1" fontWeight="bold">{fabricData.warp?.order?.designNumber || fabricData.designNumber || 'N/A'}</Typography>
                  </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
                              <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">Loom-In Date</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {fabricData.inspectionArrival ? 
                        new Date(fabricData.inspectionArrival.seconds ? 
                          fabricData.inspectionArrival.seconds * 1000 : 
                          fabricData.inspectionArrival
                        ).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
                              <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">Loom Number</Typography>
                    <Typography variant="body1" fontWeight="bold">{fabricData.warp?.loom?.loomName || fabricData.loomNumber || 'N/A'}</Typography>
                  </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} sm={6}>
                              <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">Company Name</Typography>
                    <Typography variant="body1" fontWeight="bold">{fabricData.warp?.loom?.companyName || fabricData.companyName || 'Ashok Textiles'}</Typography>
                  </CardContent>
                </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              onClick={() => setStep('inspection')}
              sx={{ 
                backgroundColor: '#8B0000',
                '&:hover': { backgroundColor: '#A00000' }
              }}
            >
              Proceed to Inspection
            </Button>
          </Box>
        </Paper>
      )}

      {/* Step 3: Inspection Form */}
      {step === 'inspection' && fabricData && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#8B0000' }}>
            4-Point Inspection Form
          </Typography>
          
          {/* Quantity Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Quantity Details</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary">Original Quantity</Typography>
                <Typography variant="h6" fontWeight="bold">{fabricData.quantity} meters</Typography>
              </CardContent>
            </Card>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Inspected Quantity"
                  type="number"
                  fullWidth
                  value={inspectedQuantity}
                  onChange={(e) => setInspectedQuantity(e.target.value)}
                  inputProps={{ min: '0', step: '0.01' }}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Mistake Quantity"
                  type="number"
                  fullWidth
                  value={mistakeQuantity}
                  onChange={(e) => setMistakeQuantity(e.target.value)}
                  inputProps={{ min: '0', step: '0.01' }}
                  required
                />
              </Grid>
            </Grid>
            
            <TextField
              label="Actual Quantity"
              type="number"
              fullWidth
              value={actualQuantity}
              InputProps={{
                readOnly: true,
              }}
              sx={{ mb: 2 }}
            />
          </Box>

          {/* Mistakes Section */}
          {parseFloat(mistakeQuantity) > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Mistakes Found</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <FormControl fullWidth>
                <InputLabel>Select Mistakes</InputLabel>
                <Select
                  multiple
                  value={selectedMistakes}
                  onChange={handleMistakeChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {mistakeOptions.map((mistake) => (
                    <MenuItem key={mistake} value={mistake}>
                      {mistake}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Inspectors Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Inspectors</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Inspector 1</InputLabel>
                  <Select
                    value={inspector1}
                    onChange={(e) => setInspector1(e.target.value)}
                  >
                    {dummyInspectors.map((inspector) => (
                      <MenuItem key={inspector} value={inspector}>
                        {inspector}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Inspector 2</InputLabel>
                  <Select
                    value={inspector2}
                    onChange={(e) => setInspector2(e.target.value)}
                  >
                    {dummyInspectors.map((inspector) => (
                      <MenuItem key={inspector} value={inspector}>
                        {inspector}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Submit Section */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              sx={{ 
                backgroundColor: '#8B0000',
                '&:hover': { backgroundColor: '#A00000' },
                minWidth: 200,
                mr: 2
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Inspection'}
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={resetForm}
              sx={{ minWidth: 120 }}
            >
              Reset
            </Button>
          </Box>
        </Paper>
      )}

      {loading && step !== 'inspection' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
}

export default FourPointInspection; 