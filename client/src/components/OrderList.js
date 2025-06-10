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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

function OrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // Store all orders for filtering
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [files, setFiles] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [productionData, setProductionData] = useState({});
  const [productionLoading, setProductionLoading] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    // Fetch production data for all orders
    const fetchAllProductionData = async () => {
      if (orders.length === 0) return;
      
      setProductionLoading(true);
      console.log('Starting to fetch production data for orders:', orders.map(o => o.id));
      
      const productionPromises = orders.map(async (order) => {
        const data = await fetchProductionData(order.id);
        console.log(`Production data for order ${order.id}:`, data);
        return { orderId: order.id, data };
      });

      const results = await Promise.all(productionPromises);
      const newProductionData = {};
      results.forEach(({ orderId, data }) => {
        newProductionData[orderId] = data;
      });
      
      console.log('Final production data state:', newProductionData);
      setProductionData(newProductionData);
      setProductionLoading(false);
    };

    if (orders.length > 0) {
      fetchAllProductionData();
    }
  }, [orders]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(buildApiUrl('orders'));
      setOrders(response.data);
      setAllOrders(response.data); // Store all orders for filtering
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Apply filters whenever filter states change
  useEffect(() => {
    applyFilters();
  }, [statusFilter, typeFilter, searchText, allOrders]);

  const applyFilters = () => {
    let filteredOrders = [...allOrders];

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filteredOrders = filteredOrders.filter(order => {
        const orderStatus = (order.status || 'NEW').toUpperCase();
        return orderStatus === statusFilter;
      });
    }

    // Apply type filter
    if (typeFilter !== 'ALL') {
      filteredOrders = filteredOrders.filter(order => {
        const orderType = (order.type || '').toUpperCase();
        return orderType === typeFilter;
      });
    }

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filteredOrders = filteredOrders.filter(order => {
        return (
          (order.orderNumber || '').toLowerCase().includes(searchLower) ||
          (order.designName || '').toLowerCase().includes(searchLower) ||
          (order.designNumber || '').toLowerCase().includes(searchLower) ||
          (order.merchandiser || '').toLowerCase().includes(searchLower)
        );
      });
    }

    setOrders(filteredOrders);
  };

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  const handleTypeFilterChange = (event) => {
    setTypeFilter(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  const handleClearFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setSearchText('');
  };

  const getTypeColor = (type) => {
    return type === 'bulk' ? 'primary' : 'secondary';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'success';
      case 'running': return 'warning';
      case 'complete': return 'info';
      default: return 'default';
    }
  };

  const getFileIcon = (filename) => {
    if (!filename) return <AttachFileIcon />;
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <PictureAsPdfIcon />;
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <ImageIcon />;
    if (['doc', 'docx'].includes(ext)) return <DescriptionIcon />;
    return <AttachFileIcon />;
  };

  const handleDownload = async (orderId, fileType) => {
    try {
      const response = await axios.get(buildApiUrl(`orders/${orderId}/download/${fileType}`), {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleEditOrder = (order) => {
    setEditFormData({
      designName: order.designName || '',
      designNumber: order.designNumber || '',
      orderQuantity: order.orderQuantity || '',
      type: order.type || '',
      count: order.count || '',
      construction: order.construction || '',
      merchandiser: order.merchandiser || '',
    });
    setFiles({});
    setSelectedOrder(order);
    setEditOpen(true);
    handleMenuClose();
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.patch(buildApiUrl(`orders/${orderId}/status`), {
        status: newStatus
      });
      fetchOrders(); // Refresh the list
      handleMenuClose();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating order status. Please try again.');
    }
  };

  const handleMenuClick = (event, orderId) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrderId(orderId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedOrderId(null);
  };

  const handleEditSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      
      // Add all form fields to FormData
      Object.keys(editFormData).forEach(key => {
        if (editFormData[key] !== undefined && editFormData[key] !== null && editFormData[key] !== '') {
          formData.append(key, editFormData[key]);
        }
      });
      
      // Add files to FormData if any are selected
      Object.keys(files).forEach(key => {
        if (files[key]) {
          formData.append(key, files[key]);
        }
      });

      console.log('Submitting edit for order:', selectedOrder.id);
      console.log('Form data fields:', Object.keys(editFormData));
      console.log('Files to upload:', Object.keys(files));

      const response = await axios.put(buildApiUrl(`orders/${selectedOrder.id}`), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Edit successful:', response.data);
      setEditOpen(false);
      setFiles({}); // Clear files state
      fetchOrders(); // Refresh the list
    } catch (error) {
      console.error('Error updating order:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert(`Error updating order: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setFiles({
        ...files,
        [fileType]: file,
      });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.seconds) {
      // Firestore timestamp
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp._seconds) {
      // Alternative Firestore timestamp format
      date = new Date(timestamp._seconds * 1000);
    } else {
      // Regular date string or timestamp
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (timestamp) => {
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

  const fetchProductionData = async (orderId) => {
    try {
      const response = await axios.get(buildApiUrl(`fabric-cuts/by-order/${orderId}`));
      return response.data;
    } catch (error) {
      console.error('Error fetching production data:', error);
      return { totalProduction: 0, warps: [], productionByDate: {} };
    }
  };

  const handleExpandOrder = async (orderId) => {
    const newExpandedOrders = new Set(expandedOrders);
    
    if (expandedOrders.has(orderId)) {
      // Collapse the row
      newExpandedOrders.delete(orderId);
    } else {
      // Expand the row and fetch production data
      newExpandedOrders.add(orderId);
      
      if (!productionData[orderId]) {
        const data = await fetchProductionData(orderId);
        setProductionData(prev => ({
          ...prev,
          [orderId]: data
        }));
      }
    }
    
    setExpandedOrders(newExpandedOrders);
  };

  const getProductionSummary = (orderId) => {
    console.log('getProductionSummary called for orderId:', orderId);
    console.log('productionLoading:', productionLoading);
    console.log('productionData:', productionData);
    console.log('productionData[orderId]:', productionData[orderId]);
    
    if (productionLoading) {
      console.log('Production data is loading');
      return 'Loading...';
    }
    
    if (!productionData[orderId]) {
      console.log('No production data found for orderId:', orderId);
      return '0.0m';
    }
    
    const summary = `${productionData[orderId].totalProduction}m`;
    console.log('Production summary:', summary);
    return summary;
  };

  // Function to render expandable production details
  const renderProductionDetails = (orderId) => {
    const data = productionData[orderId];
    if (!data) return null;

    // Calculate total warp quantities
    const totalWarpQuantity = data.warps.reduce((sum, warp) => {
      return sum + (parseFloat(warp.quantity) || 0);
    }, 0);

    return (
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
          <Collapse in={expandedOrders.has(orderId)} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div" color="primary">
                Production Details
              </Typography>
              
              {/* Production Summary */}
              <Box sx={{ mb: 3, display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Total Planned Quantity: <strong style={{ color: '#1976d2' }}>{totalWarpQuantity}m</strong>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Total Production: <strong style={{ color: '#2e7d32' }}>{data.totalProduction}m</strong>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Progress: <strong style={{ color: totalWarpQuantity > 0 ? (data.totalProduction / totalWarpQuantity * 100).toFixed(1) + '%' : '0%' }}>
                      {totalWarpQuantity > 0 ? `${(data.totalProduction / totalWarpQuantity * 100).toFixed(1)}%` : '0%'}
                    </strong>
                  </Typography>
                </Box>
              </Box>

              {/* Warps Table */}
              <Typography variant="subtitle2" gutterBottom>
                Warps ({data.warps.length})
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Warp Number</TableCell>
                    <TableCell>Planned Quantity</TableCell>
                    <TableCell>Actual Production</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Completion Date</TableCell>
                    <TableCell>Verdict</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.warps.map((warp) => {
                    const plannedQty = parseFloat(warp.quantity) || 0;
                    const actualProduction = parseFloat(warp.totalProduction) || 0;
                    const progress = plannedQty > 0 ? (actualProduction / plannedQty * 100).toFixed(1) : 0;
                    
                    const verdict = getVerdict(warp);

                    return (
                      <TableRow key={warp.id}>
                        <TableCell>{warp.warpNumber || warp.warpOrderNumber || 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="primary">
                            {plannedQty}m
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            {actualProduction}m
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            fontWeight="bold"
                            color={progress >= 100 ? 'success.main' : progress >= 50 ? 'warning.main' : 'error.main'}
                          >
                            {progress}%
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDateShort(warp.startDate)}</TableCell>
                        <TableCell>{formatDateShort(warp.endDate)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={
                              warp.status === 'complete' || warp.status === 'closed' 
                                ? 'Complete' 
                                : warp.status === 'stopped'
                                ? 'Stopped'
                                : warp.status || 'Active'
                            }
                            size="small" 
                            color={
                              warp.status === 'complete' || warp.status === 'closed'
                                ? 'success' 
                                : warp.status === 'stopped'
                                ? 'error'
                                : 'warning'
                            }
                          />
                        </TableCell>
                        <TableCell>{formatDateShort(warp.completionDate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={verdict.text}
                            size="small"
                            color={verdict.color}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Production by Date */}
              {Object.keys(data.productionByDate).length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Production by Date
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Production (m)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(data.productionByDate).map(([date, quantity]) => (
                        <TableRow key={date}>
                          <TableCell>{new Date(date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="primary">
                              {quantity}m
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/orders/new')}
        >
          New Order
        </Button>
      </Box>

      {/* Status Filter Buttons */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Filter by Status
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {['ALL', 'NEW', 'RUNNING', 'COMPLETE'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'contained' : 'outlined'}
              color={statusFilter === status ? 'primary' : 'inherit'}
              onClick={() => handleStatusFilterChange(status)}
              sx={{ minWidth: 100 }}
            >
              {status === 'COMPLETE' ? 'COMPLETED' : status}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Search and Type Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Search & Filter
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Orders"
              placeholder="Search by order number, design name, design number, or merchandiser"
              value={searchText}
              onChange={handleSearchChange}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Order Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={handleTypeFilterChange}
                label="Order Type"
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="SAMPLE">Sample</MenuItem>
                <MenuItem value="BULK">Bulk</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleClearFilters}
              fullWidth
              disabled={statusFilter === 'ALL' && typeFilter === 'ALL' && !searchText.trim()}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>

        {/* Filter Summary */}
        {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchText.trim()) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {orders.length} of {allOrders.length} orders
              {statusFilter !== 'ALL' && ` • Status: ${statusFilter === 'COMPLETE' ? 'COMPLETED' : statusFilter}`}
              {typeFilter !== 'ALL' && ` • Type: ${typeFilter}`}
              {searchText.trim() && ` • Search: "${searchText}"`}
            </Typography>
          </Box>
        )}
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Order Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Design Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Design Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Order Qty (m)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Warping Qty (m)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Count</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Construction</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Merchandiser</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Production</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <React.Fragment key={order.id}>
                <TableRow hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{order.orderNumber || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={order.status || 'NEW'}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.type ? order.type.toUpperCase() : 'N/A'}
                      color={getTypeColor(order.type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{order.designName || 'N/A'}</TableCell>
                  <TableCell>{order.designNumber || 'N/A'}</TableCell>
                  <TableCell>{order.orderQuantity ? `${order.orderQuantity}m` : 'N/A'}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      fontWeight="bold" 
                      color="secondary.main"
                      sx={{ 
                        bgcolor: 'secondary.50',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        display: 'inline-block'
                      }}
                    >
                      {order.warpingQuantity ? `${order.warpingQuantity}m` : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>{order.count || 'N/A'}</TableCell>
                  <TableCell>{order.construction || 'N/A'}</TableCell>
                  <TableCell>{order.merchandiser || 'N/A'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold" color="primary.main">
                        {getProductionSummary(order.id)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleExpandOrder(order.id)}
                        color="primary"
                      >
                        {expandedOrders.has(order.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(order.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(order)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More Actions">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, order.id)}
                          color="primary"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
                {expandedOrders.has(order.id) && renderProductionDetails(order.id)}
              </React.Fragment>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {allOrders.length === 0 
                      ? "No orders found. Create your first order to get started."
                      : "No orders match the current filters. Try adjusting your search criteria."
                    }
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const order = orders.find(o => o.id === selectedOrderId);
          handleEditOrder(order);
        }}>
          <EditIcon sx={{ mr: 1 }} /> Edit Order
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(selectedOrderId, 'COMPLETE')}>
          Set to Complete
        </MenuItem>
      </Menu>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Order Details: {selectedOrder?.orderNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Basic Information
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Order Number</Typography>
                  <Typography variant="body1">{selectedOrder.orderNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedOrder.status || 'NEW'}
                    color={getStatusColor(selectedOrder.status)}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                  <Chip
                    label={selectedOrder.type ? selectedOrder.type.toUpperCase() : 'N/A'}
                    color={getTypeColor(selectedOrder.type)}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Design Name</Typography>
                  <Typography variant="body1">{selectedOrder.designName}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Design Number</Typography>
                  <Typography variant="body1">{selectedOrder.designNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Quantity</Typography>
                  <Typography variant="body1">{selectedOrder.orderQuantity} meters</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Warping Quantity</Typography>
                  <Typography variant="body1" color="secondary.main" fontWeight="bold">
                    {selectedOrder.warpingQuantity ? `${selectedOrder.warpingQuantity} meters` : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Count</Typography>
                  <Typography variant="body1">{selectedOrder.count || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Construction</Typography>
                  <Typography variant="body1">{selectedOrder.construction || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Merchandiser</Typography>
                  <Typography variant="body1">{selectedOrder.merchandiser || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Created Date</Typography>
                  <Typography variant="body1">{formatDate(selectedOrder.createdAt)}</Typography>
                </Box>
              </Box>

              {selectedOrder.files && Object.keys(selectedOrder.files).length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Uploaded Documents
                  </Typography>
                  <List>
                    {Object.entries(selectedOrder.files).map(([fileType, fileInfo]) => (
                      <ListItem
                        key={fileType}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={() => handleDownload(selectedOrder.id, fileType)}
                            color="primary"
                          >
                            <DownloadIcon />
                          </IconButton>
                        }
                      >
                        <ListItemIcon>
                          {getFileIcon(fileInfo.filename)}
                        </ListItemIcon>
                        <ListItemText
                          primary={fileType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          secondary={`${fileInfo.originalname} (${(fileInfo.size / 1024).toFixed(1)} KB)`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Order: {selectedOrder?.orderNumber}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Design Name"
                  value={editFormData.designName || ''}
                  onChange={(e) => setEditFormData({...editFormData, designName: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Design Number"
                  value={editFormData.designNumber || ''}
                  onChange={(e) => setEditFormData({...editFormData, designNumber: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Order Quantity (meters)"
                  type="number"
                  value={editFormData.orderQuantity || ''}
                  onChange={(e) => setEditFormData({...editFormData, orderQuantity: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Warping Quantity (meters)"
                  type="number"
                  value={editFormData.warpingQuantity || ''}
                  onChange={(e) => setEditFormData({...editFormData, warpingQuantity: e.target.value})}
                  error={editFormData.orderQuantity && editFormData.warpingQuantity && Number(editFormData.warpingQuantity) <= Number(editFormData.orderQuantity)}
                  helperText={
                    editFormData.orderQuantity && editFormData.warpingQuantity && Number(editFormData.warpingQuantity) <= Number(editFormData.orderQuantity)
                      ? "Warping quantity must be greater than order quantity"
                      : "Include extra quantity for shrinkage and wastage"
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Order Type</InputLabel>
                  <Select
                    value={editFormData.type || ''}
                    onChange={(e) => setEditFormData({...editFormData, type: e.target.value})}
                    label="Order Type"
                  >
                    <MenuItem value="bulk">Bulk</MenuItem>
                    <MenuItem value="sample">Sample</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Count"
                  value={editFormData.count || ''}
                  onChange={(e) => setEditFormData({...editFormData, count: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Construction"
                  value={editFormData.construction || ''}
                  onChange={(e) => setEditFormData({...editFormData, construction: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Merchandiser"
                  value={editFormData.merchandiser || ''}
                  onChange={(e) => setEditFormData({...editFormData, merchandiser: e.target.value})}
                />
              </Grid>
              
              {/* File Upload Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Update Documents (Optional)
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Design Sheet</Typography>
                  <input
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    id="designSheet-upload"
                    type="file"
                    onChange={(e) => handleFileChange(e, 'designSheet')}
                  />
                  <label htmlFor="designSheet-upload">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.designSheet ? 'File Selected' : 'Choose File'}
                    </Button>
                  </label>
                  {files.designSheet && (
                    <Typography variant="caption" display="block">
                      {files.designSheet.name}
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Yarn Requirement Sheet</Typography>
                  <input
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    id="yarnRequirementSheet-upload"
                    type="file"
                    onChange={(e) => handleFileChange(e, 'yarnRequirementSheet')}
                  />
                  <label htmlFor="yarnRequirementSheet-upload">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.yarnRequirementSheet ? 'File Selected' : 'Choose File'}
                    </Button>
                  </label>
                  {files.yarnRequirementSheet && (
                    <Typography variant="caption" display="block">
                      {files.yarnRequirementSheet.name}
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Dyeing Order Form</Typography>
                  <input
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    id="dyeingOrderForm-upload"
                    type="file"
                    onChange={(e) => handleFileChange(e, 'dyeingOrderForm')}
                  />
                  <label htmlFor="dyeingOrderForm-upload">
                    <Button variant="outlined" component="span" fullWidth>
                      {files.dyeingOrderForm ? 'File Selected' : 'Choose File'}
                    </Button>
                  </label>
                  {files.dyeingOrderForm && (
                    <Typography variant="caption" display="block">
                      {files.dyeingOrderForm.name}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default OrderList; 