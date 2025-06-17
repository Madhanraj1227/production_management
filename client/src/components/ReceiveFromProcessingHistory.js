import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, Button, Avatar, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, CircularProgress, Fade, Collapse, Tooltip, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, Select, InputLabel, FormControl, Grid
} from '@mui/material';
import {
  History as HistoryIcon, ArrowBack as ArrowBackIcon, FilterList as FilterListIcon,
  Refresh as RefreshIcon, Edit as EditIcon, Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function ReceiveFromProcessingHistory() {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit and Delete state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editFormData, setEditFormData] = useState({
    deliveryNumber: '',
    quantity: '',
    receivedLocation: ''
  });

  const [filters, setFilters] = useState({
    processingOrderForm: '',
    orderNumber: '',
    designNumber: '',
    designName: '',
    processingCenter: '',
    deliveryNumber: ''
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchHistory = useCallback(async (shouldSync = false) => {
    try {
      setLoading(true);
      
      // Sync processing receipts if requested
      if (shouldSync) {
        try {
          await axios.post(buildApiUrl('processing-receipts/sync'));
          console.log('Processing receipts synchronized');
        } catch (syncErr) {
          console.error('Failed to sync processing receipts:', syncErr);
        }
      }
      
      const response = await axios.get(buildApiUrl('processing-receipts'));
      const receipts = response.data;
      
      setHistoryData(receipts);
      console.log('History data loaded:', receipts);
    } catch (err) {
      console.error('Failed to fetch history data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(true); // Sync on initial load
  }, [fetchHistory]);

  const handleEditClick = (receipt) => {
    setSelectedReceipt(receipt);
    setEditFormData({
      deliveryNumber: receipt.deliveryNumber || '',
      quantity: receipt.quantity || '',
      receivedLocation: receipt.receivedLocation || ''
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (receipt) => {
    setSelectedReceipt(receipt);
    setDeleteDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedReceipt(null);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedReceipt(null);
  };

  const handleEditSubmit = async () => {
    if (!selectedReceipt) return;

    try {
      await axios.put(buildApiUrl(`processing-receipts/${selectedReceipt.id}`), editFormData);
      handleEditClose();
      await fetchHistory(true); // Refresh data with sync
    } catch (err) {
      console.error('Error updating receipt:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedReceipt) return;

    try {
      await axios.delete(buildApiUrl(`processing-receipts/${selectedReceipt.id}`));
      handleDeleteClose();
      await fetchHistory(true); // Refresh data with sync
    } catch (err) {
      console.error('Error deleting receipt:', err);
    }
  };
  
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const getFilteredHistory = () => {
    return historyData.filter(receipt => {
      const pof = filters.processingOrderForm;
      const on = filters.orderNumber;
      const dn = filters.designNumber;
      const dna = filters.designName;
      const pc = filters.processingCenter;
      const deln = filters.deliveryNumber;
      
      return (!pof || receipt.orderFormNumber?.toLowerCase().includes(pof.toLowerCase())) &&
             (!on || receipt.orderNumber?.toLowerCase().includes(on.toLowerCase())) &&
             (!dn || receipt.designNumber?.toLowerCase().includes(dn.toLowerCase())) &&
             (!dna || receipt.designName?.toLowerCase().includes(dna.toLowerCase())) &&
             (!pc || receipt.processingCenter?.toLowerCase().includes(pc.toLowerCase())) &&
             (!deln || receipt.deliveryNumber?.toLowerCase().includes(deln.toLowerCase()));
    });
  };

  const filteredHistory = getFilteredHistory();

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Header Section */}
      <Fade in timeout={800}>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          p: 4,
          mb: 4,
          color: 'white',
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', mr: 3, width: 64, height: 64 }}>
                  <HistoryIcon sx={{ fontSize: 36 }} />
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                    Receiving History
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 300 }}>
                    Complete history of received fabric cuts from processing
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/processing/receive/scan')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                Go to Scanning
              </Button>
          </Box>
        </Box>
      </Fade>

      {/* Filter Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Filters</Typography>
          <Box>
            <Button startIcon={<RefreshIcon />} onClick={() => fetchHistory(true)} disabled={loading}>
              Refresh
            </Button>
            <Button
              startIcon={<FilterListIcon />}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
              {filtersOpen ? 'Hide' : 'Show'} Filters
            </Button>
            </Box>
          </Box>
          <Collapse in={filtersOpen}>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Processing Order Form"
                    value={filters.processingOrderForm}
                    onChange={(e) => setFilters(prev => ({ ...prev, processingOrderForm: e.target.value }))}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Order Number"
                    value={filters.orderNumber}
                    onChange={(e) => setFilters(prev => ({ ...prev, orderNumber: e.target.value }))}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Design Number"
                    value={filters.designNumber}
                    onChange={(e) => setFilters(prev => ({ ...prev, designNumber: e.target.value }))}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Design Name"
                    value={filters.designName}
                    onChange={(e) => setFilters(prev => ({ ...prev, designName: e.target.value }))}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Processing Center"
                    value={filters.processingCenter}
                    onChange={(e) => setFilters(prev => ({ ...prev, processingCenter: e.target.value }))}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Delivery Number"
                    value={filters.deliveryNumber}
                    onChange={(e) => setFilters(prev => ({ ...prev, deliveryNumber: e.target.value }))}
                    size="small"
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => setFilters({
                    processingOrderForm: '',
                    orderNumber: '',
                    designNumber: '',
                    designName: '',
                    processingCenter: '',
                    deliveryNumber: ''
                  })}
                  sx={{ mr: 1 }}
                >
                  Clear Filters
                </Button>
              </Box>
            </Box>
          </Collapse>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
            </Box>
          ) : filteredHistory.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
            No receiving history found
              </Typography>
              <Typography variant="body2" color="textSecondary">
            {historyData.length === 0 ? 'No fabric cuts have been received yet.' : 'No records match your filter criteria.'}
              </Typography>
        </Paper>
          ) : (
        <TableContainer component={Paper}>
          <Table>
                <TableHead>
              <TableRow>
                <TableCell>Fabric Number</TableCell>
                <TableCell>Delivery No.</TableCell>
                <TableCell>Processing Center</TableCell>
                <TableCell>Order No.</TableCell>
                <TableCell>Design</TableCell>
                <TableCell>Quantity (m)</TableCell>
                <TableCell>Received Place</TableCell>
                <TableCell>Received Date</TableCell>
                <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
              {filteredHistory.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>{receipt.fabricNumber}</TableCell>
                  <TableCell>{receipt.deliveryNumber || 'N/A'}</TableCell>
                  <TableCell>{receipt.processingCenter || 'N/A'}</TableCell>
                  <TableCell>{receipt.orderNumber || 'N/A'}</TableCell>
                  <TableCell>{`${receipt.designName || ''} (${receipt.designNumber || ''})`}</TableCell>
                  <TableCell>{receipt.quantity}</TableCell>
                  <TableCell>{receipt.receivedLocation}</TableCell>
                  <TableCell>{formatDate(receipt.receivedAt)}</TableCell>
                                             <TableCell>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleEditClick(receipt)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteClick(receipt)} size="small" color="error">
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose}>
        <DialogTitle>Edit Received Fabric Cut</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="deliveryNumber"
            label="Delivery Number"
            type="text"
            fullWidth
            variant="standard"
            value={editFormData.deliveryNumber}
            onChange={handleEditFormChange}
          />
          <TextField
            margin="dense"
            name="quantity"
            label="Quantity (m)"
            type="number"
            fullWidth
            variant="standard"
            value={editFormData.quantity}
            onChange={handleEditFormChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Received Place</InputLabel>
            <Select
                name="receivedLocation"
                value={editFormData.receivedLocation}
                onChange={handleEditFormChange}
                label="Received Place"
            >
                <MenuItem value="Veerapandi">Veerapandi</MenuItem>
                <MenuItem value="Salem">Salem</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSubmit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the record for fabric cut <strong>{selectedReceipt?.fabricNumber}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ReceiveFromProcessingHistory; 