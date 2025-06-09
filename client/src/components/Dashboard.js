import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ListIcon from '@mui/icons-material/List';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import HistoryIcon from '@mui/icons-material/History';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [counts, setCounts] = React.useState({
    activeOrders: 0,
    activeWarps: 0,
    pendingFabricCuts: 0,
    loomInToday: 0
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Only fetch fabric production counts for admin and fabric users
    if (user?.fullAccess || user?.fabricAccess) {
      fetchCounts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCounts = async () => {
    try {
      const [ordersRes, warpsRes, fabricCutsRes, loomInRes] = await Promise.all([
        fetch('/api/orders/count/active'),
        fetch('/api/warps/count/active'),
        fetch('/api/fabric-cuts/pending-inspection-count'),
        fetch('/api/fabric-cuts/recent-inspections')
      ]);

      const ordersData = await ordersRes.json();
      const warpsData = await warpsRes.json();
      const fabricCutsData = await fabricCutsRes.json();
      const loomInData = await loomInRes.json();

      setCounts({
        activeOrders: ordersData.count || 0,
        activeWarps: warpsData.count || 0,
        pendingFabricCuts: fabricCutsData.count || 0,
        loomInToday: Array.isArray(loomInData) ? loomInData.length : 0
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fabric production menu items for admin and fabric managers
  const fabricMenuItems = [
    {
      title: 'Orders',
      description: 'Create and manage fabric orders',
      newPath: '/orders/new',
      listPath: '/orders',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      count: counts.activeOrders,
      countLabel: 'Active Orders'
    },
    {
      title: 'Warps',
      description: 'Manage warp orders and loom assignments',
      newPath: '/warps/new',
      listPath: '/warps',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      count: counts.activeWarps,
      countLabel: 'Active Warps'
    },
    {
      title: 'Fabric Cuts',
      description: 'Record fabric cuts and generate QR codes',
      newPath: '/fabric-cuts/new',
      listPath: '/fabric-cuts',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      count: counts.pendingFabricCuts,
      countLabel: 'Pending Inspection'
    },
  ];

  // Yarn management menu items for yarn managers
  const yarnMenuItems = [
    {
      title: 'Greige Yarn Input',
      description: 'Manage incoming raw yarn batches',
      icon: <AddIcon />,
      path: '/yarn/greige-input',
      gradient: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
      count: '12',
      countLabel: 'Active Lots'
    },
    {
      title: 'Greige Yarn Delivery',
      description: 'Schedule deliveries to dyeing units',
      icon: <LocalShippingIcon />,
      path: '/yarn/greige-delivery',
      gradient: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)',
      count: '5',
      countLabel: 'Pending Deliveries'
    },
    {
      title: 'Dyed Yarn Input',
      description: 'Manage dyed yarn batches with colors',
      icon: <AddIcon />,
      path: '/yarn/dyed-input',
      gradient: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
      count: '8',
      countLabel: 'Dyed Batches'
    },
    {
      title: 'Dyed Yarn Delivery',
      description: 'Schedule deliveries to weaving units',
      icon: <LocalShippingIcon />,
      path: '/yarn/dyed-delivery',
      gradient: 'linear-gradient(135deg, #670d10 0%, #8b1214 100%)',
      count: '3',
      countLabel: 'In Transit'
    },
    {
      title: 'Yarn Inventory',
      description: 'Track all yarn stock levels and alerts',
      icon: <InventoryIcon />,
      path: '/yarn/inventory',
      gradient: 'linear-gradient(135deg, #7b1fa2 0%, #9c27b0 100%)',
      count: '850kg',
      countLabel: 'Total Stock'
    }
  ];

  const getRoleBasedWelcome = () => {
    if (user?.yarnOnly) {
      return {
        title: 'Yarn Management Dashboard',
        subtitle: `Welcome ${user.username}! Manage yarn input, delivery, and inventory operations.`,
        color: '#670d10'
      };
    } else if (user?.fullAccess) {
      return {
        title: 'Admin Dashboard',
        subtitle: `Welcome back, ${user.username}! You have full access to all production management features.`,
        color: '#8B0000'
      };
    } else if (user?.fabricAccess) {
      return {
        title: 'Fabric Management Dashboard', 
        subtitle: `Welcome ${user.username}! Manage orders, warps, fabric cuts, and loom operations.`,
        color: '#8B0000'
      };
    }
    return {
      title: 'Production Dashboard',
      subtitle: 'Welcome to the production management system.',
      color: '#8B0000'
    };
  };

  const welcome = getRoleBasedWelcome();
  const menuItems = user?.yarnOnly ? yarnMenuItems : fabricMenuItems;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center', p: 3, backgroundColor: '#f5f7fa', borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: welcome.color, fontWeight: 'bold' }}>
          {welcome.title}
        </Typography>
        <Typography variant="h6" color="textSecondary">
          {welcome.subtitle}
        </Typography>
        {user && (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
            Logged in as: <strong>{user.role}</strong> • Session started: {new Date(user.loginTime).toLocaleTimeString()}
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Yarn Management Cards */}
        {user?.yarnOnly ? (
          yarnMenuItems.map((item) => (
            <Grid item xs={12} md={4} lg={2.4} key={item.title}>
              <Card sx={{ 
                background: item.gradient,
                color: 'white',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                }
              }}
              onClick={() => navigate(item.path)}>
                <CardContent sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  height: '100%',
                  '&:last-child': { pb: 2 }
                }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h2" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                        {item.title}
                      </Typography>
                      <Chip 
                        label={item.count}
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    <Typography color="inherit" gutterBottom sx={{ opacity: 0.9, fontSize: '0.85rem', mb: 1 }}>
                      {item.description}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                      {item.countLabel}: {item.count}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center' }}>
                    {item.icon}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          /* Fabric Management Cards */
          <>
            {fabricMenuItems.map((item) => (
              <Grid item xs={12} md={3} key={item.title}>
                <Card sx={{ 
                  background: item.gradient,
                  color: 'white',
                  height: '200px',
                  minHeight: '200px',
                  maxHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <CardContent sx={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    height: '100%',
                    '&:last-child': { pb: 2 }
                  }}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h5" component="h2">
                          {item.title}
                        </Typography>
                        <Chip 
                          label={loading ? '...' : item.count}
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)', 
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                      <Typography color="inherit" gutterBottom sx={{ opacity: 0.9, fontSize: '0.9rem' }}>
                        {item.description}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                        {item.countLabel}: {loading ? '...' : item.count}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 'auto' }}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate(item.newPath)}
                        sx={{ 
                          mr: 1, 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                        }}
                      >
                        New
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ListIcon />}
                        onClick={() => navigate(item.listPath)}
                        sx={{ 
                          borderColor: 'rgba(255,255,255,0.5)', 
                          color: 'white',
                          '&:hover': { 
                            borderColor: 'white', 
                            bgcolor: 'rgba(255,255,255,0.1)' 
                          }
                        }}
                      >
                        View All
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            
            {/* Loom-In Section for fabric users */}
            <Grid item xs={12} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                height: '200px',
                minHeight: '200px',
                maxHeight: '200px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <CardContent sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  height: '100%',
                  '&:last-child': { pb: 2 }
                }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h5" component="h2">
                        Loom-In
                      </Typography>
                      <Chip 
                        label={loading ? '...' : counts.loomInToday}
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    <Typography color="inherit" gutterBottom sx={{ opacity: 0.9, fontSize: '0.9rem' }}>
                      Scan fabric cuts arriving at inspection area
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                      Today's Arrivals: {loading ? '...' : counts.loomInToday}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 'auto' }}>
                    <Button
                      variant="contained"
                      startIcon={<QrCodeScannerIcon />}
                      onClick={() => navigate('/loom-in/scan')}
                      sx={{ 
                        mr: 1, 
                        bgcolor: 'rgba(255,255,255,0.2)', 
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                      }}
                    >
                      New Scan
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<HistoryIcon />}
                      onClick={() => navigate('/loom-in/history')}
                      sx={{ 
                        borderColor: 'rgba(255,255,255,0.5)', 
                        color: 'white',
                        '&:hover': { 
                          borderColor: 'white', 
                          bgcolor: 'rgba(255,255,255,0.1)' 
                        }
                      }}
                    >
                      History
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>
    </Container>
  );
}

export default Dashboard; 