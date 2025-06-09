import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  LocalShipping as ShippingIcon
} from '@mui/icons-material';

function GreigeYarnDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    lotNumber: '',
    destination: '',
    quantity: '',
    deliveryDate: new Date().toISOString().split('T')[0],
    vehicleNumber: '',
    driverName: '',
    status: 'Pending'
  });

  const mockDeliveries = [
    {
      id: 1,
      lotNumber: 'LOT001',
      destination: 'Dyeing Unit A',
      quantity: 200,
      deliveryDate: '2024-06-09',
      vehicleNumber: 'TN01AB1234',
      driverName: 'Raju Kumar',
      status: 'Delivered'
    },
    {
      id: 2,
      lotNumber: 'LOT002',
      destination: 'Dyeing Unit B',
      quantity: 150,
      deliveryDate: '2024-06-08',
      vehicleNumber: 'TN02CD5678',
      driverName: 'Murugan S',
      status: 'In Transit'
    }
  ];

  useEffect(() => {
    setDeliveries(mockDeliveries);
  }, []);

  const handleSubmit = () => {
    const newDelivery = {
      ...formData,
      id: Date.now(),
      quantity: parseFloat(formData.quantity) || 0
    };
    setDeliveries(prev => [...prev, newDelivery]);
    setOpenDialog(false);
    setFormData({
      lotNumber: '',
      destination: '',
      quantity: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      vehicleNumber: '',
      driverName: '',
      status: 'Pending'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'success';
      case 'In Transit': return 'warning';
      case 'Pending': return 'default';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#670d10' }}>
          Greige Yarn Delivery Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ backgroundColor: '#670d10', '&:hover': { backgroundColor: '#8b1214' } }}
        >
          Schedule Delivery
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Total Deliveries
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                {deliveries.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                In Transit
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                {deliveries.filter(d => d.status === 'In Transit').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Delivered
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                {deliveries.filter(d => d.status === 'Delivered').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #670d10 0%, #8b1214 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Total Weight
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                {deliveries.reduce((sum, d) => sum + d.quantity, 0)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Kg
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#670d10', fontWeight: 'bold' }}>
          Delivery Schedule
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Lot Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Destination</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Quantity (Kg)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Delivery Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Vehicle</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Driver</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{delivery.lotNumber}</TableCell>
                  <TableCell>{delivery.destination}</TableCell>
                  <TableCell>{delivery.quantity}</TableCell>
                  <TableCell>{delivery.deliveryDate}</TableCell>
                  <TableCell>{delivery.vehicleNumber}</TableCell>
                  <TableCell>{delivery.driverName}</TableCell>
                  <TableCell>
                    <Chip 
                      label={delivery.status} 
                      color={getStatusColor(delivery.status)}
                      size="small"
                      icon={delivery.status === 'In Transit' ? <ShippingIcon /> : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#670d10', color: 'white' }}>
          Schedule New Delivery
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Lot Number"
                value={formData.lotNumber}
                onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Quantity (Kg)"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Delivery Date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Vehicle Number"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Driver Name"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                margin="normal"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ backgroundColor: '#670d10', '&:hover': { backgroundColor: '#8b1214' } }}
          >
            Schedule Delivery
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GreigeYarnDelivery; 