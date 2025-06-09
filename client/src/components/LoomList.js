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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import axios from 'axios';

function LoomList() {
  const navigate = useNavigate();
  const [looms, setLooms] = useState([]);
  const [companyFilter, setCompanyFilter] = useState('ALL'); // ALL, IN-HOUSE, JOB WORK
  
  // Edit states
  const [editingLoom, setEditingLoom] = useState(null);
  const [editData, setEditData] = useState({});
  
  // Delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loomToDelete, setLoomToDelete] = useState(null);
  
  // Notification states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchLooms();
  }, []);

  const fetchLooms = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/looms');
      console.log('Looms data:', response.data);
      setLooms(response.data);
    } catch (error) {
      console.error('Error fetching looms:', error);
      showNotification('Error fetching looms', 'error');
    }
  };

  const showNotification = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Edit functionality
  const handleEditLoom = (loom) => {
    setEditingLoom(loom.id);
    setEditData({
      companyName: loom.companyName,
      loomName: loom.loomName
    });
  };

  const handleCancelEdit = () => {
    setEditingLoom(null);
    setEditData({});
  };

  const handleSaveEdit = async (loomId) => {
    try {
      const response = await axios.put(`http://localhost:3001/api/looms/${loomId}`, editData);
      
      // Update the looms list with the updated loom
      setLooms(looms.map(loom => 
        loom.id === loomId ? response.data : loom
      ));
      
      setEditingLoom(null);
      setEditData({});
      showNotification('Loom updated successfully');
    } catch (error) {
      console.error('Error updating loom:', error);
      showNotification(error.response?.data?.message || 'Error updating loom', 'error');
    }
  };

  // Delete functionality
  const handleDeleteLoom = (loom) => {
    setLoomToDelete(loom);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!loomToDelete) return;
    
    try {
      await axios.delete(`http://localhost:3001/api/looms/${loomToDelete.id}`);
      
      // Remove the deleted loom from the list
      setLooms(looms.filter(loom => loom.id !== loomToDelete.id));
      
      setDeleteDialogOpen(false);
      setLoomToDelete(null);
      showNotification('Loom deleted successfully');
    } catch (error) {
      console.error('Error deleting loom:', error);
      showNotification(error.response?.data?.message || 'Error deleting loom', 'error');
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setLoomToDelete(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'idle':
        return 'success';
      case 'busy':
        return 'warning';
      case 'maintenance':
        return 'error';
      default:
        return 'default';
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

  // Filter looms based on company type
  const filterLoomsByCompany = (loomList) => {
    if (companyFilter === 'ALL') {
      return loomList;
    } else if (companyFilter === 'IN-HOUSE') {
      return loomList.filter(loom => 
        loom.companyName?.toUpperCase() === 'ASHOK TEXTILES'
      );
    } else if (companyFilter === 'JOB WORK') {
      return loomList.filter(loom => 
        loom.companyName?.toUpperCase() !== 'ASHOK TEXTILES'
      );
    }
    return loomList;
  };

  // Separate looms by status and apply company filter
  const filteredLooms = filterLoomsByCompany(looms);
  const busyLooms = filteredLooms.filter(loom => loom.status === 'busy');
  const idleLooms = filteredLooms.filter(loom => loom.status === 'idle');
  const maintenanceLooms = filteredLooms.filter(loom => loom.status === 'maintenance');

  const renderLoomRow = (loom) => (
    <TableRow key={loom.id}>
      <TableCell>
        {editingLoom === loom.id ? (
          <TextField
            value={editData.companyName || ''}
            onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
            size="small"
            fullWidth
            variant="outlined"
          />
        ) : (
          loom.companyName
        )}
      </TableCell>
      <TableCell>
        {editingLoom === loom.id ? (
          <TextField
            value={editData.loomName || ''}
            onChange={(e) => setEditData({ ...editData, loomName: e.target.value })}
            size="small"
            fullWidth
            variant="outlined"
          />
        ) : (
          loom.loomName
        )}
      </TableCell>
      <TableCell>
        <Chip
          label={loom.status}
          color={getStatusColor(loom.status)}
          size="small"
        />
      </TableCell>
      <TableCell>
        {loom.status === 'busy' && loom.order ? (
          <div>
            <Typography variant="body2" fontWeight="bold">
              {loom.order.orderNumber} - {loom.order.designName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Design: {loom.order.designNumber}
            </Typography>
          </div>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {loom.status === 'idle' ? 'Available' : 'N/A'}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {loom.status === 'busy' && loom.warp ? (
          <div>
            <Typography variant="body2">
              Warp: {loom.warp.warpNumber || loom.warp.warpOrderNumber || 'N/A'}
            </Typography>
          </div>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {loom.status === 'idle' ? 'No active warp' : 'N/A'}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {loom.status === 'busy' && loom.warp ? (
          <Typography variant="body2" fontWeight="bold" color="info.main">
            {loom.warp.quantity}m
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            N/A
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {loom.status === 'busy' && loom.warp ? 
          formatDate(loom.warp.startDate) : 'N/A'}
      </TableCell>
      <TableCell>
        {loom.status === 'busy' && loom.warp ? 
          formatDate(loom.warp.endDate) : 'N/A'}
      </TableCell>
      <TableCell>
        {loom.status === 'busy' && loom.fabricCutStats ? (
          <div>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {loom.fabricCutStats.totalProduction?.toFixed(1) || '0.0'}m
            </Typography>
            <Typography variant="caption" color="text.primary" sx={{ fontSize: '0.7rem' }}>
              {loom.fabricCutStats.totalCuts} cuts
            </Typography>
          </div>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {loom.status === 'idle' ? 'No active production' : 'N/A'}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {editingLoom === loom.id ? (
            <>
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleSaveEdit(loom.id)}
                disabled={!editData.companyName || !editData.loomName}
              >
                <SaveIcon />
              </IconButton>
              <IconButton
                size="small"
                color="secondary"
                onClick={handleCancelEdit}
              >
                <CancelIcon />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleEditLoom(loom)}
                title="Edit loom"
              >
                <EditIcon />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteLoom(loom)}
                title="Delete loom"
                disabled={loom.status === 'busy'}
              >
                <DeleteIcon />
              </IconButton>
            </>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Looms
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/looms/new')}
        >
          Register New Loom
        </Button>
      </Box>

      {/* Company Filter Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant={companyFilter === 'ALL' ? 'contained' : 'outlined'}
          color={companyFilter === 'ALL' ? 'primary' : 'inherit'}
          onClick={() => setCompanyFilter('ALL')}
          sx={{ minWidth: 120 }}
        >
          ALL
        </Button>
        <Button
          variant={companyFilter === 'IN-HOUSE' ? 'contained' : 'outlined'}
          color={companyFilter === 'IN-HOUSE' ? 'success' : 'inherit'}
          onClick={() => setCompanyFilter('IN-HOUSE')}
          sx={{ minWidth: 120 }}
        >
          IN-HOUSE
        </Button>
        <Button
          variant={companyFilter === 'JOB WORK' ? 'contained' : 'outlined'}
          color={companyFilter === 'JOB WORK' ? 'info' : 'inherit'}
          onClick={() => setCompanyFilter('JOB WORK')}
          sx={{ minWidth: 120 }}
        >
          JOB WORK
        </Button>
      </Box>

      {/* Results Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredLooms.length} {companyFilter === 'ALL' ? '' : companyFilter} looms
          {filteredLooms.length > 0 && ` (${busyLooms.length} busy, ${idleLooms.length} idle, ${maintenanceLooms.length} maintenance)`}
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company Name</TableCell>
              <TableCell>Loom Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Current Order</TableCell>
              <TableCell>Warp Details</TableCell>
              <TableCell>Warp Quantity</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Total Production</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Busy Looms Section */}
            {busyLooms.length > 0 && (
              <>
                <TableRow>
                  <TableCell colSpan={10} sx={{ border: 0, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6" color="warning.main" fontWeight="bold">
                        Busy Looms ({busyLooms.length})
                      </Typography>
                      <Chip 
                        label="In Production" 
                        color="warning" 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                </TableRow>
                {busyLooms.map(renderLoomRow)}
              </>
            )}

            {/* Maintenance Looms Section */}
            {maintenanceLooms.length > 0 && (
              <>
                {busyLooms.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ border: 0, p: 1 }}>
                      <Divider sx={{ borderColor: 'grey.200', borderWidth: 0.5 }} />
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={10} sx={{ border: 0, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6" color="error.main" fontWeight="bold">
                        Maintenance Looms ({maintenanceLooms.length})
                      </Typography>
                      <Chip 
                        label="Under Maintenance" 
                        color="error" 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                </TableRow>
                {maintenanceLooms.map(renderLoomRow)}
              </>
            )}

            {/* Main Divider */}
            {(busyLooms.length > 0 || maintenanceLooms.length > 0) && idleLooms.length > 0 && (
              <TableRow>
                <TableCell colSpan={10} sx={{ border: 0, p: 3 }}>
                  <Divider sx={{ borderColor: 'grey.300', borderWidth: 1 }}>
                    <Chip label="SECTION DIVIDER" size="small" color="default" />
                  </Divider>
                </TableCell>
              </TableRow>
            )}

            {/* Idle Looms Section */}
            {idleLooms.length > 0 && (
              <>
                <TableRow>
                  <TableCell colSpan={10} sx={{ border: 0, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6" color="success.main" fontWeight="bold">
                        Idle Looms ({idleLooms.length})
                      </Typography>
                      <Chip 
                        label="Available" 
                        color="success" 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                </TableRow>
                {idleLooms.map(renderLoomRow)}
              </>
            )}

            {/* Empty State */}
            {filteredLooms.length === 0 && looms.length > 0 && (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No {companyFilter === 'ALL' ? '' : companyFilter} looms found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {looms.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No looms registered. Register your first loom to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Delete Loom</DialogTitle>
        <DialogContent>
          {loomToDelete && (
            <Box>
              <Typography sx={{ mb: 2 }}>
                Are you sure you want to delete the loom "{loomToDelete.companyName} - {loomToDelete.loomName}"?
              </Typography>
              {loomToDelete.status === 'busy' ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                  This loom is currently busy and cannot be deleted. Please complete or stop the active warp first.
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This will remove the loom from the active looms list. Historical warp and fabric cut data will be preserved for reporting purposes.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={loomToDelete?.status === 'busy'}
          >
            Delete Loom
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default LoomList; 