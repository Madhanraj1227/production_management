import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { Add as AddIcon, LocalShipping as ShippingIcon, Palette as PaletteIcon } from '@mui/icons-material';

function DyedYarnDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({ batchNumber: '', color: '', destination: '', quantity: '', deliveryDate: new Date().toISOString().split('T')[0], vehicleNumber: '', driverName: '', status: 'Pending' });

  const mockDeliveries = [
    { id: 1, batchNumber: 'DY001', color: 'Navy Blue', destination: 'Weaving Unit A', quantity: 150, deliveryDate: '2024-06-09', vehicleNumber: 'TN01CD9876', driverName: 'Kumar R', status: 'Delivered' },
    { id: 2, batchNumber: 'DY002', color: 'Crimson Red', destination: 'Weaving Unit B', quantity: 100, deliveryDate: '2024-06-08', vehicleNumber: 'TN02EF5432', driverName: 'Selvam K', status: 'In Transit' }
  ];

  useEffect(() => { setDeliveries(mockDeliveries); }, []);

  const handleSubmit = () => {
    const newDelivery = { ...formData, id: Date.now(), quantity: parseFloat(formData.quantity) || 0 };
    setDeliveries(prev => [...prev, newDelivery]);
    setOpenDialog(false);
    setFormData({ batchNumber: '', color: '', destination: '', quantity: '', deliveryDate: new Date().toISOString().split('T')[0], vehicleNumber: '', driverName: '', status: 'Pending' });
  };

  const getStatusColor = (status) => ({'Delivered': 'success', 'In Transit': 'warning', 'Pending': 'default', 'Cancelled': 'error'}[status] || 'default');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#670d10' }}>Dyed Yarn Delivery Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)} sx={{ backgroundColor: '#670d10', '&:hover': { backgroundColor: '#8b1214' } }}>Schedule Delivery</Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { title: 'Total Deliveries', value: deliveries.length, color: '#2e7d32' },
          { title: 'In Transit', value: deliveries.filter(d => d.status === 'In Transit').length, color: '#f57c00' },
          { title: 'Delivered', value: deliveries.filter(d => d.status === 'Delivered').length, color: '#1976d2' },
          { title: 'Total Weight', value: `${deliveries.reduce((sum, d) => sum + d.quantity, 0)} Kg`, color: '#670d10' }
        ].map((stat, index) => (
          <Grid item xs={12} md={3} key={index}>
            <Card sx={{ background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}dd 100%)` }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>{stat.title}</Typography>
                <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>{stat.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#670d10', fontWeight: 'bold' }}>Dyed Yarn Delivery Schedule</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                {['Batch Number', 'Color', 'Destination', 'Quantity (Kg)', 'Delivery Date', 'Vehicle', 'Driver', 'Status'].map(header => (
                  <TableCell key={header} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{delivery.batchNumber}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PaletteIcon sx={{ color: delivery.color.toLowerCase().includes('blue') ? 'blue' : delivery.color.toLowerCase().includes('red') ? 'red' : '#666' }} />
                      {delivery.color}
                    </Box>
                  </TableCell>
                  <TableCell>{delivery.destination}</TableCell>
                  <TableCell>{delivery.quantity}</TableCell>
                  <TableCell>{delivery.deliveryDate}</TableCell>
                  <TableCell>{delivery.vehicleNumber}</TableCell>
                  <TableCell>{delivery.driverName}</TableCell>
                  <TableCell>
                    <Chip label={delivery.status} color={getStatusColor(delivery.status)} size="small" icon={delivery.status === 'In Transit' ? <ShippingIcon /> : undefined} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#670d10', color: 'white' }}>Schedule Dyed Yarn Delivery</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {[
              { key: 'batchNumber', label: 'Batch Number' },
              { key: 'color', label: 'Color' },
              { key: 'destination', label: 'Destination' },
              { key: 'quantity', label: 'Quantity (Kg)', type: 'number' },
              { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
              { key: 'vehicleNumber', label: 'Vehicle Number' },
              { key: 'driverName', label: 'Driver Name' }
            ].map(field => (
              <Grid item xs={12} md={6} key={field.key}>
                <TextField fullWidth {...field} value={formData[field.key]} onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })} margin="normal" InputLabelProps={field.type === 'date' ? { shrink: true } : undefined} />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#670d10', '&:hover': { backgroundColor: '#8b1214' } }}>Schedule Delivery</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DyedYarnDelivery; 