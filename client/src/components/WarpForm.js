import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  Alert,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function WarpForm() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [looms, setLooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [existingWarps, setExistingWarps] = useState([]);
  const [loadingWarps, setLoadingWarps] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(null);
  const [formData, setFormData] = useState({
    warpOrderNumber: '',
    orderId: '',
    quantity: '',
    loomId: '',
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching orders and looms...');
        const [ordersResponse, loomsResponse] = await Promise.all([
          axios.get(buildApiUrl('orders/active')),
          axios.get(buildApiUrl('looms/idle'))
        ]);
        console.log('Orders response:', ordersResponse.data);
        console.log('Looms response:', loomsResponse.data);
        setOrders(ordersResponse.data);
        setLooms(loomsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Error details:', error.response?.data || error.message);
        alert(`Error loading data: ${error.message}. Please check if the server is running.`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchOrderDetails = async (orderId) => {
    if (!orderId) {
      setSelectedOrder(null);
      setExistingWarps([]);
      setAvailableQuantity(null);
      return;
    }

    try {
      setLoadingWarps(true);
      
      // Find the selected order from the orders list
      const order = orders.find(o => o.id === orderId);
      setSelectedOrder(order);
      
      // Fetch existing warps for this order and available quantity
      const [warpsResponse, quantityResponse] = await Promise.all([
          axios.get(buildApiUrl(`warps/by-order/${orderId}`)),
          axios.get(buildApiUrl(`warps/available-quantity/${orderId}`))
      ]);
      
      setExistingWarps(warpsResponse.data);
      setAvailableQuantity(quantityResponse.data);
      
      console.log('Order details:', order);
      console.log('Existing warps:', warpsResponse.data);
      console.log('Available quantity:', quantityResponse.data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setSelectedOrder(null);
      setExistingWarps([]);
      setAvailableQuantity(null);
    } finally {
      setLoadingWarps(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // If order is changed, fetch order details and existing warps
    if (name === 'orderId') {
      fetchOrderDetails(value);
    }
  };

  const handleDateChange = (field, newValue) => {
    setFormData({
      ...formData,
      [field]: newValue,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (looms.length === 0) {
      alert('Cannot create warp: No idle looms are available. Please free up a loom by closing an existing warp first.');
      return;
    }

    // Validate quantity against available quantity
    const requestedQuantity = Number(formData.quantity);
    if (availableQuantity && requestedQuantity > availableQuantity.availableQuantity) {
      alert(`Cannot create warp: Requested quantity (${requestedQuantity}m) exceeds available quantity (${availableQuantity.availableQuantity}m)`);
      return;
    }
    
    try {
      // Create the warp
      await axios.post(buildApiUrl('warps'), {
        ...formData,
        quantity: requestedQuantity,
        startDate: formData.startDate ? formData.startDate.toISOString() : null,
        endDate: formData.endDate ? formData.endDate.toISOString() : null,
      });
      
      // Update loom status to busy
      if (formData.loomId) {
        await axios.patch(buildApiUrl(`looms/${formData.loomId}`), {
          status: 'busy'
        });
      }
      
      navigate('/warps');
    } catch (error) {
      console.error('Error creating warp:', error);
      alert('Error creating warp. Please try again.');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Create New Warp
          </Typography>
          
          {/* Show alert when no idle looms are available */}
          {!loading && looms.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>No idle looms available!</strong> All looms are currently busy. 
              To create a new warp, you need to first close an existing warp to free up a loom. 
              Go to the Warps page and close a completed warp.
            </Alert>
          )}
          
          {/* Debug information */}
          <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Debug: Loading: {loading ? 'Yes' : 'No'} | Orders: {orders.length} | Looms: {looms.length}
            </Typography>
          </Box>
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Warp Order Number"
              name="warpOrderNumber"
              value={formData.warpOrderNumber}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              select
              label="Order"
              name="orderId"
              value={formData.orderId}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading || orders.length === 0}
              helperText={loading ? 'Loading orders...' : orders.length === 0 ? 'No active orders available' : `${orders.length} active orders available (excludes completed orders)`}
            >
              {orders.map((order) => (
                <MenuItem key={order.id} value={order.id}>
                  {order.orderNumber} - {order.designName} ({order.designNumber})
                </MenuItem>
              ))}
            </TextField>

            {/* Order Details Section */}
            {selectedOrder && availableQuantity && (
              <Card sx={{ mt: 2, mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Order Quantity Details
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <Chip 
                      label={`Total Warping Qty: ${availableQuantity.totalWarpingQuantity}m`} 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`Order Qty: ${availableQuantity.totalOrderQuantity}m`} 
                      color="info" 
                      variant="outlined" 
                    />
                    <Chip 
                      label={`Currently Allocated: ${availableQuantity.allocatedQuantity}m`} 
                      color="warning" 
                      variant="outlined" 
                    />
                    {availableQuantity.freedQuantity > 0 && (
                      <Chip 
                        label={`Freed from Stopped Warps: +${availableQuantity.freedQuantity}m`} 
                        color="info" 
                        variant="outlined" 
                      />
                    )}
                    <Chip 
                      label={`Available for New Warps: ${availableQuantity.availableQuantity}m`} 
                      color={availableQuantity.availableQuantity > 0 ? "success" : "error"} 
                      variant="filled" 
                    />
                  </Box>
                  
                  {availableQuantity.freedQuantity > 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <strong>Good news!</strong> {availableQuantity.freedQuantity}m has been freed up from stopped warps and is now available for allocation.
                    </Alert>
                  )}
                  
                  {/* Existing Warps Table */}
                  {loadingWarps ? (
                    <Typography variant="body2" color="text.secondary">
                      Loading existing warps...
                    </Typography>
                  ) : existingWarps.length > 0 ? (
                    <>
                      <Typography variant="subtitle1" gutterBottom>
                        Existing Warps for this Order:
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Warp Number</TableCell>
                              <TableCell>Quantity</TableCell>
                              <TableCell>Original Qty</TableCell>
                              <TableCell>Loom</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {existingWarps.map((warp) => (
                              <TableRow key={warp.id}>
                                <TableCell>{warp.warpNumber || warp.warpOrderNumber || 'N/A'}</TableCell>
                                <TableCell>{warp.quantity}m</TableCell>
                                <TableCell>
                                  {warp.originalQuantity && warp.originalQuantity !== warp.quantity 
                                    ? `${warp.originalQuantity}m` 
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell>
                                  {warp.loom ? `${warp.loom.companyName} - ${warp.loom.loomName}` : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={
                                      warp.status === 'stopped' ? 'Stopped' :
                                      warp.status === 'complete' ? 'Complete' :
                                      warp.status === 'active' ? 'Active' : 'N/A'
                                    } 
                                    color={
                                      warp.status === 'active' ? 'success' : 
                                      warp.status === 'stopped' ? 'error' :
                                      'default'
                                    } 
                                    size="small" 
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No existing warps found for this order. This will be the first warp.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            <TextField
              fullWidth
              label="Quantity (meters)"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange}
              margin="normal"
              required
              inputProps={{ 
                min: 0.1, 
                max: availableQuantity?.availableQuantity || undefined,
                step: 0.1 
              }}
              helperText={
                availableQuantity 
                  ? `Available from warping quantity: ${availableQuantity.availableQuantity}m${availableQuantity.freedQuantity > 0 ? ` (includes ${availableQuantity.freedQuantity}m freed from stopped warps)` : ''}`
                  : selectedOrder ? 'Select an order to see available quantity' : ''
              }
              error={availableQuantity && Number(formData.quantity) > availableQuantity.availableQuantity}
            />
            <TextField
              fullWidth
              select
              label="Loom"
              name="loomId"
              value={formData.loomId}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading || looms.length === 0}
              helperText={loading ? 'Loading looms...' : looms.length === 0 ? 'No idle looms available - all looms are currently busy' : `${looms.length} idle looms available`}
            >
              {looms.length === 0 ? (
                <MenuItem disabled>No idle looms available</MenuItem>
              ) : (
                looms.map((loom) => (
                  <MenuItem key={loom.id} value={loom.id}>
                    {loom.companyName} - {loom.loomName}
                  </MenuItem>
                ))
              )}
            </TextField>
            <Box sx={{ mt: 2, mb: 2 }}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(newValue) => handleDateChange('startDate', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    margin="normal"
                    helperText="When the warp assignment to loom starts"
                  />
                )}
              />
            </Box>
            <Box sx={{ mt: 2, mb: 2 }}>
              <DatePicker
                label="End Date"
                value={formData.endDate}
                onChange={(newValue) => handleDateChange('endDate', newValue)}
                minDate={formData.startDate}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    margin="normal"
                    helperText="When the warp assignment to loom ends"
                  />
                )}
              />
            </Box>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                sx={{ mr: 2 }}
                disabled={loading || looms.length === 0}
              >
                Create Warp
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/warps')}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
}

export default WarpForm; 