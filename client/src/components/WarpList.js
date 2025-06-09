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
  Chip,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  TextField,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon, FilterList as FilterListIcon, Clear as ClearIcon } from '@mui/icons-material';
import axios from 'axios';

function WarpList() {
  const navigate = useNavigate();
  const [warps, setWarps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initialLoad, setInitialLoad] = useState(true); // Track first load
  
  // Filter states
  const [selectedWarp, setSelectedWarp] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // New status filter state

  // Stop dialog states
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedWarpForStop, setSelectedWarpForStop] = useState(null);
  const [remainingQuantity, setRemainingQuantity] = useState('');

  useEffect(() => {
    const fetchWarps = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Fetching warps with ultra-optimized queries...');
        const startTime = Date.now();
        
        // Use the ultra-optimized endpoint for best performance
        const response = await axios.get('http://localhost:3001/api/warps/ultra-optimized');
        console.log(`Warps data received in ${Date.now() - startTime}ms:`, response.data.length, 'warps');
        
        setWarps(response.data);
      } catch (error) {
        console.error('Error fetching warps:', error);
        if (error.response?.status === 500) {
          setError('Server error while loading warps. Please try again.');
        } else if (error.code === 'NETWORK_ERROR') {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Failed to load warps data. Please try again.');
        }
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };
    fetchWarps();
  }, []);

  // Retry function for failed requests
  const retryFetch = () => {
    setError('');
    setLoading(true);
    setTimeout(() => {
      const fetchWarps = async () => {
        try {
          const response = await axios.get('http://localhost:3001/api/warps/ultra-optimized');
          setWarps(response.data);
          setError('');
        } catch (error) {
          console.error('Error retrying warps fetch:', error);
          setError('Failed to load warps data. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      fetchWarps();
    }, 500); // Small delay before retry
  };

  // Filter logic
  const filteredWarps = warps.filter(warp => {
    const warpNumber = warp.warpOrderNumber || warp.warpNumber || '';
    
    // Apply dropdown filter
    if (selectedWarp && warpNumber !== selectedWarp) {
      return false;
    }
    
    // Apply text search filter
    if (searchText && !warpNumber.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter === 'ACTIVE') {
      return warp.status === 'active' || warp.status === 'NEW' || !warp.status;
    } else if (statusFilter === 'COMPLETED') {
      return warp.status === 'complete' || warp.status === 'closed';
    } else if (statusFilter === 'STOPPED') {
      return warp.status === 'stopped';
    }
    // If statusFilter is 'ALL', don't filter by status
    
    return true;
  });

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedWarp('');
    setSearchText('');
    // Don't reset statusFilter as it's controlled by the prominent buttons
  };

  // Get unique warp numbers for dropdown
  const uniqueWarpNumbers = [...new Set(warps.map(warp => 
    warp.warpOrderNumber || warp.warpNumber || ''
  ).filter(Boolean))].sort();

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'complete':
      case 'closed':
        return 'default';
      case 'stopped':
        return 'error'; // Red color for stopped warps
      case 'NEW':
        return 'info';
      default:
        return 'warning';
    }
  };

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
        return 'N/A';
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  const getVerdict = (warp) => {
    if (!warp.completionDate || !warp.endDate) {
      return { text: 'N/A', color: 'default' };
    }

    try {
      let completionDate, endDate;

      // Parse completion date
      if (warp.completionDate._seconds) {
        completionDate = new Date(warp.completionDate._seconds * 1000);
      } else if (warp.completionDate.seconds) {
        completionDate = new Date(warp.completionDate.seconds * 1000);
      } else {
        completionDate = new Date(warp.completionDate);
      }

      // Parse end date
      if (warp.endDate._seconds) {
        endDate = new Date(warp.endDate._seconds * 1000);
      } else if (warp.endDate.seconds) {
        endDate = new Date(warp.endDate.seconds * 1000);
      } else {
        endDate = new Date(warp.endDate);
      }

      // Compare dates (only date part, ignore time)
      const completionDateOnly = new Date(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      if (completionDateOnly < endDateOnly) {
        return { text: 'Completed Early', color: 'success' };
      } else if (completionDateOnly.getTime() === endDateOnly.getTime()) {
        return { text: 'On Time', color: 'info' };
      } else {
        return { text: 'Late', color: 'error' };
      }
    } catch (error) {
      return { text: 'N/A', color: 'default' };
    }
  };

  const handleStatusChange = async (warpId, newStatus) => {
    if (newStatus === 'stopped') {
      // Find the warp and open the dialog
      const warp = warps.find(w => w.id === warpId);
      if (warp) {
        setSelectedWarpForStop(warp);
        setRemainingQuantity(warp.quantity.toString());
        setStopDialogOpen(true);
      }
      return;
    }

    try {
      await axios.patch(`http://localhost:3001/api/warps/${warpId}`, {
        status: newStatus
      });
      
      // Refresh the warps list using the ultra-optimized endpoint
      const response = await axios.get('http://localhost:3001/api/warps/ultra-optimized');
      setWarps(response.data);
    } catch (error) {
      console.error('Error updating warp status:', error);
      alert('Error updating warp status. Please try again.');
    }
  };

  const handleStopConfirm = async () => {
    if (!selectedWarpForStop || !remainingQuantity) {
      alert('Please enter the remaining quantity');
      return;
    }

    const remaining = parseFloat(remainingQuantity);
    if (isNaN(remaining) || remaining < 0) {
      alert('Please enter a valid remaining quantity');
      return;
    }

    if (remaining > selectedWarpForStop.quantity) {
      alert('Remaining quantity cannot be more than original quantity');
      return;
    }

    try {
      await axios.patch(`http://localhost:3001/api/warps/${selectedWarpForStop.id}`, {
        status: 'stopped',
        remainingQuantity: remaining,
        originalQuantity: selectedWarpForStop.quantity
      });
      
      // Refresh the warps list
      const response = await axios.get('http://localhost:3001/api/warps/ultra-optimized');
      setWarps(response.data);
      
      // Close dialog and reset states
      setStopDialogOpen(false);
      setSelectedWarpForStop(null);
      setRemainingQuantity('');
    } catch (error) {
      console.error('Error stopping warp:', error);
      alert('Error stopping warp. Please try again.');
    }
  };

  const handleStopCancel = () => {
    setStopDialogOpen(false);
    setSelectedWarpForStop(null);
    setRemainingQuantity('');
  };

  // Separate warps by status - simplified workflow
  const activeWarps = filteredWarps.filter(warp => 
    warp.status === 'active' || warp.status === 'NEW' || !warp.status
  );
  const completedWarps = filteredWarps.filter(warp => 
    warp.status === 'complete' || warp.status === 'closed'
  );
  const stoppedWarps = filteredWarps.filter(warp => 
    warp.status === 'stopped'
  );

  const renderWarpRow = (warp) => (
    <TableRow key={warp.id}>
      <TableCell>{warp.warpOrderNumber || warp.warpNumber || 'N/A'}</TableCell>
      <TableCell>{warp.order?.orderNumber || 'N/A'}</TableCell>
      <TableCell>{warp.order?.designName || 'N/A'}</TableCell>
      <TableCell>{warp.order?.designNumber || 'N/A'}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="body2" fontWeight="bold">
            {warp.quantity ? `${warp.quantity}m` : 'N/A'}
          </Typography>
          {warp.status === 'stopped' && warp.originalQuantity && warp.originalQuantity !== warp.quantity && (
            <Typography variant="caption" color="text.secondary">
              Original: {warp.originalQuantity}m
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="body1" fontWeight="bold" color="primary">
            {warp.production?.totalProduction?.toFixed(1) || '0.0'}m
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {warp.production?.totalCuts || 0} cuts
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        {warp.loom ? `${warp.loom.companyName} - ${warp.loom.loomName}` : 'N/A'}
      </TableCell>
      <TableCell>
        {formatDate(warp.startDate)}
      </TableCell>
      <TableCell>
        {formatDate(warp.endDate)}
      </TableCell>
      <TableCell>
        {(warp.status === 'complete' || warp.status === 'closed' || warp.status === 'stopped') 
          ? formatDate(warp.completionDate) 
          : 'N/A'
        }
      </TableCell>
      <TableCell>
        {(warp.status === 'complete' || warp.status === 'closed' || warp.status === 'stopped') ? (
          <Chip
            label={getVerdict(warp).text}
            color={getVerdict(warp).color}
            size="small"
            variant="outlined"
          />
        ) : (
          'N/A'
        )}
      </TableCell>
      <TableCell>
        <Chip
          label={
            warp.status === 'complete' || warp.status === 'closed' 
              ? 'Complete' 
              : warp.status === 'stopped'
              ? 'Stopped'
              : 'Active'
          }
          color={getStatusColor(warp.status)}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Edit Button - Available for all warps */}
          <Button
            variant="outlined"
            size="small"
            color="primary"
            onClick={() => navigate(`/warps/edit/${warp.id}`)}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            Edit
          </Button>
          
          {/* Status Action - Only for active warps */}
          {(warp.status === 'active' || warp.status === 'NEW' || !warp.status) && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value=""
                displayEmpty
                onChange={(e) => handleStatusChange(warp.id, e.target.value)}
              >
                <MenuItem value="" disabled>
                  Change Status
                </MenuItem>
                <MenuItem value="complete">Mark Complete</MenuItem>
                <MenuItem value="stopped">Mark as Stopped</MenuItem>
              </Select>
            </FormControl>
          )}
          
          {/* Completed/Stopped Status Text */}
          {(warp.status === 'complete' || warp.status === 'closed') && (
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
          )}
          {warp.status === 'stopped' && (
            <Typography variant="body2" color="error">
              Stopped
            </Typography>
          )}
        </Box>
      </TableCell>
      <TableCell>
        {formatDate(warp.createdAt)}
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <CircularProgress size={50} />
          <Typography variant="h6" color="text.secondary">
            {initialLoad ? 'Loading warps data...' : 'Refreshing warps...'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
            {initialLoad 
              ? 'Fetching warps, orders, looms, and production data. This may take a few moments on first load.'
              : 'Updating warps list with latest data.'
            }
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={retryFetch}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button variant="contained" onClick={retryFetch}>
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {loading && !initialLoad && (
        <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          <Alert 
            severity="info" 
            icon={<CircularProgress size={20} />}
            sx={{ bgcolor: 'background.paper', boxShadow: 2 }}
          >
            Refreshing data...
          </Alert>
        </Box>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Warps
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/warps/new')}
        >
          New Warp
        </Button>
      </Box>

      {/* Status Filter Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, justifyContent: 'center' }}>
        <Button
          variant={statusFilter === 'ALL' ? 'contained' : 'outlined'}
          color={statusFilter === 'ALL' ? 'primary' : 'inherit'}
          onClick={() => setStatusFilter('ALL')}
          sx={{ minWidth: 120 }}
        >
          ALL
        </Button>
        <Button
          variant={statusFilter === 'ACTIVE' ? 'contained' : 'outlined'}
          color={statusFilter === 'ACTIVE' ? 'success' : 'inherit'}
          onClick={() => setStatusFilter('ACTIVE')}
          sx={{ minWidth: 120 }}
        >
          ACTIVE
        </Button>
        <Button
          variant={statusFilter === 'COMPLETED' ? 'contained' : 'outlined'}
          color={statusFilter === 'COMPLETED' ? 'default' : 'inherit'}
          onClick={() => setStatusFilter('COMPLETED')}
          sx={{ minWidth: 120 }}
        >
          COMPLETED
        </Button>
        <Button
          variant={statusFilter === 'STOPPED' ? 'contained' : 'outlined'}
          color={statusFilter === 'STOPPED' ? 'error' : 'inherit'}
          onClick={() => setStatusFilter('STOPPED')}
          sx={{ minWidth: 120 }}
        >
          STOPPED
        </Button>
      </Box>

      {/* Filter Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FilterListIcon color="action" />
            <Typography variant="h6">Filters</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 250, flex: 1 }}>
              <InputLabel>Filter by Warp Number</InputLabel>
              <Select
                value={selectedWarp}
                label="Filter by Warp Number"
                onChange={(e) => setSelectedWarp(e.target.value)}
              >
                <MenuItem value="">All Warps</MenuItem>
                {uniqueWarpNumbers.map((warpNumber) => (
                  <MenuItem key={warpNumber} value={warpNumber}>
                    {warpNumber}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Search Warp Number"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Type to search..."
              sx={{ minWidth: 250, flex: 1 }}
            />
            {(selectedWarp || searchText) && (
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            )}
          </Box>
          {(selectedWarp || searchText) && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selectedWarp && (
                <Chip 
                  label={`Dropdown: ${selectedWarp}`} 
                  onDelete={() => setSelectedWarp('')}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
              {searchText && (
                <Chip 
                  label={`Search: "${searchText}"`} 
                  onDelete={() => setSearchText('')}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body1" color="text.secondary">
          {(selectedWarp || searchText) ? 
            `Showing ${filteredWarps.length} of ${warps.length} warps (${statusFilter.toLowerCase()})` :
            `Showing ${filteredWarps.length} ${statusFilter.toLowerCase()} warps`
          }
          {statusFilter === 'ALL' && activeWarps.length > 0 && ` (${activeWarps.length} active, ${completedWarps.length} completed, ${stoppedWarps.length} stopped)`}
        </Typography>
      </Box>

      {filteredWarps.length === 0 && !loading ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {(selectedWarp || searchText) ? 
            `No warps found matching the current filters.` :
            'No warps found. Click "New Warp" to create your first warp.'
          }
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Warp Order Number</TableCell>
                <TableCell>Order Number</TableCell>
                <TableCell>Design Name</TableCell>
                <TableCell>Design Number</TableCell>
                <TableCell>Quantity (meters)</TableCell>
                <TableCell>Production</TableCell>
                <TableCell>Loom</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Completion Date</TableCell>
                <TableCell>Verdict</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Active Warps Section */}
              {activeWarps.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={14} sx={{ border: 0, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" color="success.main" fontWeight="bold">
                          Active Warps ({activeWarps.length})
                        </Typography>
                        <Chip 
                          label="In Production" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                  {activeWarps.map(renderWarpRow)}
                </>
              )}

              {/* Divider */}
              {activeWarps.length > 0 && (completedWarps.length > 0 || stoppedWarps.length > 0) && (
                <TableRow>
                  <TableCell colSpan={14} sx={{ border: 0, p: 3 }}>
                    <Divider sx={{ borderColor: 'grey.300', borderWidth: 1 }}>
                      <Chip label="SECTION DIVIDER" size="small" color="default" />
                    </Divider>
                  </TableCell>
                </TableRow>
              )}

              {/* Completed Warps Section */}
              {completedWarps.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={14} sx={{ border: 0, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" color="text.secondary" fontWeight="bold">
                          Completed Warps ({completedWarps.length})
                        </Typography>
                        <Chip 
                          label="Completed" 
                          color="default" 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                  {completedWarps.map(renderWarpRow)}
                </>
              )}

              {/* Divider between Completed and Stopped */}
              {completedWarps.length > 0 && stoppedWarps.length > 0 && (
                <TableRow>
                  <TableCell colSpan={14} sx={{ border: 0, p: 3 }}>
                    <Divider sx={{ borderColor: 'grey.300', borderWidth: 1 }}>
                      <Chip label="SECTION DIVIDER" size="small" color="default" />
                    </Divider>
                  </TableCell>
                </TableRow>
              )}

              {/* Stopped Warps Section */}
              {stoppedWarps.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={14} sx={{ border: 0, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" color="error.main" fontWeight="bold">
                          Stopped Warps ({stoppedWarps.length})
                        </Typography>
                        <Chip 
                          label="Stopped" 
                          color="error" 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                  {stoppedWarps.map(renderWarpRow)}
                </>
              )}

              {/* Empty State */}
              {activeWarps.length === 0 && completedWarps.length === 0 && stoppedWarps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} sx={{ textAlign: 'center', p: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No warps available. Create your first warp to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Stop Warp Dialog */}
      <Dialog open={stopDialogOpen} onClose={handleStopCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Warp as Stopped</DialogTitle>
        <DialogContent>
          {selectedWarpForStop && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Warp:</strong> {selectedWarpForStop.warpOrderNumber || selectedWarpForStop.warpNumber}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Original Quantity:</strong> {selectedWarpForStop.quantity}m
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Produced:</strong> {selectedWarpForStop.production?.totalProduction?.toFixed(1) || '0.0'}m
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enter the remaining quantity for this warp. The used quantity will be made available for new warp allocation.
              </Typography>
              <TextField
                autoFocus
                label="Remaining Quantity (meters)"
                type="number"
                fullWidth
                value={remainingQuantity}
                onChange={(e) => setRemainingQuantity(e.target.value)}
                inputProps={{ min: 0, max: selectedWarpForStop.quantity, step: 0.1 }}
                helperText={`Used quantity will be: ${selectedWarpForStop.quantity - parseFloat(remainingQuantity || 0)}m`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStopCancel}>Cancel</Button>
          <Button onClick={handleStopConfirm} variant="contained" color="error">
            Stop Warp
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default WarpList; 