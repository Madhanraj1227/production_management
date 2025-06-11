import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Print as PrintIcon, 
  FilterList as FilterListIcon, 
  Clear as ClearIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function FabricCutList() {
  const navigate = useNavigate();
  const [fabricCuts, setFabricCuts] = useState([]);
  const [uniqueWarps, setUniqueWarps] = useState([]);
  const [selectedWarp, setSelectedWarp] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit dialog states
  const [editDialog, setEditDialog] = useState(false);
  const [editingCut, setEditingCut] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  
  // Delete dialog states
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingCut, setDeletingCut] = useState(null);

  // Removed invoice status tracking as it's no longer needed

  // Helper function to format Firebase timestamps
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      let date;
      if (timestamp._seconds) {
        // Firebase timestamp with _seconds and _nanoseconds
        date = new Date(timestamp._seconds * 1000);
      } else if (timestamp.seconds) {
        // Firebase timestamp with seconds and nanoseconds
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        // Regular timestamp
        date = new Date(timestamp);
      } else {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Function to check if editing is disabled for a fabric cut
  // Note: Simplified since we removed invoice status tracking
  const isEditingDisabled = (fabricCut) => {
    // For now, allow editing of all fabric cuts
    // This can be re-enabled later if needed
    return false;
  };

  // Fetch fabric cuts data using optimized endpoint
  const fetchFabricCuts = async (warpFilter = '', dateFilter = '') => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching fabric cuts with optimization...');
      
      let url = buildApiUrl('fabric-cuts/optimized');
      const params = new URLSearchParams();
      
      if (warpFilter) {
        // Find the warp ID for the selected warp number (exact match)
        const selectedWarpData = uniqueWarps.find(w => w.warpNumber === warpFilter);
        if (selectedWarpData) {
          console.log('🔍 Filtering by warp:', warpFilter, 'ID:', selectedWarpData.id);
          params.append('warpId', selectedWarpData.id);
        } else {
          console.warn('⚠️ Warp not found for filter:', warpFilter);
        }
      }
      
      if (dateFilter) {
        params.append('date', dateFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      console.log('Fabric cuts data received:', response.data);
      
      // The optimized endpoint returns a direct array of fabric cuts
      const fabricCutsData = response.data;
      
      // Debug: Check for duplicates
      const fabricNumbers = fabricCutsData.map(cut => cut.fabricNumber);
      const uniqueFabricNumbers = new Set(fabricNumbers);
      if (fabricNumbers.length !== uniqueFabricNumbers.size) {
        console.warn('⚠️ Duplicate fabric cuts detected:', fabricNumbers.length, 'total vs', uniqueFabricNumbers.size, 'unique');
        
        // Remove duplicates - keep the most recent one (by createdAt)
        const deduplicatedData = [];
        const seenFabricNumbers = new Map();
        
        // Sort by createdAt descending first
        const sortedData = [...fabricCutsData].sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        sortedData.forEach(cut => {
          if (!seenFabricNumbers.has(cut.fabricNumber)) {
            seenFabricNumbers.set(cut.fabricNumber, true);
            deduplicatedData.push(cut);
          } else {
            console.log('🗑️ Removing duplicate:', cut.fabricNumber, 'ID:', cut.id);
          }
        });
        
        setFabricCuts(deduplicatedData);
        console.log('✅ Deduplicated:', deduplicatedData.length, 'fabric cuts');
      } else {
        setFabricCuts(fabricCutsData);
      }
      
      // Extract unique warps from the fabric cuts data
      const warpsMap = new Map();
      fabricCutsData.forEach(cut => {
        if (cut.warp && cut.warp.id) {
          const warpNumber = cut.warp.warpNumber || cut.warp.warpOrderNumber || 'N/A';
          // Only add if warpNumber is valid (not 'N/A') and unique
          if (warpNumber !== 'N/A') {
            warpsMap.set(cut.warp.id, {
              id: cut.warp.id,
              warpNumber: warpNumber,
              orderNumber: cut.warp.order?.orderNumber || cut.warp.order?.orderName || 'N/A',
              designName: cut.warp.order?.designName || 'N/A',
              designNumber: cut.warp.order?.designNumber || 'N/A',
              loomName: cut.warp.loom?.loomName || 'N/A',
              companyName: cut.warp.loom?.companyName || 'N/A',
              quantity: cut.warp.quantity || 0
            });
          }
        }
      });
      
      // Sort the unique warps by warpNumber for better UX
      const sortedWarps = Array.from(warpsMap.values()).sort((a, b) => {
        return a.warpNumber.localeCompare(b.warpNumber, undefined, { numeric: true });
      });
      setUniqueWarps(sortedWarps);

      // Invoice status checking removed for performance
    } catch (error) {
      console.error('Error fetching fabric cuts:', error);
      setError('Failed to load fabric cuts data. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFabricCuts(selectedWarp, selectedDate);

    // Clean up function (invoice event listener removed)
  }, []);

  // Handle warp filter change with server-side filtering
  const handleWarpFilterChange = (warpOrderNumber) => {
    setSelectedWarp(warpOrderNumber);
    fetchFabricCuts(warpOrderNumber, selectedDate);
  };

  // Handle date filter change
  const handleDateFilterChange = (date) => {
    setSelectedDate(date);
    fetchFabricCuts(selectedWarp, date);
  };

  const handleClearFilter = () => {
    setSelectedWarp('');
    setSelectedDate('');
    fetchFabricCuts('', '');
  };

  // Calculate statistics for current fabric cuts
  const totalCuts = fabricCuts.length;
  const totalProduction = fabricCuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0);
  const selectedWarpData = uniqueWarps.find(w => w.warpNumber === selectedWarp);

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
                  <span class="value">${cut.warp?.order?.orderNumber || cut.warp?.order?.orderName || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Warp:</span>
                  <span class="value">${cut.warp?.warpNumber || cut.warp?.warpOrderNumber || cut.fabricNumber.split('-')[0]}</span>
                </div>
                <div class="info-row">
                  <span class="label">Loom:</span>
                  <span class="value">${cut.loomName || cut.warp?.loom?.loomName || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Design:</span>
                  <span class="value">${cut.warp?.order?.designName || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Design No:</span>
                  <span class="value">${cut.warp?.order?.designNumber || 'N/A'}</span>
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

  // Handle opening edit dialog
  const handleEditClick = (cut) => {
    setEditingCut(cut);
    setNewQuantity(cut.quantity.toString());
    setEditDialog(true);
  };

  // Handle closing edit dialog
  const handleEditClose = () => {
    setEditDialog(false);
    setEditingCut(null);
    setNewQuantity('');
  };

  // Handle updating quantity
  const handleUpdateQuantity = async () => {
    if (!editingCut || !newQuantity || parseInt(newQuantity) <= 0) {
      return;
    }

    try {
              const response = await fetch(buildApiUrl(`fabric-cuts/${editingCut.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: parseInt(newQuantity) })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Dispatch custom event if the update affects loom-in history
        if (result.affectsLoomInHistory) {
          window.dispatchEvent(new CustomEvent('fabricCutUpdated', {
            detail: {
              id: editingCut.id,
              affectsLoomInHistory: true,
              fabricNumber: editingCut.fabricNumber,
              oldQuantity: editingCut.quantity,
              newQuantity: parseInt(newQuantity)
            }
          }));
        }
        
        // Refresh the data instead of manual state updates
        await fetchFabricCuts(selectedWarp, selectedDate);
        handleEditClose();
      } else {
        setError('Failed to update fabric cut quantity');
      }
    } catch (err) {
      setError('Error updating fabric cut: ' + err.message);
    }
  };

  // Handle opening delete dialog
  const handleDeleteClick = (cut) => {
    if (isEditingDisabled(cut)) {
      alert('Deletion is disabled because a job work wages invoice has been submitted for this warp. Please delete the invoice first to enable deletion.');
      return;
    }
    setDeletingCut(cut);
    setDeleteDialog(true);
  };

  // Handle closing delete dialog
  const handleDeleteClose = () => {
    setDeleteDialog(false);
    setDeletingCut(null);
  };

  // Handle deleting fabric cut
  const handleDeleteConfirm = async () => {
    if (!deletingCut) return;

    try {
              const response = await fetch(buildApiUrl(`fabric-cuts/${deletingCut.id}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        
        // Dispatch custom event if the deletion affects loom-in history
        if (result.wasInLoomInHistory) {
          window.dispatchEvent(new CustomEvent('fabricCutDeleted', {
            detail: {
              id: deletingCut.id,
              wasInLoomInHistory: true,
              fabricNumber: deletingCut.fabricNumber
            }
          }));
        }
        
        // Refresh the data instead of manual state updates
        await fetchFabricCuts(selectedWarp, selectedDate);
        handleDeleteClose();
      } else {
        setError('Failed to delete fabric cut');
      }
    } catch (err) {
      setError('Error deleting fabric cut: ' + err.message);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Fabric Cuts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/fabric-cuts/new')}
        >
          New Fabric Cut
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filter Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FilterListIcon color="action" />
            <Typography variant="h6">Filters</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel>Filter by Warp Order</InputLabel>
              <Select
                value={selectedWarp}
                label="Filter by Warp Order"
                onChange={(e) => handleWarpFilterChange(e.target.value)}
              >
                <MenuItem value="">All Warps</MenuItem>
                {uniqueWarps.map((warp) => (
                  <MenuItem key={warp.warpNumber} value={warp.warpNumber}>
                    {warp.warpNumber}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="Filter by Date"
              value={selectedDate}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ minWidth: 200, flex: 1 }}
            />
            {(selectedWarp || selectedDate) && (
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearFilter}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Production Summary */}
      {selectedWarp && selectedWarpData && (
        <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="primary">
                Production Summary for {selectedWarp}
              </Typography>

            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {totalCuts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Cuts
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {totalProduction.toFixed(1)}m
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Production
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={1.8}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedWarpData.orderNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Order Number
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={1.8}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedWarpData.designName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Design Name
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={1.8}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedWarpData.designNumber || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Design Number
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={1.8}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedWarpData.companyName} {selectedWarpData.loomName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Loom Details
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={1.8}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" fontWeight="bold" color="info.main">
                    {selectedWarpData.quantity || 0}m
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Warp Quantity
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body1" color="text.secondary">
          {(selectedWarp || selectedDate) ? 
            `Showing ${totalCuts} cuts${selectedWarp ? ` for ${selectedWarp}` : ''}${selectedDate ? ` on ${new Date(selectedDate).toLocaleDateString()}` : ''} (${totalProduction.toFixed(1)}m total)` :
            `Showing all ${totalCuts} fabric cuts (${totalProduction.toFixed(1)}m total)`
          }
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {selectedWarp && (
            <Chip 
              label={`Warp: ${selectedWarp}`} 
              onDelete={() => {
                setSelectedWarp('');
                fetchFabricCuts('', selectedDate);
              }}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          {selectedDate && (
            <Chip 
              label={`Date: ${new Date(selectedDate).toLocaleDateString()}`} 
              onDelete={() => {
                setSelectedDate('');
                fetchFabricCuts(selectedWarp, '');
              }}
              color="secondary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : fabricCuts.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {(selectedWarp || selectedDate) ? 
            `No fabric cuts found${selectedWarp ? ` for ${selectedWarp}` : ''}${selectedDate ? ` on ${new Date(selectedDate).toLocaleDateString()}` : ''}` : 
            'No fabric cuts found. Click "New Fabric Cut" to create your first fabric cut.'
          }
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fabric Number</TableCell>
                <TableCell>Cut Info</TableCell>
                <TableCell>Warp Details</TableCell>
                <TableCell>Order Details</TableCell>
                <TableCell>Quantity (meters)</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>QR Code</TableCell>
                <TableCell>Loom-In</TableCell>
                <TableCell>4PT</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fabricCuts.map((cut) => (
                <TableRow key={cut.id}>
                  <TableCell>{cut.fabricNumber}</TableCell>
                  <TableCell>
                    {cut.cutNumber && cut.totalCuts ? (
                      <Chip 
                        label={`${cut.cutNumber} of ${cut.totalCuts}`} 
                        size="small" 
                        variant="outlined"
                      />
                    ) : (
                      'Single Cut'
                    )}
                  </TableCell>
                  <TableCell>
                    {cut.warp ? (
                      <>
                        <strong>{cut.warp.warpNumber || cut.warp.warpOrderNumber || 'N/A'}</strong><br/>
                        {(cut.loomName || cut.companyName || cut.warp.loom) && (
                          <>
                            <small>Loom: {cut.loomName || cut.warp.loom?.loomName || 'N/A'}</small><br/>
                            <small>Company: {cut.companyName || cut.warp.loom?.companyName || 'N/A'}</small>
                          </>
                        )}
                      </>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {cut.warp && cut.warp.order ? (
                      <>
                        <strong>{cut.warp.order.orderNumber || cut.warp.order.orderName || 'N/A'}</strong><br/>
                        <small>{cut.warp.order.designName}</small><br/>
                        <small>Design: {cut.warp.order.designNumber}</small>
                      </>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>{cut.quantity}</TableCell>
                  <TableCell>
                    {formatDate(cut.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outlined" 
                      size="small"
                      startIcon={<PrintIcon />}
                      onClick={() => handlePrint(cut)}
                    >
                      Print QR
                    </Button>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // Debug: Check what fields are available for loom-in status
                      const hasInspectionArrival = cut.inspectionArrival;
                      const hasArrivalTime = cut.arrivalTime;
                      const hasInspectionData = cut.inspectionArrival || cut.arrivalTime;
                      
                      console.log(`🔍 Fabric ${cut.fabricNumber}:`, {
                        inspectionArrival: hasInspectionArrival,
                        arrivalTime: hasArrivalTime,
                        hasInspectionData: hasInspectionData
                      });
                      
                      if (hasInspectionData) {
                        return <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />;
                      } else {
                        return <CancelIcon color="error" sx={{ fontSize: 20 }} />;
                      }
                    })()}
                  </TableCell>
                  <TableCell>
                    {cut.scannedAt4Point ? (
                      <CheckCircleIcon style={{ color: 'green' }} />
                    ) : (
                      <CancelIcon style={{ color: 'red' }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      color="primary" 
                      size="small"
                      onClick={() => handleEditClick(cut)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    
                    <IconButton 
                      color="error" 
                      size="small"
                      onClick={() => handleDeleteClick(cut)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Quantity Dialog */}
      <Dialog open={editDialog} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Fabric Cut Quantity</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fabric Number: {editingCut?.fabricNumber}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Quantity (meters)"
            type="number"
            fullWidth
            variant="outlined"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button 
            onClick={handleUpdateQuantity}
            variant="contained"
            disabled={!newQuantity || parseInt(newQuantity) <= 0}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={handleDeleteClose} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Fabric Cut</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete fabric cut <strong>{deletingCut?.fabricNumber}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default FabricCutList; 