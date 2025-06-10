import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  IconButton,
  Divider,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function FabricCutForm() {
  const navigate = useNavigate();
  const [warps, setWarps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedWarp, setSelectedWarp] = useState('');
  const [selectedWarpData, setSelectedWarpData] = useState(null);

  const [numberOfCuts, setNumberOfCuts] = useState(1);
  const [fabricCuts, setFabricCuts] = useState([{ quantity: '' }]);
  const [generatedCuts, setGeneratedCuts] = useState([]);
  const [existingFabricCuts, setExistingFabricCuts] = useState([]);
  const [totalExistingQuantity, setTotalExistingQuantity] = useState(0);

  const steps = ['Select Warp', 'Number of Cuts', 'Enter Quantities', 'Generate QR Codes'];

  useEffect(() => {
    const fetchWarps = async () => {
      try {
        const response = await axios.get(buildApiUrl('warps/active'));
        setWarps(response.data);
      } catch (error) {
        console.error('Error fetching active warps:', error);
      }
    };
    fetchWarps();
  }, []);



  const fetchExistingFabricCuts = async (warpId) => {
    try {
      const response = await axios.get(buildApiUrl(`fabric-cuts/by-warp/${warpId}`));
      setExistingFabricCuts(response.data);
      const totalQuantity = response.data.reduce((sum, cut) => sum + cut.quantity, 0);
      setTotalExistingQuantity(totalQuantity);
    } catch (error) {
      console.error('Error fetching existing fabric cuts:', error);
      setExistingFabricCuts([]);
      setTotalExistingQuantity(0);
    }
  };

  const handleWarpSelect = (warp) => {
    if (warp) {
      setSelectedWarp(warp.id);
      setSelectedWarpData(warp);
      fetchExistingFabricCuts(warp.id);
      setActiveStep(1);
    }
  };

  const handleNumberOfCutsChange = (number) => {
    setNumberOfCuts(number);
    const newFabricCuts = Array.from({ length: number }, (_, i) => 
      fabricCuts[i] || { quantity: '' }
    );
    setFabricCuts(newFabricCuts);
    setActiveStep(2);
  };

  const handleQuantityChange = (index, quantity) => {
    const updatedCuts = [...fabricCuts];
    updatedCuts[index] = { quantity };
    setFabricCuts(updatedCuts);
  };

  // Calculate total of new cuts being added
  const getTotalNewQuantity = () => {
    return fabricCuts.reduce((sum, cut) => sum + (parseFloat(cut.quantity) || 0), 0);
  };

  // Calculate remaining quantity available
  const getRemainingQuantity = () => {
    if (!selectedWarpData) return 0;
    return selectedWarpData.quantity - totalExistingQuantity;
  };

  // Check if total would exceed warp quantity
  const wouldExceedWarpQuantity = () => {
    return getTotalNewQuantity() > getRemainingQuantity();
  };

  const handleGenerateQRCodes = async () => {
    if (wouldExceedWarpQuantity()) {
      alert(`Total quantity would exceed warp capacity. Maximum allowed: ${getRemainingQuantity()}m`);
      return;
    }

    try {
      const response = await axios.post(buildApiUrl('fabric-cuts'), {
        warpId: selectedWarp,
        fabricCuts: fabricCuts.map(cut => ({ quantity: Number(cut.quantity) }))
      });
      
      setGeneratedCuts(response.data.fabricCuts);
      setActiveStep(3);
    } catch (error) {
      console.error('Error creating fabric cuts:', error);
      alert('Error creating fabric cuts. Please try again.');
    }
  };

  const handlePrint = (cut) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Fabric Cut QR Sticker - ${cut.fabricNumber}</title>
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
                <img src="${cut.qrCode}" alt="QR Code" onload="window.qrLoaded = true" />
              </div>
              <div class="info-section">
                <div class="info-row">
                  <span class="label">Order:</span>
                  <span class="value">${cut.qrData?.orderNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Warp:</span>
                  <span class="value">${cut.qrData?.warpNumber || cut.fabricNumber.split('-')[0]}</span>
                </div>
                <div class="info-row">
                  <span class="label">Loom:</span>
                  <span class="value">${cut.qrData?.loomName || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Design:</span>
                  <span class="value">${cut.qrData?.designName || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Design No:</span>
                  <span class="value">${cut.qrData?.designNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Quantity:</span>
                  <span class="value">${cut.quantity}m</span>
                </div>
                <div class="info-row">
                  <span class="label">Fabric No:</span>
                  <span class="value">${cut.fabricNumber}</span>
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
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    const stickersHTML = generatedCuts.map((cut, index) => `
      <div class="sticker">
        <div class="company-name">ASHOK TEXTILES</div>
        <div class="content">
          <div class="qr-section">
            <img src="${cut.qrCode}" alt="QR Code" onload="window.qrLoaded${index} = true" />
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="label">Order:</span>
              <span class="value">${cut.qrData?.orderNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Warp:</span>
              <span class="value">${cut.qrData?.warpNumber || cut.fabricNumber.split('-')[0]}</span>
            </div>
            <div class="info-row">
              <span class="label">Loom:</span>
              <span class="value">${cut.qrData?.loomName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Design:</span>
              <span class="value">${cut.qrData?.designName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Design No:</span>
              <span class="value">${cut.qrData?.designNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Quantity:</span>
              <span class="value">${cut.quantity}m</span>
            </div>
            <div class="info-row">
              <span class="label">Fabric No:</span>
              <span class="value">${cut.fabricNumber}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Fabric Cut QR Stickers</title>
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
            ${generatedCuts.map((_, index) => `window.qrLoaded${index} = false;`).join('\n            ')}
            function waitForAllQRAndPrint() {
              const allLoaded = ${generatedCuts.map((_, index) => `window.qrLoaded${index}`).join(' && ')};
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
    `);
    printWindow.document.close();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Create New Fabric Cuts
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Select Warp */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select an Active Warp
            </Typography>

            <Autocomplete
              fullWidth
              options={warps}
              getOptionLabel={(option) => option.warpOrderNumber || option.warpNumber || 'N/A'}
              value={selectedWarpData}
              onChange={(event, newValue) => handleWarpSelect(newValue)}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue.trim()) return options;
                
                return options.filter(warp => {
                  const warpNumber = (warp.warpNumber || warp.warpOrderNumber || '').toLowerCase();
                  const loomName = (warp.loom?.loomName || '').toLowerCase();
                  const companyName = (warp.loom?.companyName || '').toLowerCase();
                  const orderNumber = (warp.order?.orderNumber || '').toLowerCase();
                  const designName = (warp.order?.designName || '').toLowerCase();
                  const designNumber = (warp.order?.designNumber || '').toLowerCase();
                  
                  const search = inputValue.toLowerCase();
                  
                  return warpNumber.includes(search) || 
                         loomName.includes(search) || 
                         companyName.includes(search) ||
                         orderNumber.includes(search) ||
                         designName.includes(search) ||
                         designNumber.includes(search);
                });
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'block', py: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {option.warpNumber || option.warpOrderNumber || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Order: {option.order?.orderNumber || 'N/A'} - {option.order?.designName || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Loom: {option.loom ? `${option.loom.companyName} - ${option.loom.loomName}` : 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="primary">
                    Quantity: {option.quantity}m
                  </Typography>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search by Warp Number, Loom Name, or Order"
                  placeholder="Enter warp number, loom name, or order details..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Search by warp number, loom name, company, order number, or design name"
                />
              )}
              noOptionsText="No active warps found"
              clearOnBlur={false}
              clearOnEscape
              sx={{ mt: 2 }}
            />

            {warps.length === 0 && (
              <Card sx={{ mt: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <CardContent>
                  <Typography variant="body2">
                    ⚠️ <strong>No active warps available.</strong> Please create warps from active orders first.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {/* Step 2: Number of Cuts */}
        {activeStep === 1 && selectedWarpData && (
          <Box>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selected Warp Details
                </Typography>
                <Typography><strong>Warp:</strong> {selectedWarpData.warpNumber || selectedWarpData.warpOrderNumber || 'N/A'}</Typography>
                <Typography><strong>Order:</strong> {selectedWarpData.order?.orderNumber || 'N/A'} - {selectedWarpData.order?.designName || 'N/A'}</Typography>
                <Typography><strong>Loom:</strong> {selectedWarpData.loom ? `${selectedWarpData.loom.companyName} ${selectedWarpData.loom.loomName}` : 'N/A'}</Typography>
                <Typography><strong>Total Quantity:</strong> {selectedWarpData.quantity}m</Typography>
                <Typography color="primary"><strong>Used Quantity:</strong> {totalExistingQuantity}m</Typography>
                <Typography color="success.main"><strong>Remaining Quantity:</strong> {getRemainingQuantity()}m</Typography>
              </CardContent>
            </Card>

            {existingFabricCuts.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Existing Fabric Cuts ({existingFabricCuts.length} cuts)
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {existingFabricCuts.map((cut, index) => (
                      <Box key={cut.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: index < existingFabricCuts.length - 1 ? '1px solid #eee' : 'none' }}>
                        <Typography variant="body2">{cut.fabricNumber}</Typography>
                        <Typography variant="body2" color="primary">{cut.quantity}m</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ mt: 2, pt: 2, borderTop: '2px solid #ddd' }}>
                    <Typography variant="body1" fontWeight="bold" color="primary">
                      Total: {totalExistingQuantity}m
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
            
            <Typography variant="h6" gutterBottom>
              How many fabric cuts do you want to create?
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => setNumberOfCuts(Math.max(1, numberOfCuts - 1))}>
                <RemoveIcon />
              </IconButton>
              <TextField
                type="number"
                value={numberOfCuts}
                onChange={(e) => setNumberOfCuts(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, max: 50 }}
                sx={{ width: 100 }}
              />
              <IconButton onClick={() => setNumberOfCuts(numberOfCuts + 1)}>
                <AddIcon />
              </IconButton>
            </Box>
            <Button
              variant="contained"
              onClick={() => handleNumberOfCutsChange(numberOfCuts)}
              sx={{ mt: 2 }}
            >
              Continue
            </Button>
          </Box>
        )}

        {/* Step 3: Enter Quantities */}
        {activeStep === 2 && (
          <Box>
            <Card sx={{ mb: 3, bgcolor: wouldExceedWarpQuantity() ? 'error.light' : 'success.light', color: wouldExceedWarpQuantity() ? 'error.contrastText' : 'success.contrastText' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quantity Summary
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Typography><strong>Warp Total:</strong> {selectedWarpData.quantity}m</Typography>
                  <Typography><strong>Already Used:</strong> {totalExistingQuantity}m</Typography>
                  <Typography><strong>Available:</strong> {getRemainingQuantity()}m</Typography>
                  <Typography><strong>New Cuts Total:</strong> {getTotalNewQuantity().toFixed(1)}m</Typography>
                </Box>
                {wouldExceedWarpQuantity() && (
                  <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>
                    ⚠️ Warning: Total exceeds available quantity by {(getTotalNewQuantity() - getRemainingQuantity()).toFixed(1)}m
                  </Typography>
                )}
                {!wouldExceedWarpQuantity() && getTotalNewQuantity() > 0 && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    ✅ Remaining after these cuts: {(getRemainingQuantity() - getTotalNewQuantity()).toFixed(1)}m
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Typography variant="h6" gutterBottom>
              Enter Quantity for Each Fabric Cut
            </Typography>
            <Grid container spacing={2}>
              {fabricCuts.map((cut, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <TextField
                    fullWidth
                    label={`Cut ${index + 1} Quantity (meters)`}
                    type="number"
                    value={cut.quantity}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    required
                    inputProps={{ min: 0.1, step: 0.1, max: getRemainingQuantity() }}
                    error={parseFloat(cut.quantity) > getRemainingQuantity()}
                    helperText={parseFloat(cut.quantity) > getRemainingQuantity() ? `Max: ${getRemainingQuantity()}m` : ''}
                  />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(1)}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleGenerateQRCodes}
                disabled={fabricCuts.some(cut => !cut.quantity || cut.quantity <= 0) || wouldExceedWarpQuantity()}
                color={wouldExceedWarpQuantity() ? 'error' : 'primary'}
              >
                {wouldExceedWarpQuantity() ? 'Exceeds Capacity' : 'Generate QR Codes'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 4: Generated QR Codes */}
        {activeStep === 3 && generatedCuts.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              QR Codes Generated Successfully!
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePrintAll}
                sx={{ mr: 2 }}
              >
                Print All QR Codes
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/fabric-cuts')}
              >
                View All Fabric Cuts
              </Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              {generatedCuts.map((cut, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {cut.fabricNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Cut {cut.cutNumber} of {cut.totalCuts}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Quantity: {cut.quantity}m
                      </Typography>
                      <img 
                        src={cut.qrCode} 
                        alt="QR Code" 
                        style={{ maxWidth: '150px', width: '100%' }} 
                      />
                      <Box sx={{ mt: 2 }}>
                        <IconButton
                          color="primary"
                          onClick={() => handlePrint(cut)}
                          title="Print QR Code"
                        >
                          <PrintIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Navigation buttons for first step */}
        {activeStep === 0 && (
          <Box sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/fabric-cuts')}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default FabricCutForm; 