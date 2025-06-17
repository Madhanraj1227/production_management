import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Alert, Grid, 
  FormControl, InputLabel, Select, MenuItem, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import SendIcon from '@mui/icons-material/Send';
import { buildApiUrl } from '../config/api';
import axios from 'axios';

function MoveFabric({ onMovementCreated }) {
  const [fabricNumber, setFabricNumber] = useState('');
  const [fabricCuts, setFabricCuts] = useState([]);
  const [toLocation, setToLocation] = useState('');
  const [movedBy, setMovedBy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [createdMovement, setCreatedMovement] = useState(null);

  // Dynamic location options based on current fabric cuts locations
  const getAvailableLocations = () => {
    if (fabricCuts.length === 0) return [];
    
    // Get unique current locations
    const currentLocations = [...new Set(fabricCuts.map(cut => cut.location))];
    
    // If all cuts are from the same location, show the other location
    if (currentLocations.length === 1) {
      const currentLocation = currentLocations[0];
      const allLocations = ['Veerapandi', 'Salem'];
      return allLocations.filter(loc => loc !== currentLocation);
    }
    
    // If cuts are from mixed locations (shouldn't happen with only 2 locations), show empty
    return [];
  };

  const availableLocations = getAvailableLocations();

  const searchFabricCut = async () => {
    if (!fabricNumber.trim()) {
      setError('Please enter a fabric cut number');
      return;
    }

    try {
      setSearchLoading(true);
      setError('');
      
      const response = await axios.get(buildApiUrl(`fabric-movements/search/${encodeURIComponent(fabricNumber.trim())}`));
      const fabricData = response.data;

      // Check if already added
      if (fabricCuts.some(cut => cut.fabricNumber === fabricData.fabricNumber)) {
        setError('This fabric cut is already added to the list');
        return;
      }

      // Check if current location allows movement
      if (fabricData.location === 'Salem' && toLocation === 'Salem') {
        setError('Fabric is already at Salem location');
        return;
      }

      setFabricCuts(prev => [...prev, fabricData]);
      setFabricNumber('');
      
      // Reset destination if it becomes invalid due to location conflict
      const newFabricCuts = [...fabricCuts, fabricData];
      const currentLocations = [...new Set(newFabricCuts.map(cut => cut.location))];
      if (currentLocations.includes(toLocation)) {
        setToLocation('');
      }
      
    } catch (err) {
      console.error('Error searching fabric cut:', err);
      if (err.response?.status === 404) {
        setError('Fabric cut not found or not eligible for movement');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message);
      } else {
        setError('Failed to search fabric cut. Please try again.');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const removeFabricCut = (fabricNumber) => {
    const newFabricCuts = fabricCuts.filter(cut => cut.fabricNumber !== fabricNumber);
    setFabricCuts(newFabricCuts);
    
    // Reset destination if no fabric cuts remain or if it becomes invalid
    if (newFabricCuts.length === 0) {
      setToLocation('');
    } else {
      const currentLocations = [...new Set(newFabricCuts.map(cut => cut.location))];
      if (currentLocations.includes(toLocation)) {
        setToLocation('');
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (fabricCuts.length === 0) {
      setError('Please add at least one fabric cut');
      return;
    }

    if (!toLocation) {
      setError('Please select destination location');
      return;
    }

    if (!movedBy.trim()) {
      setError('Please enter who is moving the fabric');
      return;
    }

    // Check if all fabric cuts can be moved to the selected location
    const invalidCuts = fabricCuts.filter(cut => cut.location === toLocation);
    if (invalidCuts.length > 0) {
      setError(`Some fabric cuts are already at ${toLocation}. Please remove them or select a different destination.`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Determine from location (assume all cuts are from the same location for now)
      const fromLocation = fabricCuts[0]?.location || 'Veerapandi';

      const payload = {
        fabricCuts: fabricCuts.map(cut => ({
          fabricNumber: cut.fabricNumber,
          quantity: cut.quantity,
          orderNumber: cut.orderNumber,
          designName: cut.designName,
          designNumber: cut.designNumber,
          warpNumber: cut.warpNumber || cut.processingCenter,
          isProcessingReceived: cut.isProcessingReceived || false,
          currentLocation: cut.location
        })),
        fromLocation,
        toLocation,
        movedBy: movedBy.trim(),
        notes: '' // No notes field
      };

      const response = await axios.post(buildApiUrl('fabric-movements'), payload);
      setCreatedMovement(response.data);
      setPrintDialogOpen(true);

      // Reset form
      setFabricCuts([]);
      setToLocation('');
      setMovedBy('');
      
      onMovementCreated();

    } catch (err) {
      console.error('Error creating movement:', err);
      setError(err.response?.data?.message || 'Failed to create movement order');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printHTML = `
      <html>
        <head>
          <title>Movement Order - ${createdMovement.movementOrderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .details { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .footer { margin-top: 30px; }
            .signature { margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>FABRIC MOVEMENT ORDER</h1>
            <h2>${createdMovement.movementOrderNumber}</h2>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="details">
            <p><strong>From Location:</strong> ${createdMovement.fromLocation}</p>
            <p><strong>To Location:</strong> ${createdMovement.toLocation}</p>
            <p><strong>Moved By:</strong> ${createdMovement.movedBy}</p>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Fabric Number</th>
                <th>Order Number</th>
                <th>Design</th>
                <th>Quantity (m)</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${createdMovement.fabricCuts.map(cut => `
                <tr>
                  <td>${cut.fabricNumber}</td>
                  <td>${cut.orderNumber}</td>
                  <td>${cut.designName} (${cut.designNumber})</td>
                  <td>${cut.quantity}</td>
                  <td>${cut.isProcessingReceived ? 'Processing Received' : 'Original'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Total Fabric Cuts:</strong> ${createdMovement.fabricCuts.length}</p>
            <p><strong>Total Quantity:</strong> ${createdMovement.fabricCuts.reduce((sum, cut) => sum + parseFloat(cut.quantity), 0).toFixed(2)} meters</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Add Fabric Cuts
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Enter Fabric Cut Number"
              value={fabricNumber}
              onChange={(e) => setFabricNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchFabricCut()}
              placeholder="e.g., W1-01, WR/00001/01"
              disabled={searchLoading}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              onClick={searchFabricCut}
              disabled={searchLoading}
              startIcon={searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              fullWidth
            >
              {searchLoading ? 'Searching...' : 'Search & Add'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Fabric Cuts Table */}
      {fabricCuts.length > 0 && (
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6">
              📋 Selected Fabric Cuts ({fabricCuts.length})
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell><strong>Fabric Number</strong></TableCell>
                  <TableCell><strong>Order</strong></TableCell>
                  <TableCell><strong>Design</strong></TableCell>
                  <TableCell><strong>Quantity</strong></TableCell>
                  <TableCell><strong>Current Location</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Action</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fabricCuts.map((cut, index) => (
                  <TableRow key={index}>
                    <TableCell>{cut.fabricNumber}</TableCell>
                    <TableCell>{cut.orderNumber}</TableCell>
                    <TableCell>{cut.designName} ({cut.designNumber})</TableCell>
                    <TableCell>{cut.quantity} m</TableCell>
                    <TableCell>
                      <Chip 
                        label={cut.location} 
                        color="primary" 
                        variant="outlined" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={cut.isProcessingReceived ? 'Processing' : 'Original'} 
                        color={cut.isProcessingReceived ? 'secondary' : 'primary'}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={() => removeFabricCut(cut.fabricNumber)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Movement Details */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🚚 Movement Details
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required disabled={fabricCuts.length === 0}>
              <InputLabel>Destination Location</InputLabel>
              <Select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                label="Destination Location"
              >
                {availableLocations.map(location => (
                  <MenuItem key={location} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {fabricCuts.length === 0 && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Add fabric cuts to see available destinations
              </Typography>
            )}
            {fabricCuts.length > 0 && availableLocations.length > 0 && (
              <Typography variant="caption" color="primary" sx={{ mt: 1 }}>
                Moving from: {[...new Set(fabricCuts.map(cut => cut.location))].join(', ')}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Moved By"
              value={movedBy}
              onChange={(e) => setMovedBy(e.target.value)}
              placeholder="Enter name of person moving fabric"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Submit Button */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={loading || fabricCuts.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          sx={{ px: 4, py: 1.5 }}
        >
          {loading ? 'Creating Movement...' : 'Create Movement Order'}
        </Button>
      </Box>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          ✅ Movement Order Created
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            {createdMovement?.movementOrderNumber}
          </Typography>
          <Typography color="textSecondary" paragraph>
            Your fabric movement order has been created successfully. Would you like to print the movement order form?
          </Typography>
          
          <Alert severity="info">
            The fabric cuts will be available for receiving at the destination location.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>
            Close
          </Button>
          <Button 
            onClick={handlePrint} 
            variant="contained" 
            startIcon={<PrintIcon />}
          >
            Print Order Form
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MoveFabric; 