import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, TextField, InputAdornment, Tab, Tabs } from '@mui/material';
import { Search as SearchIcon, Inventory as InventoryIcon, TrendingUp as TrendingUpIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

function YarnInventory() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [greigeInventory, setGreigeInventory] = useState([]);
  const [dyedInventory, setDyedInventory] = useState([]);

  const mockGreigeInventory = [
    { id: 1, lotNumber: 'LOT001', yarnType: 'Cotton', count: '30s', currentStock: 320, initialStock: 500, supplier: 'Cotton Mills Ltd', location: 'Warehouse A', status: 'In Stock' },
    { id: 2, lotNumber: 'LOT002', yarnType: 'Polyester', count: '40s', currentStock: 80, initialStock: 300, supplier: 'Textile Suppliers Co', location: 'Warehouse B', status: 'Low Stock' },
    { id: 3, lotNumber: 'LOT003', yarnType: 'Cotton Blend', count: '20s', currentStock: 450, initialStock: 600, supplier: 'Premium Textiles', location: 'Warehouse A', status: 'In Stock' }
  ];

  const mockDyedInventory = [
    { id: 1, batchNumber: 'DY001', color: 'Navy Blue', count: '30s', currentStock: 130, initialStock: 180, originalLot: 'LOT001', location: 'Dyed Storage A', status: 'In Stock' },
    { id: 2, batchNumber: 'DY002', color: 'Crimson Red', count: '40s', currentStock: 20, initialStock: 120, originalLot: 'LOT002', location: 'Dyed Storage B', status: 'Critical' },
    { id: 3, batchNumber: 'DY003', color: 'Forest Green', count: '20s', currentStock: 200, initialStock: 300, originalLot: 'LOT003', location: 'Dyed Storage A', status: 'In Stock' }
  ];

  useEffect(() => {
    setGreigeInventory(mockGreigeInventory);
    setDyedInventory(mockDyedInventory);
  }, []);

  const getStockLevel = (current, initial) => {
    const percentage = (current / initial) * 100;
    if (percentage < 20) return 'critical';
    if (percentage < 40) return 'low';
    return 'good';
  };

  const getStatusColor = (status) => ({
    'In Stock': 'success', 'Low Stock': 'warning', 'Critical': 'error', 'Out of Stock': 'default'
  }[status] || 'default');

  const getStockIcon = (level) => {
    switch(level) {
      case 'critical': return <WarningIcon sx={{ color: '#d32f2f' }} />;
      case 'low': return <TrendingUpIcon sx={{ color: '#f57c00' }} />;
      default: return <CheckCircleIcon sx={{ color: '#2e7d32' }} />;
    }
  };

  const filterData = (data, isGreige = true) => {
    return data.filter(item => {
      const searchTarget = isGreige 
        ? `${item.lotNumber} ${item.yarnType} ${item.supplier}`.toLowerCase()
        : `${item.batchNumber} ${item.color} ${item.originalLot}`.toLowerCase();
      return searchTarget.includes(searchQuery.toLowerCase());
    });
  };

  const totalGreigeStock = greigeInventory.reduce((sum, item) => sum + item.currentStock, 0);
  const totalDyedStock = dyedInventory.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockItems = [...greigeInventory, ...dyedInventory].filter(item => getStockLevel(item.currentStock, item.initialStock) !== 'good').length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#670d10', mb: 3 }}>
        Yarn Inventory Management
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { title: 'Total Greige Stock', value: `${totalGreigeStock} Kg`, icon: <InventoryIcon />, color: '#2e7d32' },
          { title: 'Total Dyed Stock', value: `${totalDyedStock} Kg`, icon: <InventoryIcon />, color: '#1976d2' },
          { title: 'Low Stock Alerts', value: lowStockItems, icon: <WarningIcon />, color: '#f57c00' },
          { title: 'Total Value', value: '₹12.5L', icon: <TrendingUpIcon />, color: '#670d10' }
        ].map((stat, index) => (
          <Grid item xs={12} md={3} key={index}>
            <Card sx={{ background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}dd 100%)` }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>{stat.title}</Typography>
                    <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>{stat.value}</Typography>
                  </Box>
                  <Box sx={{ color: 'rgba(255,255,255,0.8)' }}>{stat.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by lot number, yarn type, color, or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500 }}
        />
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Greige Yarn Inventory" />
          <Tab label="Dyed Yarn Inventory" />
        </Tabs>
      </Paper>

      {/* Inventory Tables */}
      <Paper sx={{ p: 2 }}>
        {activeTab === 0 ? (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: '#670d10', fontWeight: 'bold' }}>
              Greige Yarn Stock ({filterData(greigeInventory).length} items)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    {['Lot Number', 'Yarn Type', 'Count', 'Current Stock', 'Initial Stock', 'Stock Level', 'Supplier', 'Location', 'Status'].map(header => (
                      <TableCell key={header} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filterData(greigeInventory).map((item) => {
                    const stockLevel = getStockLevel(item.currentStock, item.initialStock);
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{item.lotNumber}</TableCell>
                        <TableCell>{item.yarnType}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStockIcon(stockLevel)}
                            {item.currentStock} Kg
                          </Box>
                        </TableCell>
                        <TableCell>{item.initialStock} Kg</TableCell>
                        <TableCell>
                          <Chip 
                            label={`${Math.round((item.currentStock/item.initialStock)*100)}%`} 
                            color={stockLevel === 'good' ? 'success' : stockLevel === 'low' ? 'warning' : 'error'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>{item.supplier}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>
                          <Chip label={item.status} color={getStatusColor(item.status)} size="small" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2, color: '#670d10', fontWeight: 'bold' }}>
              Dyed Yarn Stock ({filterData(dyedInventory, false).length} items)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    {['Batch Number', 'Color', 'Count', 'Current Stock', 'Initial Stock', 'Stock Level', 'Original Lot', 'Location', 'Status'].map(header => (
                      <TableCell key={header} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filterData(dyedInventory, false).map((item) => {
                    const stockLevel = getStockLevel(item.currentStock, item.initialStock);
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{item.batchNumber}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 20, height: 20, borderRadius: '50%', 
                              backgroundColor: item.color.toLowerCase().includes('blue') ? 'blue' : 
                                            item.color.toLowerCase().includes('red') ? 'red' : 
                                            item.color.toLowerCase().includes('green') ? 'green' : '#666'
                            }} />
                            {item.color}
                          </Box>
                        </TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStockIcon(stockLevel)}
                            {item.currentStock} Kg
                          </Box>
                        </TableCell>
                        <TableCell>{item.initialStock} Kg</TableCell>
                        <TableCell>
                          <Chip 
                            label={`${Math.round((item.currentStock/item.initialStock)*100)}%`} 
                            color={stockLevel === 'good' ? 'success' : stockLevel === 'low' ? 'warning' : 'error'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>{item.originalLot}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>
                          <Chip label={item.status} color={getStatusColor(item.status)} size="small" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>
    </Box>
  );
}

export default YarnInventory; 