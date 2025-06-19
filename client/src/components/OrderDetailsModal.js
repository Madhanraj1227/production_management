import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box,
  Tabs, 
  Tab, 
  Chip, 
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Card,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import { Warning as WarningIcon, ExpandMore as ExpandMoreIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import axios from 'axios';
import { useTheme } from '@mui/material/styles';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const OrderDetailsModal = ({ open, onClose, order }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [currentInspectionTab, setCurrentInspectionTab] = useState(0);
  const [productionData, setProductionData] = useState([]);
  const [inspectionData, setInspectionData] = useState([]);
  const [productionView, setProductionView] = useState('warp'); // 'warp' or 'date'
  const [processingData, setProcessingData] = useState([]);
  
  // Debug: Log productionView changes
  useEffect(() => {
    console.log('Production view changed to:', productionView);
  }, [productionView]);
  
  const [loading, setLoading] = useState({
    production: false,
    inspection: false,
    processing: false
  });
  
  const [error, setError] = useState({
    production: '',
    inspection: '',
    processing: ''
  });

  const totalWarpQuantity = useMemo(() => {
    if (!productionData) return 0;
    return productionData.reduce((sum, { warp }) => sum + (warp.quantity || 0), 0);
  }, [productionData]);

  const totalProductionQuantity = useMemo(() => {
      if (!productionData) return 0;
      return productionData.reduce((sum, { summary }) => sum + summary.totalProduction, 0);
  }, [productionData]);

  const theme = useTheme();

  const buildApiUrl = (endpoint) => {
    if (process.env.NODE_ENV === 'production') {
      return `/api/${endpoint}`;
    }
    return `http://localhost:3002/api/${endpoint}`;
  };

  useEffect(() => {
    if (open && order) {
      setCurrentTab(0);
      fetchProductionData();
      fetchInspectionData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 2 && inspectionData.fourPoint.length === 0) {
      fetchInspectionData();
    } else if (newValue === 3 && processingData.length === 0) {
      fetchProcessingData();
    }
  };

  const handleInspectionTabChange = (event, newValue) => {
    setCurrentInspectionTab(newValue);
  };

  const fetchInspectionData = async () => {
    if (!order) return;
    setLoading(prev => ({ ...prev, inspection: true }));
    setError(prev => ({ ...prev, inspection: '' }));
    try {
      const response = await axios.get(buildApiUrl(`inspections/by-order/${order.id}`));
      console.log("Fetched inspection data:", response.data);
      setInspectionData(response.data);
    } catch (err) {
      console.error('Error fetching inspection data:', err);
      setError(prev => ({ ...prev, inspection: 'Failed to load inspection data' }));
    } finally {
      setLoading(prev => ({ ...prev, inspection: false }));
    }
  };

  const fetchProcessingData = async () => {
    if (!order) return;
    
    setLoading(prev => ({ ...prev, processing: true }));
    setError(prev => ({ ...prev, processing: '' }));
    
        try {
            const response = await axios.get(buildApiUrl(`processing-orders/by-order/${order.id}`));
            setProcessingData(response.data || []);
        } catch (err) {
      console.error('Error fetching processing data:', err);
      setError(prev => ({ ...prev, processing: 'Failed to load processing data' }));
    } finally {
      setLoading(prev => ({ ...prev, processing: false }));
    }
  };

  const fetchProductionData = async () => {
    if (!order) return;
    
    setLoading(prev => ({ ...prev, production: true }));
    setError(prev => ({ ...prev, production: '' }));
    
    try {
      console.log('Fetching production data for order:', order.id);
      
      // First fetch warps for this order
      const warpsResponse = await axios.get(buildApiUrl(`warps/by-order/${order.id}`));
      const warps = warpsResponse.data;
      console.log('Warps fetched:', warps);
      
      // Then fetch fabric cuts for each warp
      const productionData = [];
      for (const warp of warps) {
        console.log(`Fetching fabric cuts for warp ${warp.id} (${warp.warpOrderNumber})`);
        
        try {
          const fabricCutsResponse = await axios.get(buildApiUrl(`fabric-cuts/by-warp/${warp.id}`));
          const fabricCuts = fabricCutsResponse.data;
          
          console.log(`Fabric cuts for warp ${warp.id}:`, fabricCuts);
          console.log(`Found ${fabricCuts.length} fabric cuts`);
          
          // Calculate production summary
          const totalProduction = fabricCuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0);
          const totalCuts = fabricCuts.length;
          
          console.log(`Total production for warp ${warp.id}: ${totalProduction}m from ${totalCuts} cuts`);
          
          productionData.push({
            warp,
            fabricCuts,
            summary: {
              totalProduction: parseFloat(totalProduction.toFixed(2)),
              totalCuts
            }
          });
        } catch (fabricError) {
          console.error(`Error fetching fabric cuts for warp ${warp.id}:`, fabricError);
          console.error('Error details:', fabricError.response?.data);
          
          // Still include the warp even if fabric cuts fail to load
          productionData.push({
            warp,
            fabricCuts: [],
            summary: {
              totalProduction: 0,
              totalCuts: 0
            }
          });
        }
      }
      
      console.log('Final production data:', productionData);
      setProductionData(productionData);
    } catch (error) {
      console.error('Error fetching production data:', error);
      console.error('Error details:', error.response?.data);
      setError(prev => ({ ...prev, production: 'Failed to load production data' }));
    } finally {
      setLoading(prev => ({ ...prev, production: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
     if (isNaN(date.getTime())) {
        // Handle Firestore timestamp objects
        if (dateString._seconds) {
            const d = new Date(dateString._seconds * 1000);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
            }
        }
        return 'Invalid Date';
    }
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
  };

  const processDateWiseData = () => {
    console.log('Starting processDateWiseData with:', productionData);
    if (!productionData || productionData.length === 0) {
      console.log('No production data, returning empty.');
      return { dateRanges: [], timelineDates: [], dailyTotals: {} };
    }

    try {
      let allFabricCuts = [];
      let maxWarpEndDate = null;

      productionData.forEach(p => {
        if (p.fabricCuts && p.fabricCuts.length > 0) {
          allFabricCuts = [...allFabricCuts, ...p.fabricCuts];
        }
        // Track the latest warp end date
        const warpEndDate = p.warp.endDate ? (p.warp.endDate._seconds ? new Date(p.warp.endDate._seconds * 1000) : new Date(p.warp.endDate)) : null;
        if (warpEndDate && (!maxWarpEndDate || warpEndDate > maxWarpEndDate)) {
          maxWarpEndDate = warpEndDate;
        }
      });
      console.log('All fabric cuts combined:', allFabricCuts.length);
      console.log('Latest warp end date found:', maxWarpEndDate);

      let minDate, maxDate;
      const validCuts = allFabricCuts.filter(cut => cut.createdAt);
      console.log('Cuts with valid createdAt:', validCuts.length);

      if (validCuts.length > 0) {
        const timestamps = validCuts.map(cut => new Date(cut.createdAt._seconds ? cut.createdAt._seconds * 1000 : cut.createdAt).getTime());
        minDate = new Date(Math.min(...timestamps));
        maxDate = new Date(Math.max(...timestamps));
      } else {
        // If no cuts, use today's date, but check against warp dates later
        minDate = new Date();
        maxDate = new Date();
      }

      // The final timeline must extend to the latest of fabric cuts or warp end dates
      if (maxWarpEndDate && maxWarpEndDate > maxDate) {
        maxDate = maxWarpEndDate;
      }
      
      minDate.setHours(0, 0, 0, 0);
      maxDate.setHours(23, 59, 59, 999);
      console.log('Initial date range from fabric cuts:', { minDate, maxDate });
      
      const dateRanges = productionData.map(p => {
        const { warp, fabricCuts, summary } = p;
        const startDate = warp.startDate && warp.startDate._seconds ? new Date(warp.startDate._seconds * 1000) : (warp.startDate ? new Date(warp.startDate) : null);
        const endDate = warp.endDate && warp.endDate._seconds ? new Date(warp.endDate._seconds * 1000) : (warp.endDate ? new Date(warp.endDate) : null);

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);
        
        if (startDate && startDate < minDate) minDate = new Date(startDate);
        if (endDate && endDate > maxDate) maxDate = new Date(endDate);
        
        const dailyProduction = {};
        if (fabricCuts) {
          fabricCuts.forEach(cut => {
            const cutDate = cut.createdAt && cut.createdAt._seconds ? new Date(cut.createdAt._seconds * 1000) : (cut.createdAt ? new Date(cut.createdAt) : null);
            if (cutDate) {
              const dateKey = cutDate.toISOString().split('T')[0];
              dailyProduction[dateKey] = (dailyProduction[dateKey] || 0) + (cut.quantity || 0);
            }
          });
        }
        
        return {
          warp,
          startDate,
          endDate,
          dailyProduction,
          totalProduction: summary.totalProduction
        };
      });
      console.log('Processed date ranges for each warp:', dateRanges);
      console.log('Final date range for timeline:', { minDate, maxDate });

      const timelineDates = [];
      if (minDate && maxDate && minDate <= maxDate) {
        // Add a day to maxDate to ensure the loop includes the final day.
        const loopEndDate = new Date(maxDate);
        loopEndDate.setDate(loopEndDate.getDate() + 1);

        let currentDate = new Date(minDate);
        currentDate.setHours(0, 0, 0, 0);

        while (currentDate < loopEndDate) {
            timelineDates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      console.log('Generated timeline dates:', timelineDates);

      const dailyTotals = {};
      timelineDates.forEach(date => {
        let total = 0;
        dateRanges.forEach(range => {
          total += (range.dailyProduction[date] || 0);
        });
        dailyTotals[date] = parseFloat(total.toFixed(2));
      });
      console.log('Calculated daily totals:', dailyTotals);

      return { dateRanges, timelineDates, dailyTotals };
    } catch (error) {
      console.error('CRITICAL ERROR in processDateWiseData:', error);
      return { dateRanges: [], timelineDates: [], dailyTotals: {} };
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'success';
      case 'running': return 'warning';
      case 'complete': return 'info';
      default: return 'default';
    }
  };

  const fourPointData = useMemo(() => {
    if (!inspectionData || !productionData) return { warps: [], summary: { totalInspected: 0, totalMistakes: 0, totalOk: 0 } };

    const fourPointInspections = inspectionData.filter(i => i.inspectionType === '4-point');
    let totalInspected = 0;
    let totalMistakes = 0;

    const warpsMap = new Map();
    // Use productionData to ensure we show all warps for the order, even if they have no inspections yet
    productionData.forEach(({ warp }) => {
        warpsMap.set(warp.id, {
            ...warp,
            inspections: [],
            summary: {
                inspected: 0,
                mistakes: 0,
                ok: 0,
                fabricCutsCount: 0
            }
        });
    });

    fourPointInspections.forEach(inspection => {
        if (inspection.fabricCut?.warpId) {
            const warp = warpsMap.get(inspection.fabricCut.warpId);
            if (warp) {
                const inspected = inspection.inspectedQuantity || 0;
                const mistakes = inspection.mistakeQuantity || 0;
                
                warp.inspections.push(inspection);
                warp.summary.inspected += inspected;
                warp.summary.mistakes += mistakes;
            }
        }
    });
    
    const warps = Array.from(warpsMap.values()).map(warp => {
        warp.summary.ok = warp.summary.inspected - warp.summary.mistakes;
        warp.summary.fabricCutsCount = warp.inspections.length;
        totalInspected += warp.summary.inspected;
        totalMistakes += warp.summary.mistakes;
        return warp;
    });

    return {
      warps,
      summary: {
        totalInspected: totalInspected,
        totalMistakes: totalMistakes,
        totalOk: totalInspected - totalMistakes
      }
    };
  }, [inspectionData, productionData]);

  // Processing data calculations
  const processingMetrics = useMemo(() => {
    if (!processingData || processingData.length === 0) {
      return {
        totalFabricCutsSent: 0,
        totalQuantitySent: 0,
        totalFabricCutsReceived: 0,
        totalQuantityReceived: 0
      };
    }

    return processingData.reduce((metrics, order) => {
      const sentCuts = order.sentFabricCuts || [];
      const receivedCuts = order.receivedFabricCuts || [];
      
      return {
        totalFabricCutsSent: metrics.totalFabricCutsSent + sentCuts.length,
        totalQuantitySent: metrics.totalQuantitySent + sentCuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0),
        totalFabricCutsReceived: metrics.totalFabricCutsReceived + receivedCuts.length,
        totalQuantityReceived: metrics.totalQuantityReceived + receivedCuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0)
      };
    }, {
      totalFabricCutsSent: 0,
      totalQuantitySent: 0,
      totalFabricCutsReceived: 0,
      totalQuantityReceived: 0
    });
  }, [processingData]);

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Order: {order.orderNumber}</Typography>
        <Chip
          label={order.status || 'NEW'}
          color={getStatusColor(order.status)}
          size="small"
          sx={{ ml: 2 }}
        />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange} 
            aria-label="order details tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Order Details" {...a11yProps(0)} />
            <Tab label="Production" {...a11yProps(1)} />
            <Tab label="Inspection" {...a11yProps(2)} />
            <Tab label="Processing" {...a11yProps(3)} />
          </Tabs>
        </Box>

        {/* Order Details Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1"><strong>Order Number:</strong> {order.orderNumber}</Typography>
                    <Typography variant="body1"><strong>Design Name:</strong> {order.designName}</Typography>
                    <Typography variant="body1"><strong>Status:</strong> {order.status}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1"><strong>Order Date:</strong> {formatDate(order.orderDate)}</Typography>
                    <Typography variant="body1"><strong>Delivery Date:</strong> {formatDate(order.deliveryDate)}</Typography>
                    <Typography variant="body1"><strong>Order Quantity:</strong> {(order.orderQuantity || 0).toFixed(2)}m</Typography>
                </Grid>
            </Grid>
              </Box>
        </TabPanel>

        {/* Production Tab */}
        <TabPanel value={currentTab} index={1}>
          {loading.production ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
              </Box>
          ) : error.production ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
              <WarningIcon color="warning" sx={{ fontSize: 48, mb: 2 }} />
              <Typography color="text.secondary">{error.production}</Typography>
              </Box>
          ) : productionData.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
              <Typography color="text.secondary">No production information available for this order.</Typography>
              </Box>
          ) : (
              <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                  <Typography variant="h6" gutterBottom>Production Information</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {productionView === 'warp' ? 'Warps created for this order and their fabric cut production' : 'Timeline view of warp production with daily fabric cuts'}
                </Typography>
              </Box>
                <ToggleButtonGroup
                  value={productionView}
                  exclusive
                  onChange={(event, newView) => {
                    console.log('Toggle button clicked:', { currentView: productionView, newView });
                    if (newView !== null) {
                      console.log('Setting production view to:', newView);
                      setProductionView(newView);
                    }
                  }}
                  aria-label="production view"
                  size="small"
                >
                  <ToggleButton value="warp" aria-label="warp wise view">
                    Warp Wise View
                  </ToggleButton>
                  <ToggleButton value="date" aria-label="date wise view">
                    Date Wise View
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                      <Paper 
                        elevation={8}
                        sx={{ 
                          p: 2, 
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                          borderRadius: 3,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 10px 20px rgba(33, 150, 243, 0.25)'
                          }
                        }}
                      >
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.dark', mb: 0.5 }}>
                            📊 Total Warp Quantity
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1565c0' }}>
                            {totalWarpQuantity.toFixed(2)}m
                          </Typography>
                      </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                       <Paper 
                        elevation={8}
                        sx={{ 
                          p: 2, 
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                          borderRadius: 3,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 10px 20px rgba(76, 175, 80, 0.25)'
                          }
                        }}
                      >
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.dark', mb: 0.5 }}>
                            🏭 Total Production
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                            {totalProductionQuantity.toFixed(2)}m
                          </Typography>
                      </Paper>
                  </Grid>
              </Grid>

              {productionView === 'warp' ? (
                // Reverted and Improved "Warp Wise View"
              <Box>
                  {productionData.map(({ warp, fabricCuts, summary }) => {
                    const isComplete = warp.status?.toLowerCase() === 'complete';
                    const isTargetMet = summary.totalProduction >= (warp.quantity || 0);
                    let verdict = 'IN PROGRESS';
                    if (isComplete) {
                      verdict = isTargetMet ? 'COMPLETED FULL' : 'COMPLETED EARLY';
                    } else if (warp.status?.toLowerCase() === 'active' && isTargetMet) {
                      verdict = 'READY TO COMPLETE';
                    } else if (warp.status?.toLowerCase() !== 'active' && !isComplete) {
                      verdict = 'PENDING';
                    }
                    
                    const getStatusChipColor = (status) => {
                      switch (status?.toLowerCase()) {
                        case 'complete': return 'success';
                        case 'active': return 'warning';
                        default: return 'default';
                      }
                    };
                    
                    const getVerdictChipColor = (v) => {
                      switch (v) {
                        case 'COMPLETED FULL': return 'success';
                        case 'COMPLETED EARLY': return 'info';
                        case 'READY TO COMPLETE': return 'warning';
                        default: return 'default';
                      }
                    };

                    return (
                      <Accordion 
                        key={warp.id}
                        sx={{ 
                          mb: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          '&:before': {
                              display: 'none',
                          },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls={`panel-${warp.id}-content`}
                          id={`panel-${warp.id}-header`}
                          sx={{ 
                            '& .MuiAccordionSummary-content': { 
                              flexDirection: 'column',
                              alignItems: 'flex-start' 
                            } 
                          }}
                        >
                          <Box sx={{ width: '100%', mb: 2 }}>
                            <Typography variant="h6">{warp.warpOrderNumber}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Loom: {warp.loom?.loomName || 'N/A'} ({warp.loom?.companyName || 'N/A'})
                            </Typography>
            </Box>

                          <Grid container spacing={1.5} alignItems="stretch">
                            {[
                                { title: 'Warp Qty', value: `${(warp.quantity || 0).toFixed(2)}m`, color: 'warning', icon: '📊' },
                                { title: 'Production', value: `${summary.totalProduction.toFixed(2)}m`, subValue: `${summary.totalCuts} cuts`, color: 'success', icon: '🏭' },
                                { title: 'Start Date', value: formatDate(warp.startDate), color: 'secondary', icon: '🚀' },
                                { title: 'End Date', value: formatDate(warp.endDate), color: 'error', icon: '🏁' },
                                { title: 'Actual End', value: formatDate(warp.completedAt || warp.completionDate), color: 'info', icon: '✅' },
                            ].map(item => (
                                <Grid item xs={4} sm md key={item.title}>
                                    <Paper 
                                        elevation={4}
                                        sx={{
                                            p: 1.5,
                                            textAlign: 'center',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            background: `linear-gradient(135deg, ${theme.palette[item.color]?.light}99 0%, ${theme.palette[item.color]?.main}99 100%)`,
                                            borderRadius: 2,
                                            transition: 'all 0.2s ease-in-out',
                                            border: '1px solid',
                                            borderColor: `${item.color}.main`,
                                            '&:hover': {
                                                transform: 'scale(1.05)',
                                                boxShadow: `0 6px 15px ${theme.palette[item.color]?.main}4D`
                                            }
                                        }}
                                    >
                                        <Typography variant="caption" display="block" sx={{ fontWeight: 600, color: `${item.color}.dark`, mb: 0.5 }}>
                                            {item.icon} {item.title}
                </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 700, color: `${item.color}.dark` }}>
                                            {item.value}
                                        </Typography>
                                        {item.subValue && <Typography variant="caption" sx={{ color: `${item.color}.dark` }}>{item.subValue}</Typography>}
                                    </Paper>
                                </Grid>
                            ))}
                             <Grid item xs={4} sm md>
                                <Paper
                                    elevation={4}
                                    sx={{
                                        p: 1.5,
                                        textAlign: 'center',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'grey.400',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                            boxShadow: `0 6px 15px ${theme.palette.grey[500]}4D`
                                        }
                                    }}
                                >
                                    <Typography variant="caption" display="block" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                                        ⚡ Status
                                    </Typography>
                                    <Chip label={warp.status || 'N/A'} color={getStatusChipColor(warp.status)} size="small" sx={{ mx: 'auto', fontWeight: 'bold' }} />
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm md>
                                 <Paper
                                    elevation={6}
                                    sx={{
                                        p: 1.5,
                                        textAlign: 'center',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        background: `linear-gradient(135deg, ${theme.palette[getVerdictChipColor(verdict)]?.light || theme.palette.grey[200]}99 0%, ${theme.palette[getVerdictChipColor(verdict)]?.main || theme.palette.grey[300]}99 100%)`,
                                        borderRadius: 2,
                                        border: `2px solid`,
                                        borderColor: `${getVerdictChipColor(verdict)}.main`,
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                            boxShadow: `0 6px 20px ${theme.palette[getVerdictChipColor(verdict)]?.main}59`
                                        }
                                    }}
                                >
                                    <Typography variant="caption" display="block" sx={{ fontWeight: 600, color: `${getVerdictChipColor(verdict)}.dark`, mb: 0.5 }}>
                                        🎯 Verdict
                                    </Typography>
                                    <Chip label={verdict} color={getVerdictChipColor(verdict)} sx={{ mx: 'auto', fontWeight: 'bold' }} />
                                </Paper>
                            </Grid>
                          </Grid>
                        </AccordionSummary>
                        <AccordionDetails sx={{ backgroundColor: '#fafafa' }}>
                           {fabricCuts.length > 0 ? (
                              <TableContainer component={Paper}>
                                <Table size="small" aria-label="fabric cuts">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Cut Number</TableCell>
                                      <TableCell align="right">Quantity (m)</TableCell>
                                      <TableCell>Scanned At</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {fabricCuts.map((cut) => (
                                      <TableRow key={cut.id}>
                                        <TableCell>{cut.cutNumber}</TableCell>
                                        <TableCell align="right">{(cut.quantity || 0).toFixed(2)}</TableCell>
                                        <TableCell>
                                          {cut.createdAt ? new Date(cut.createdAt._seconds * 1000).toLocaleString() : 'N/A'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            ) : (
                              <Typography sx={{ p: 2, textAlign: 'center' }}>
                                No fabric cuts scanned for this warp yet.
                              </Typography>
                            )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
          </Box>
              ) : (
                // Date Wise View - Full Implementation
                <Box>
                  {(() => {
                    console.log('=== RENDERING FULL DATE WISE VIEW ===');
                    console.log('Production view state:', productionView);
                    console.log('Current productionData:', productionData);
                    
                    if (!productionData || productionData.length === 0) {
                      console.log('No production data available for date wise view');
                      return (
                        <Box sx={{ textAlign: 'center', p: 4 }}>
                          <Typography color="text.secondary" variant="h6" gutterBottom>
                            No production data available
                          </Typography>
                          <Typography color="text.secondary">
                            Please ensure warps and fabric cuts are available for this order.
                          </Typography>
            </Box>
                      );
                    }
                    
                    const dateData = processDateWiseData();
                    console.log('Date data processed:', dateData);
                    
                    if (!dateData || dateData.dateRanges.length === 0 || dateData.timelineDates.length === 0) {
                      console.log('No valid date data generated');
                      return (
                        <Box sx={{ textAlign: 'center', p: 4 }}>
                          <Typography color="text.secondary" variant="h6" gutterBottom>
                            No production date data available
                          </Typography>
                          <Typography color="text.secondary">
                            Fabric cuts need to be scanned to generate the date-wise timeline view.
                          </Typography>
            </Box>
                      );
                    }
                    
                    console.log('Rendering full date wise view with data:', {
                      dateRanges: dateData.dateRanges.length,
                      timelineDates: dateData.timelineDates.length,
                      hasData: true
                    });

                    return (
            <Box>
                        {/* Daily Totals Summary */}
                        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
                            📊 Daily Production Summary
                          </Typography>
                          <Grid container spacing={2}>
                            {dateData.timelineDates.map(date => (
                              <Grid item key={date} xs={6} sm={4} md={3} lg={2}>
                                <Card variant="outlined" sx={{ 
                                  textAlign: 'center', 
                                  p: 2, 
                                  borderRadius: 2,
                                  backgroundColor: dateData.dailyTotals[date] > 0 ? '#e8f5e8' : '#ffffff',
                                  border: dateData.dailyTotals[date] > 0 ? '2px solid #4caf50' : '1px solid #e0e0e0'
                                }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </Typography>
                                  <Typography variant="h6" fontWeight="bold" color={dateData.dailyTotals[date] > 0 ? '#2e7d32' : '#666'}>
                                    {dateData.dailyTotals[date]}m
                                  </Typography>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
              </Paper>

                        {/* Traditional Gantt Chart */}
                        <Paper sx={{ p: 3, borderRadius: 2, backgroundColor: '#ffffff', overflow: 'hidden' }}>
                          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#1976d2', mb: 3, textAlign: 'center' }}>
                            📊 Production Gantt Chart
                          </Typography>
                          
                          {/* Gantt Chart Container - Scrollable */}
                          <Box sx={{ 
                            border: '2px solid #e0e0e0', 
                            borderRadius: 2, 
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            width: '100%',
                            maxWidth: '100%',
                            '&::-webkit-scrollbar': {
                              height: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                              backgroundColor: '#f1f1f1',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: '#888',
                              borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                              backgroundColor: '#555',
                            }
                          }}>
                            
                            {/* Header Row with Dates */}
                            <Box sx={{ 
                              display: 'flex', 
                              backgroundColor: '#f5f5f5', 
                              borderBottom: '2px solid #e0e0e0',
                              width: `${250 + (dateData.timelineDates.length * 120)}px`,
                              minWidth: `${250 + (dateData.timelineDates.length * 120)}px`
                            }}>
                              {/* Left Header - Warp Details */}
                              <Box sx={{ 
                                width: '250px', 
                                p: 2, 
                                borderRight: '2px solid #e0e0e0',
                                backgroundColor: '#f8f9fa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Typography variant="h6" fontWeight="bold" color="#333">
                                  Warp Details
                                </Typography>
            </Box>
                              
                              {/* Date Headers */}
                              <Box sx={{ 
                                display: 'flex', 
                                width: `${dateData.timelineDates.length * 120}px`,
                                minWidth: `${dateData.timelineDates.length * 120}px`
                              }}>
                                {dateData.timelineDates.map((date, index) => (
                                  <Box 
                                    key={date} 
                                    sx={{ 
                                      p: 1, 
                                      borderRight: index < dateData.timelineDates.length - 1 ? '1px solid #e0e0e0' : 'none',
                                      textAlign: 'center',
                                      width: '120px',
                                      minWidth: '120px',
                                      flexShrink: 0
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight="bold" color="#333">
                                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </Typography>
                                    <Typography variant="caption" color="#666" sx={{ display: 'block' }}>
                                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </Typography>
                                    {/* Daily Total Production */}
                                    <Typography variant="caption" sx={{ 
                                      display: 'block', 
                                      fontWeight: 'bold', 
                                      color: dateData.dailyTotals[date] > 0 ? '#4caf50' : '#999',
                                      backgroundColor: dateData.dailyTotals[date] > 0 ? '#e8f5e8' : 'transparent',
                                      borderRadius: 1,
                                      px: 0.5,
                                      mt: 0.5
                                    }}>
                                      {dateData.dailyTotals[date]}m
                                    </Typography>
            </Box>
                                ))}
            </Box>
            </Box>

                            {/* Gantt Rows for Each Warp */}
                            {dateData.dateRanges.map((warpRange, warpIndex) => (
                              <Box key={warpRange.warp.id} sx={{ 
                                display: 'flex', 
                                borderBottom: warpIndex < dateData.dateRanges.length - 1 ? '1px solid #e0e0e0' : 'none',
                                '&:hover': { backgroundColor: '#f9f9f9' },
                                width: `${250 + (dateData.timelineDates.length * 120)}px`,
                                minWidth: 'fit-content'
                              }}>
                                
                                {/* Warp Info Column */}
                                <Box sx={{ 
                                  width: '250px', 
                                  p: 2, 
                                  borderRight: '2px solid #e0e0e0',
                                  backgroundColor: '#fafafa'
                                }}>
                                  <Typography variant="h6" fontWeight="bold" color="#1976d2" sx={{ mb: 1 }}>
                                    {warpRange.warp.warpOrderNumber}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    Loom: {warpRange.warp.loom?.loomName || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Target: {parseFloat(warpRange.warp.quantity || 0).toFixed(2)}m
                                  </Typography>
                                  <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                                    Produced: {warpRange.totalProduction.toFixed(2)}m
                                  </Typography>
                      <Chip
                                    label={warpRange.warp.status || 'N/A'}
                                    color={
                                        warpRange.warp.status?.toLowerCase() === 'complete' ? 'success' : 
                                        warpRange.warp.status?.toLowerCase() === 'active' ? 'warning' : 'default'
                                    }
                        size="small"
                                    sx={{ mt: 1 }}
                                   />
                                </Box>

                                {/* Timeline Bars */}
                                <Box sx={{ 
                                  display: 'flex', 
                                  position: 'relative', 
                                  height: '100px',
                                  width: `${dateData.timelineDates.length * 120}px`,
                                  minWidth: `${dateData.timelineDates.length * 120}px`
                                }}>
                                  {dateData.timelineDates.map((date, dateIndex) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    
                                    const warpEndDate = warpRange.endDate ? new Date(warpRange.endDate) : null;
                                    if(warpEndDate) warpEndDate.setHours(23, 59, 59, 999);

                                    const completionTimestamp = warpRange.warp.completedAt || warpRange.warp.completionDate;
                                    const completedDate = completionTimestamp ? new Date(completionTimestamp._seconds ? completionTimestamp._seconds * 1000 : completionTimestamp) : null;
                                    if(completedDate) completedDate.setHours(0, 0, 0, 0);

                                    let productionBarColor = '#4caf50'; // Default green
                                    if (warpRange.warp.status?.toLowerCase() === 'complete') {
                                        if (completedDate && warpEndDate && completedDate > warpEndDate) {
                                            productionBarColor = '#f44336'; // Red for late completion
                                        } else {
                                            productionBarColor = '#4caf50'; // Green for on-time completion
                                        }
                                    } else if (warpRange.warp.status?.toLowerCase() === 'active') {
                                        if (warpEndDate && today > warpEndDate) {
                                            productionBarColor = '#f44336'; // Red for overdue active warps
                                        } else {
                                            productionBarColor = '#ffc107'; // Yellow for active warps
                                        }
                                    }
                                    
                                    // Check if date is in warp range
                                    let isInWarpRange = warpRange.startDate && warpRange.endDate && 
                                                      new Date(date) >= warpRange.startDate && 
                                                      new Date(date) <= warpRange.endDate;
                                    
                                    const dailyProduction = warpRange.dailyProduction[date] || 0;
                                    const maxDailyProduction = Math.max(...Object.values(warpRange.dailyProduction));
                                    const productionHeight = maxDailyProduction > 0 ? (dailyProduction / maxDailyProduction) * 40 : 0;
                                    
                                    return (
                                      <Box 
                                        key={date}
                                        sx={{ 
                                          borderRight: dateIndex < dateData.timelineDates.length - 1 ? '1px solid #e0e0e0' : 'none',
                                          position: 'relative',
                                          width: '120px',
                                          minWidth: '120px',
                                          flexShrink: 0,
                                          backgroundColor: '#fff'
                                        }}
                                      >
                                        {/* Planned Period Bar (Blue) */}
                                        {isInWarpRange && (
                                          <Box sx={{
                                            position: 'absolute',
                                            top: '20px',
                                            left: '4px',
                                            right: '4px',
                                            height: '20px',
                                            backgroundColor: '#2196f3',
                                            borderRadius: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(33,150,243,0.3)'
                                          }}>
                                            <Typography variant="caption" sx={{ 
                                              color: 'white', 
                                              fontSize: '10px', 
                                              fontWeight: 'bold' 
                                            }}>
                                              PLANNED
                                            </Typography>
            </Box>
          )}

                                        {/* Actual Production Bar */}
                                        {dailyProduction > 0 && (
                                          <Box sx={{
                                            position: 'absolute',
                                            bottom: '10px',
                                            left: '4px',
                                            right: '4px',
                                            height: `${Math.max(15, productionHeight)}px`,
                                            backgroundColor: productionBarColor,
                                            borderRadius: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(76,175,80,0.3)'
                                          }}>
                                            <Typography variant="caption" sx={{ 
                                              color: 'white', 
                                              fontSize: '10px', 
                                              fontWeight: 'bold',
                                              textShadow: '1px 1px 1px rgba(0,0,0,0.5)'
                                            }}>
                                              {dailyProduction.toFixed(1)}
                                            </Typography>
            </Box>
                                        )}

                                        {/* Completion Marker */}
                                        {completedDate && date === completedDate.toISOString().split('T')[0] && (
                                          <Tooltip title={`Completed on ${completedDate.toLocaleDateString()}`}>
                                              <CheckCircleIcon sx={{ 
                                                  position: 'absolute', 
                                                  top: '5px', 
                                                  right: '5px', 
                                                  color: 'success.main',
                                                  fontSize: '18px'
                                              }}/>
                                          </Tooltip>
                                        )}

                                        {/* Tooltip on hover */}
                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            cursor: 'pointer'
                                          }}
                                          title={`${new Date(date).toLocaleDateString()}\n${isInWarpRange ? 'Planned Period' : 'Not Planned'}\nProduction: ${dailyProduction.toFixed(2)}m`}
                                        />
            </Box>
                                    );
                                  })}
            </Box>
            </Box>
                            ))}
                          </Box>

                          {/* Legend */}
                          <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" sx={{ textAlign: 'center', mb: 2, fontWeight: 600 }}>
                              📖 Legend
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 20, height: 12, backgroundColor: '#2196f3', borderRadius: 1 }} />
                                <Typography variant="caption">Planned Period</Typography>
            </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 20, height: 12, backgroundColor: '#4caf50', borderRadius: 1 }} />
                                <Typography variant="caption">On-Time Production</Typography>
            </Box>
                               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 20, height: 12, backgroundColor: '#ffc107', borderRadius: 1 }} />
                                <Typography variant="caption">Active Production</Typography>
            </Box>
                               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 20, height: 12, backgroundColor: '#f44336', borderRadius: 1 }} />
                                <Typography variant="caption">Overdue/Late</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircleIcon sx={{ color: 'success.main', fontSize: '18px' }}/>
                                <Typography variant="caption">Completion Date</Typography>
                              </Box>
                            </Box>
                          </Box>
              </Paper>
                      </Box>
                    );
                  })()}
                </Box>
              )}
            </Box>
          )}
        </TabPanel>

        {/* Inspection Tab */}
        <TabPanel value={currentTab} index={2}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={currentInspectionTab} onChange={handleInspectionTabChange} aria-label="inspection types" variant="scrollable" scrollButtons="auto">
                    <Tab label="4 Point Inspection" {...a11yProps(0)} />
                    <Tab label="Unwashed" {...a11yProps(1)} />
                    <Tab label="Washed" {...a11yProps(2)} />
                </Tabs>
            </Box>
            <TabPanel value={currentInspectionTab} index={0}>
                {loading.inspection ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : error.inspection ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
              <WarningIcon color="warning" sx={{ fontSize: 48, mb: 2 }} />
                        <Typography color="text.secondary">{error.inspection}</Typography>
            </Box>
          ) : (
            <Box>
                        {/* Top Summary Cards - Compact & Refined */}
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={4}>
                                <Paper 
                                    elevation={8}
                                    sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                        borderRadius: 3,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 10px 20px rgba(33, 150, 243, 0.25)'
                                        }
                                    }}
                                >
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.dark', mb: 0.5 }}>
                                        📏 Total Inspected
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1565c0' }}>
                                        {fourPointData.summary.totalInspected.toFixed(2)}m
                                    </Typography>
              </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Paper 
                                    elevation={8}
                                    sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                        borderRadius: 3,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 10px 20px rgba(244, 67, 54, 0.25)'
                                        }
                                    }}
                                >
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'error.dark', mb: 0.5 }}>
                                        ❌ Total Mistakes
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#c62828' }}>
                                        {fourPointData.summary.totalMistakes.toFixed(2)}m
                                    </Typography>
                                </Paper>
                            </Grid>
                             <Grid item xs={12} sm={4}>
                                <Paper 
                                    elevation={8}
                                    sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                        borderRadius: 3,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 10px 20px rgba(76, 175, 80, 0.25)'
                                        }
                                    }}
                                >
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.dark', mb: 0.5 }}>
                                        ✅ Total OK
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                                        {fourPointData.summary.totalOk.toFixed(2)}m
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Warps Accordion */}
                        {fourPointData.warps.map((warp) => (
                            <Accordion key={warp.id} sx={{ mb: 1.5 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Grid container spacing={1} alignItems="stretch">
                                        <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <Typography variant="h6">{warp.warpOrderNumber}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {warp.loom?.loomName || 'N/A'} ({warp.loom?.companyName || 'N/A'})
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={3} md={2}>
                                            <Paper 
                                                elevation={4}
                                                sx={{ 
                                                    p: 1.5,
                                                    textAlign: 'center',
                                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                    borderRadius: 2,
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        transform: 'scale(1.03)',
                                                        boxShadow: '0 6px 15px rgba(33, 150, 243, 0.2)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="caption" display="block" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                                                    Inspected
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1565c0' }}>
                                                    {warp.summary.inspected.toFixed(2)}m
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={3} md={2}>
                                            <Paper 
                                                elevation={4}
                                                sx={{ 
                                                    p: 1.5,
                                                    textAlign: 'center',
                                                    background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                                    borderRadius: 2,
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        transform: 'scale(1.03)',
                                                        boxShadow: '0 6px 15px rgba(244, 67, 54, 0.2)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="caption" display="block" sx={{ fontWeight: 600, color: 'error.dark' }}>
                                                    Mistakes
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>
                                                    {warp.summary.mistakes.toFixed(2)}m
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={3} md={2}>
                                            <Paper 
                                                elevation={4}
                                                sx={{ 
                                                    p: 1.5,
                                                    textAlign: 'center',
                                                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                                    borderRadius: 2,
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        transform: 'scale(1.03)',
                                                        boxShadow: '0 6px 15px rgba(76, 175, 80, 0.2)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="caption" display="block" sx={{ fontWeight: 600, color: 'success.dark' }}>
                                                    OK
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                                                    {warp.summary.ok.toFixed(2)}m
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={3} md={3}>
                                            <Paper 
                                                elevation={4}
                                                sx={{ 
                                                    p: 1.5,
                                                    textAlign: 'center',
                                                    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                                                    borderRadius: 2,
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease-in-out',
                                                    '&:hover': {
                                                        transform: 'scale(1.03)',
                                                        boxShadow: '0 6px 15px rgba(156, 39, 176, 0.2)'
                                                    }
                                                }}
                                            >
                                                <Typography variant="caption" display="block" sx={{ fontWeight: 600, color: 'secondary.dark' }}>
                                                    Fabric Cuts
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#7b1fa2' }}>
                                                    {warp.summary.fabricCutsCount}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {warp.inspections.length > 0 ? (
                                        <TableContainer component={Paper}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Fabric No.</TableCell>
                                                        <TableCell>Inspected (m)</TableCell>
                                                        <TableCell>Mistake (m)</TableCell>
                                                        <TableCell>Actual (m)</TableCell>
                                                        <TableCell>Mistakes</TableCell>
                                                        <TableCell>Inspectors</TableCell>
                                                        <TableCell>Date</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {warp.inspections.map(insp => (
                                                        <TableRow key={insp.id}>
                                                            <TableCell>{insp.fabricCut?.cutNumber || 'N/A'}</TableCell>
                                                            <TableCell>{(insp.inspectedQuantity || 0).toFixed(2)}</TableCell>
                                                            <TableCell>{(insp.mistakeQuantity || 0).toFixed(2)}</TableCell>
                                                            <TableCell>{(insp.fabricCut?.quantity || 0).toFixed(2)}</TableCell>
                                                            <TableCell>{(insp.mistakes || []).join(', ')}</TableCell>
                                                            <TableCell>
                                                                {[insp.inspector1, insp.inspector2].filter(Boolean).join(', ')}
                                                            </TableCell>
                                                            <TableCell>{formatDate(insp.inspectionDate)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Typography sx={{ p: 2, textAlign: 'center' }}>
                                            No 4-point inspections found for this warp.
                                        </Typography>
                                    )}
                                </AccordionDetails>
                            </Accordion>
                        ))}
            </Box>
          )}
            </TabPanel>
            <TabPanel value={currentInspectionTab} index={1}>
                <Typography>Unwashed Inspection Content will go here</Typography>
            </TabPanel>
            <TabPanel value={currentInspectionTab} index={2}>
                <Typography>Washed Inspection Content will go here</Typography>
            </TabPanel>
        </TabPanel>

        {/* Processing Tab */}
        <TabPanel value={currentTab} index={3}>
            {loading.processing ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error.processing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                    <WarningIcon color="warning" sx={{ fontSize: 48, mb: 2 }} />
                    <Typography color="text.secondary">{error.processing}</Typography>
                </Box>
            ) : (
                <Box>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Processing Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Fabric cuts sent for processing and received back
                    </Typography>

                    {/* Processing Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper 
                                elevation={8}
                                sx={{ 
                                    p: 2, 
                                    textAlign: 'center',
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 10px 20px rgba(33, 150, 243, 0.25)'
                                    }
                                }}
                            >
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.dark', mb: 0.5 }}>
                                    📤 Cuts Sent
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1565c0' }}>
                                    {processingMetrics.totalFabricCutsSent}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper 
                                elevation={8}
                                sx={{ 
                                    p: 2, 
                                    textAlign: 'center',
                                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 10px 20px rgba(255, 152, 0, 0.25)'
                                    }
                                }}
                            >
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'warning.dark', mb: 0.5 }}>
                                    📊 Quantity Sent
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#e65100' }}>
                                    {processingMetrics.totalQuantitySent.toFixed(2)}m
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper 
                                elevation={8}
                                sx={{ 
                                    p: 2, 
                                    textAlign: 'center',
                                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 10px 20px rgba(76, 175, 80, 0.25)'
                                    }
                                }}
                            >
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.dark', mb: 0.5 }}>
                                    📥 Cuts Received
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                                    {processingMetrics.totalFabricCutsReceived}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper 
                                elevation={8}
                                sx={{ 
                                    p: 2, 
                                    textAlign: 'center',
                                    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                                    borderRadius: 3,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 10px 20px rgba(156, 39, 176, 0.25)'
                                    }
                                }}
                            >
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'secondary.dark', mb: 0.5 }}>
                                    📈 Quantity Received
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#7b1fa2' }}>
                                    {processingMetrics.totalQuantityReceived.toFixed(2)}m
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Processing Orders Table */}
                    {processingData.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                            <Typography color="text.secondary">No processing orders found for this order.</Typography>
                        </Box>
                    ) : (
                        processingData.map((processingOrder) => {
                            const sentCuts = processingOrder.sentFabricCuts || [];
                            const receivedCuts = processingOrder.receivedFabricCuts || [];
                            const totalSentQty = sentCuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0);
                            const totalReceivedQty = receivedCuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0);
                            const shortageQty = totalSentQty - totalReceivedQty;
                            const shortagePercentage = totalSentQty > 0 ? ((shortageQty / totalSentQty) * 100) : 0;

                            return (
                                <Accordion key={processingOrder.id} sx={{ mb: 1.5 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} md={2}>
                                                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                                    {processingOrder.orderFormNumber || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                                                    {processingOrder.processingCenter?.name || 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {(processingOrder.processes || []).join(', ') || 'N/A'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} md={1.5}>
                                                <Typography variant="caption" display="block" color="text.secondary">Sent</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {totalSentQty.toFixed(2)}m
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">{sentCuts.length} cuts</Typography>
                                            </Grid>
                                            <Grid item xs={6} md={1.5}>
                                                <Typography variant="caption" display="block" color="text.secondary">Received</Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {totalReceivedQty.toFixed(2)}m
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">{receivedCuts.length} cuts</Typography>
                                            </Grid>
                                            <Grid item xs={6} md={1.5}>
                                                <Typography variant="caption" display="block" color="text.secondary">Sent Date</Typography>
                                                <Typography variant="body2">{formatDate(processingOrder.sentDate)}</Typography>
                                            </Grid>
                                            <Grid item xs={6} md={1.5}>
                                                <Typography variant="caption" display="block" color="text.secondary">Received Date</Typography>
                                                <Typography variant="body2">{formatDate(processingOrder.receivedDate)}</Typography>
                                            </Grid>
                                            <Grid item xs={6} md={1.5}>
                                                <Typography variant="caption" display="block" color="text.secondary">Status</Typography>
                                                <Chip 
                                                    label={processingOrder.status || 'N/A'} 
                                                    color={processingOrder.status === 'completed' ? 'success' : processingOrder.status === 'in-progress' ? 'warning' : 'default'}
                                                    size="small" 
                                                />
                                            </Grid>
                                            <Grid item xs={6} md={2}>
                                                <Typography variant="caption" display="block" color="text.secondary">Shortage</Typography>
                                                <Typography variant="body1" fontWeight="bold" color={shortageQty > 0 ? 'error' : 'success'}>
                                                    {shortageQty.toFixed(2)}m ({Math.abs(shortagePercentage).toFixed(1)}%)
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={3}>
                                            {/* Sent Fabric Cuts */}
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="h6" gutterBottom color="primary">
                                                    📤 Sent Fabric Cuts
                                                </Typography>
                                                {sentCuts.length > 0 ? (
                                                    <TableContainer component={Paper} variant="outlined">
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Fabric Cut No.</TableCell>
                                                                    <TableCell align="right">Quantity (m)</TableCell>
                                                                    <TableCell>Date Sent</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {sentCuts.map((cut, index) => (
                                                                    <TableRow key={index}>
                                                                        <TableCell>{cut.cutNumber || 'N/A'}</TableCell>
                                                                        <TableCell align="right">{(cut.quantity || 0).toFixed(2)}</TableCell>
                                                                        <TableCell>{formatDate(cut.dateSent)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                ) : (
                                                    <Typography color="text.secondary" sx={{ p: 2 }}>
                                                        No fabric cuts sent yet.
                                                    </Typography>
                                                )}
                                            </Grid>

                                            {/* Received Fabric Cuts */}
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="h6" gutterBottom color="success">
                                                    📥 Received Fabric Cuts
                                                </Typography>
                                                {receivedCuts.length > 0 ? (
                                                    <TableContainer component={Paper} variant="outlined">
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Date Received</TableCell>
                                                                    <TableCell>Delivery No.</TableCell>
                                                                    <TableCell>Fabric Cut No.</TableCell>
                                                                    <TableCell>Location</TableCell>
                                                                    <TableCell align="right">Quantity (m)</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {receivedCuts.map((cut, index) => (
                                                                    <TableRow key={index}>
                                                                        <TableCell>{formatDate(cut.dateReceived)}</TableCell>
                                                                        <TableCell>{cut.deliveryNumber || 'N/A'}</TableCell>
                                                                        <TableCell>{cut.cutNumber || 'N/A'}</TableCell>
                                                                        <TableCell>{cut.location || 'N/A'}</TableCell>
                                                                        <TableCell align="right">{(cut.quantity || 0).toFixed(2)}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                ) : (
                                                    <Typography color="text.secondary" sx={{ p: 2 }}>
                                                        No fabric cuts received yet.
                                                    </Typography>
                                                )}
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })
                    )}
                </Box>
            )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderDetailsModal;