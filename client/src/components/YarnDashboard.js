import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
  Alert
} from '@mui/material';
import {
  Inventory,
  TrendingUp,
  Warning,
  CheckCircle,
  LocalShipping,
  Assignment
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #8B0000 0%, #A52A2A 100%)',
  color: 'white',
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  textAlign: 'center',
}));

// Mock yarn data
const yarnStats = {
  totalStock: 15420,
  lowStock: 23,
  pending: 8,
  delivered: 156
};

const yarnInventory = [
  { id: 'Y001', type: 'Cotton 40s', color: 'White', stock: 2400, unit: 'kg', status: 'Good', lastUpdated: '2024-06-08' },
  { id: 'Y002', type: 'Cotton 60s', color: 'Natural', stock: 1800, unit: 'kg', status: 'Good', lastUpdated: '2024-06-08' },
  { id: 'Y003', type: 'Polyester', color: 'White', stock: 150, unit: 'kg', status: 'Low', lastUpdated: '2024-06-07' },
  { id: 'Y004', type: 'Cotton 20s', color: 'Dyed Blue', stock: 3200, unit: 'kg', status: 'Good', lastUpdated: '2024-06-08' },
  { id: 'Y005', type: 'Viscose', color: 'Beige', stock: 80, unit: 'kg', status: 'Critical', lastUpdated: '2024-06-06' },
  { id: 'Y006', type: 'Cotton 30s', color: 'White', stock: 2800, unit: 'kg', status: 'Good', lastUpdated: '2024-06-08' },
];

const recentDeliveries = [
  { id: 'D001', supplier: 'ABC Yarn Mills', type: 'Cotton 40s', quantity: 500, date: '2024-06-08', status: 'Delivered' },
  { id: 'D002', supplier: 'XYZ Textiles', type: 'Polyester', quantity: 200, date: '2024-06-07', status: 'In Transit' },
  { id: 'D003', supplier: 'Premium Yarns', type: 'Viscose', quantity: 300, date: '2024-06-06', status: 'Delivered' },
];

function YarnDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Good': return 'success';
      case 'Low': return 'warning';
      case 'Critical': return 'error';
      default: return 'default';
    }
  };

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return 'success';
      case 'In Transit': return 'info';
      case 'Pending': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" gutterBottom>Loading Yarn Dashboard...</Typography>
          <LinearProgress sx={{ mt: 2, maxWidth: 400, mx: 'auto' }} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header Section */}
      <HeaderSection>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: '#8B0000', width: 56, height: 56 }}>
            <Inventory sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h3" component="h1" sx={{ color: '#8B0000', fontWeight: 'bold' }}>
            Yarn Management Dashboard
          </Typography>
        </Box>
        <Typography variant="h6" color="textSecondary">
          Monitor and manage yarn inventory, deliveries, and stock levels
        </Typography>
      </HeaderSection>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Inventory sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {yarnStats.totalStock.toLocaleString()}
            </Typography>
            <Typography variant="body2">Total Stock (kg)</Typography>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <Warning sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {yarnStats.lowStock}
            </Typography>
            <Typography variant="body2">Low Stock Items</Typography>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <LocalShipping sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {yarnStats.pending}
            </Typography>
            <Typography variant="body2">Pending Deliveries</Typography>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard>
            <CheckCircle sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {yarnStats.delivered}
            </Typography>
            <Typography variant="body2">Delivered This Month</Typography>
          </StatCard>
        </Grid>
      </Grid>

      {/* Content Grid */}
      <Grid container spacing={3}>
        {/* Yarn Inventory Table */}
        <Grid item xs={12} lg={8}>
          <StyledCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assignment sx={{ mr: 1, color: '#8B0000' }} />
                <Typography variant="h6" component="div" sx={{ color: '#8B0000', fontWeight: 'bold' }}>
                  Current Yarn Inventory
                </Typography>
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Yarn ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Color</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Last Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {yarnInventory.map((yarn) => (
                      <TableRow key={yarn.id} hover>
                        <TableCell sx={{ fontWeight: 'bold', color: '#8B0000' }}>{yarn.id}</TableCell>
                        <TableCell>{yarn.type}</TableCell>
                        <TableCell>{yarn.color}</TableCell>
                        <TableCell>{yarn.stock.toLocaleString()} {yarn.unit}</TableCell>
                        <TableCell>
                          <Chip 
                            label={yarn.status} 
                            color={getStatusColor(yarn.status)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{yarn.lastUpdated}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Recent Deliveries */}
        <Grid item xs={12} lg={4}>
          <StyledCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalShipping sx={{ mr: 1, color: '#8B0000' }} />
                <Typography variant="h6" component="div" sx={{ color: '#8B0000', fontWeight: 'bold' }}>
                  Recent Deliveries
                </Typography>
              </Box>
              
              {recentDeliveries.map((delivery) => (
                <Box key={delivery.id} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#8B0000' }}>
                    {delivery.id} - {delivery.type}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Supplier: {delivery.supplier}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Quantity: {delivery.quantity} kg
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Date: {delivery.date}
                  </Typography>
                  <Chip 
                    label={delivery.status} 
                    color={getDeliveryStatusColor(delivery.status)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              ))}
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Stock Alerts */}
        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" component="div" sx={{ color: '#8B0000', fontWeight: 'bold', mb: 2 }}>
                Stock Alerts & Notifications
              </Typography>
              
              <Alert severity="error" sx={{ mb: 1 }}>
                <strong>Critical Stock:</strong> Viscose (Beige) - Only 80 kg remaining. Immediate reorder required.
              </Alert>
              
              <Alert severity="warning" sx={{ mb: 1 }}>
                <strong>Low Stock:</strong> Polyester (White) - 150 kg remaining. Consider reordering soon.
              </Alert>
              
              <Alert severity="info" sx={{ mb: 1 }}>
                <strong>Delivery Update:</strong> XYZ Textiles delivery of 200 kg Polyester is in transit, expected tomorrow.
              </Alert>
              
              <Alert severity="success">
                <strong>Stock Updated:</strong> Cotton 40s inventory updated to 2,400 kg after today's delivery.
              </Alert>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: '#8B0000', 
                '&:hover': { bgcolor: '#660000' },
                px: 4,
                py: 1.5
              }}
            >
              Request New Yarn Order
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              sx={{ 
                borderColor: '#8B0000', 
                color: '#8B0000',
                '&:hover': { borderColor: '#660000', color: '#660000' },
                px: 4,
                py: 1.5
              }}
            >
              Update Inventory
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="outlined" 
              sx={{ 
                borderColor: '#8B0000', 
                color: '#8B0000',
                '&:hover': { borderColor: '#660000', color: '#660000' },
                px: 4,
                py: 1.5
              }}
            >
              Generate Report
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default YarnDashboard; 