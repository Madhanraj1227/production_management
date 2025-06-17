import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Grid, TextField, Tabs, Tab, IconButton, Tooltip,
  CircularProgress, Collapse, InputAdornment
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { buildApiUrl } from '../config/api';
import axios from 'axios';

function ReceiveFabrics({ movements, loading, onMovementReceived, refreshTrigger }) {
  const [error, setError] = useState('');
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [receivingLoading, setReceivingLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [receivedBy, setReceivedBy] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    // Component will receive movements as props, no need to fetch
  }, [refreshTrigger]);

  const handleReceiveMovement = async (movementId) => {
    if (!receivedBy.trim()) {
      setError('Please enter who is receiving the fabric');
      return;
    }

    try {
      setReceivingLoading(true);
      setError('');
      
      await axios.put(buildApiUrl(`fabric-movements/${movementId}/receive`), {
        receivedBy: receivedBy.trim()
      });
      
      // Notify parent to refresh movements
      onMovementReceived();
      setDetailsOpen(false);
      setReceivedBy('');
      
    } catch (err) {
      console.error('Error receiving movement:', err);
      setError(err.response?.data?.message || 'Failed to receive movement');
    } finally {
      setReceivingLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'received': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <LocalShippingIcon />;
      case 'received': return <CheckCircleIcon />;
      default: return null;
    }
  };

  const toggleRowExpansion = (movementId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(movementId)) {
      newExpanded.delete(movementId);
    } else {
      newExpanded.add(movementId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredMovements = movements.filter(movement => {
    // First filter by tab status
    let statusMatch = true;
    if (tabValue === 0) statusMatch = movement.status === 'pending';
    if (tabValue === 1) statusMatch = movement.status === 'received';
    
    if (!statusMatch) return false;
    
    // Then filter by search term
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      return (
        movement.movementOrderNumber?.toLowerCase().includes(searchTerm) ||
        movement.fromLocation?.toLowerCase().includes(searchTerm) ||
        movement.toLocation?.toLowerCase().includes(searchTerm) ||
        movement.movedBy?.toLowerCase().includes(searchTerm) ||
        movement.receivedBy?.toLowerCase().includes(searchTerm) ||
        movement.fabricCuts?.some(cut => 
          cut.fabricNumber?.toLowerCase().includes(searchTerm) ||
          cut.orderNumber?.toLowerCase().includes(searchTerm) ||
          cut.designName?.toLowerCase().includes(searchTerm)
        )
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab 
            label={`Pending Movements (${movements.filter(m => m.status === 'pending').length})`}
            icon={<LocalShippingIcon />}
          />
          <Tab 
            label={`Received Movements (${movements.filter(m => m.status === 'received').length})`}
            icon={<CheckCircleIcon />}
          />
        </Tabs>
      </Paper>

      {/* Search Filter */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Filter Movement Orders
        </Typography>
        <TextField
          fullWidth
          placeholder="Search by movement order, location, moved by, received by, fabric number, order number, or design..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchFilter && (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setSearchFilter('')}
                  size="small"
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {searchFilter && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Showing {filteredMovements.length} result(s) for "{searchFilter}"
          </Typography>
        )}
      </Paper>

      {/* Movements Table */}
      <Paper elevation={2}>
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h6">
            {tabValue === 0 ? '🚚 Pending Fabric Movements' : '✅ Received Fabric Movements'}
          </Typography>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><strong>Movement Order</strong></TableCell>
                <TableCell><strong>From → To</strong></TableCell>
                <TableCell><strong>Moved By</strong></TableCell>
                <TableCell><strong>Received By</strong></TableCell>
                <TableCell><strong>Fabric Cuts</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="textSecondary" sx={{ py: 3 }}>
                      {searchFilter ? `No movements found for "${searchFilter}"` : 
                       (tabValue === 0 ? 'No pending movements' : 'No received movements')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => (
                  <React.Fragment key={movement.id}>
                    <TableRow>
                      <TableCell>
                        <Typography variant="subtitle2" color="primary">
                          {movement.movementOrderNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip 
                            label={movement.fromLocation} 
                            size="small" 
                            variant="outlined"
                          />
                          <Typography>→</Typography>
                          <Chip 
                            label={movement.toLocation} 
                            size="small" 
                            color="primary"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{movement.movedBy}</TableCell>
                      <TableCell>
                        {movement.receivedBy ? (
                          <Typography variant="body2" color="success.main">
                            {movement.receivedBy}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Not received
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">
                            {movement.fabricCuts.length} cuts
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => toggleRowExpansion(movement.id)}
                          >
                            {expandedRows.has(movement.id) ? 
                              <ExpandLessIcon /> : <ExpandMoreIcon />
                            }
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          try {
                            let date;
                            if (movement.createdAt?._seconds) {
                              // Firebase timestamp with _seconds
                              date = new Date(movement.createdAt._seconds * 1000);
                            } else if (movement.createdAt?.seconds) {
                              // Firebase timestamp with seconds
                              date = new Date(movement.createdAt.seconds * 1000);
                            } else if (movement.createdAt?.toDate) {
                              // Firebase Timestamp object with toDate method
                              date = movement.createdAt.toDate();
                            } else {
                              // Regular timestamp or Date object
                              date = new Date(movement.createdAt);
                            }
                            
                            if (isNaN(date.getTime())) {
                              return 'Invalid Date';
                            }
                            
                            return date.toLocaleDateString();
                          } catch (error) {
                            console.error('Error parsing date:', error, movement.createdAt);
                            return 'Invalid Date';
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={movement.status}
                          color={getStatusColor(movement.status)}
                          icon={getStatusIcon(movement.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedMovement(movement);
                                setDetailsOpen(true);
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {movement.status === 'pending' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => {
                                setSelectedMovement(movement);
                                setDetailsOpen(true);
                              }}
                              startIcon={<CheckCircleIcon />}
                            >
                              Receive
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expandable Fabric Cuts Details */}
                    <TableRow>
                      <TableCell colSpan={8} style={{ paddingTop: 0, paddingBottom: 0 }}>
                        <Collapse in={expandedRows.has(movement.id)}>
                          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Fabric Cuts Details:
                            </Typography>
                            <Grid container spacing={2}>
                              {movement.fabricCuts.map((cut, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                  <Paper sx={{ p: 2, bgcolor: 'white' }}>
                                    <Typography variant="body2" fontWeight="bold">
                                      {cut.fabricNumber}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      {cut.orderNumber} • {cut.designName}
                                    </Typography>
                                    <Typography variant="body2">
                                      {cut.quantity} m • {cut.isProcessingReceived ? 'Processing' : 'Original'}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Movement Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Movement Order Details - {selectedMovement?.movementOrderNumber}
        </DialogTitle>
        <DialogContent>
          {selectedMovement && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    📍 Location Details
                  </Typography>
                  <Typography><strong>From:</strong> {selectedMovement.fromLocation}</Typography>
                  <Typography><strong>To:</strong> {selectedMovement.toLocation}</Typography>
                  <Typography><strong>Moved By:</strong> {selectedMovement.movedBy}</Typography>
                  <Typography><strong>Date:</strong> {(() => {
                    try {
                      let date;
                      if (selectedMovement.createdAt?._seconds) {
                        date = new Date(selectedMovement.createdAt._seconds * 1000);
                      } else if (selectedMovement.createdAt?.seconds) {
                        date = new Date(selectedMovement.createdAt.seconds * 1000);
                      } else if (selectedMovement.createdAt?.toDate) {
                        date = selectedMovement.createdAt.toDate();
                      } else {
                        date = new Date(selectedMovement.createdAt);
                      }
                      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                    } catch (error) {
                      return 'Invalid Date';
                    }
                  })()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom>
                    📦 Summary
                  </Typography>
                  <Typography><strong>Total Cuts:</strong> {selectedMovement.fabricCuts.length}</Typography>
                  <Typography><strong>Total Quantity:</strong> {selectedMovement.fabricCuts.reduce((sum, cut) => sum + parseFloat(cut.quantity), 0).toFixed(2)} m</Typography>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={selectedMovement.status} 
                      color={getStatusColor(selectedMovement.status)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
              </Grid>



              <Typography variant="h6" gutterBottom>
                🧵 Fabric Cuts ({selectedMovement.fabricCuts.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Fabric Number</strong></TableCell>
                      <TableCell><strong>Order</strong></TableCell>
                      <TableCell><strong>Design</strong></TableCell>
                      <TableCell><strong>Quantity</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedMovement.fabricCuts.map((cut, index) => (
                      <TableRow key={index}>
                        <TableCell>{cut.fabricNumber}</TableCell>
                        <TableCell>{cut.orderNumber}</TableCell>
                        <TableCell>{cut.designName} ({cut.designNumber})</TableCell>
                        <TableCell>{cut.quantity} m</TableCell>
                        <TableCell>
                          <Chip 
                            label={cut.isProcessingReceived ? 'Processing' : 'Original'} 
                            color={cut.isProcessingReceived ? 'secondary' : 'primary'}
                            size="small" 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedMovement.status === 'pending' && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    ✅ Receive Fabric Movement
                  </Typography>
                  <TextField
                    fullWidth
                    required
                    label="Received By"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Enter name of person receiving fabric"
                    sx={{ mb: 2 }}
                  />
                  <Alert severity="info">
                    Receiving this movement will update all fabric cut locations to {selectedMovement.toLocation}.
                  </Alert>
                </Box>
              )}

              {selectedMovement.status === 'received' && selectedMovement.receivedBy && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity="success">
                    <Typography><strong>Received by:</strong> {selectedMovement.receivedBy}</Typography>
                    <Typography><strong>Received on:</strong> {(() => {
                      try {
                        let date;
                        if (selectedMovement.receivedAt?._seconds) {
                          date = new Date(selectedMovement.receivedAt._seconds * 1000);
                        } else if (selectedMovement.receivedAt?.seconds) {
                          date = new Date(selectedMovement.receivedAt.seconds * 1000);
                        } else if (selectedMovement.receivedAt?.toDate) {
                          date = selectedMovement.receivedAt.toDate();
                        } else {
                          date = new Date(selectedMovement.receivedAt);
                        }
                        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
                      } catch (error) {
                        return 'Invalid Date';
                      }
                    })()}</Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
          {selectedMovement?.status === 'pending' && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleReceiveMovement(selectedMovement.id)}
              disabled={receivingLoading || !receivedBy.trim()}
              startIcon={receivingLoading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            >
              {receivingLoading ? 'Receiving...' : 'Confirm Receipt'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ReceiveFabrics; 