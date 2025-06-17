import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Grid,
  Card,
  CardContent,
  Badge
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import { buildApiUrl } from '../config/api';
import { useNavigate } from 'react-router-dom';

const mistakeTypes = [
  'MISSED ENDS',
  'TEMPER YARN CUT',
  'REED DRAWING MISTAKE',
  'DOUBLE ENDS',
  'END DRAWING MISTAKE',
  'REED GAP',
  'THICK REED',
  'THICK ENDS',
  'SHRINKED ENDS',
  'DOBBY MISTAKE',
  'REED MISTAKE',
  'WRONG COLOURED ENDS',
  'CONTINUE FLOATS'
];

const inspectorNames = [
  'P.LAKSHMI',
  'P.KAVITHA',
  'R.SANGEETHA',
  'N.AMUDHA',
  'S.UMA',
  'S.SUGANYA',
  'M.GOWSALYA',
  'P.JOTHIMANI',
  'B.NALINI',
  'K.THANGAYEE',
  'K.USHA',
  'T.MEENA',
  'P.MEENA',
  'S.SUGAPRIYA',
  'E.LATHA',
  'S.SARASU',
  'E.GEETHA',
  'M.DEIVARANI',
  'S.UMARANI',
  'G.SELVI',
  'S.MENAKA',
  'K.SUMATHI',
  'S.VASANTHA',
  'D.KODIYARASI',
  'S.KAYALVIZHI',
  'K.SHANTHI',
  'R.KANNAKI',
  'V.MALLIKA',
  'B.JOTHI',
  'V.MUTHAMMAL',
  'G.MYNA',
  'C.MUNIYAMMAL',
  'R.GOWSALYA',
  'S.KUMUTHA',
  'S.THAMARAI SELVI',
  'A.NITHYA',
  'R.JENITHA',
  'P.SELVAM',
  'K.MATHINA',
  'A.KALAIVANI',
  'G.AMIRTHAVALLI',
  'M.USHA',
  'P.SARASWATHI',
  'M.KRISHNAVENI',
  'S.LATHA',
  'S.KAVITHA'
];

function InspectionReports() {
  const [currentTab, setCurrentTab] = useState(0);
  const [inspections, setInspections] = useState([]);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [formData, setFormData] = useState({
    inspectedQuantity: '',
    mistakeQuantity: '',
    mistakes: [],
    inspector1: '',
    inspector2: ''
  });
  const [filters, setFilters] = useState({
    warpNumber: '',
    orderNumber: '',
    designName: '',
    loomNumber: ''
  });
  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 0) {
      fetchFourPointInspections();
    }
    // Add logic for other tabs when implemented
  };

  const fetchFourPointInspections = async () => {
    setLoading(true);
    setError('');
    try {
      // Force the API URL to use the correct endpoint
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/inspections/4-point' 
        : 'http://localhost:3001/api/inspections/4-point';
      
      console.log('Fetching inspections from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      // Sort by inspection date (newest first)
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.inspectionDate);
        const dateB = new Date(b.inspectionDate);
        return dateB.getTime() - dateA.getTime();
      });
      
      setInspections(sortedData);
      setFilteredInspections(sortedData);
    } catch (err) {
      console.error('Error fetching inspections:', err);
      setError('Error loading inspection data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (inspection) => {
    setEditingInspection(inspection);
    setFormData({
      inspectedQuantity: inspection.inspectedQuantity || '',
      mistakeQuantity: inspection.mistakeQuantity || '',
      mistakes: inspection.mistakes || [],
      inspector1: inspection.inspector1 || '',
      inspector2: inspection.inspector2 || ''
    });
    setEditDialog(true);
  };

  const handleCloseEdit = () => {
    setEditDialog(false);
    setEditingInspection(null);
    setFormData({
      inspectedQuantity: '',
      mistakeQuantity: '',
      mistakes: [],
      inspector1: '',
      inspector2: ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const actualQuantity = parseFloat(formData.inspectedQuantity) - parseFloat(formData.mistakeQuantity || 0);
      
      const updateData = {
        ...formData,
        inspectedQuantity: parseFloat(formData.inspectedQuantity),
        mistakeQuantity: parseFloat(formData.mistakeQuantity || 0),
        actualQuantity: actualQuantity
      };

      const response = await fetch(buildApiUrl(`inspections/${editingInspection.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update inspection');
      }

      // Refresh the data
      fetchFourPointInspections();
      handleCloseEdit();
    } catch (err) {
      console.error('Error updating inspection:', err);
      setError('Error updating inspection: ' + err.message);
    }
  };

  const handleMistakeChange = (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      mistakes: typeof value === 'string' ? value.split(',') : value
    }));
  };

  // Filter function
  useEffect(() => {
    if (!inspections.length) return;
    
    const filtered = inspections.filter((inspection) => {
      const warpMatch = !filters.warpNumber || 
        (inspection.fabricCut?.warp?.warpOrderNumber || '').toLowerCase().includes(filters.warpNumber.toLowerCase());
      
      const orderMatch = !filters.orderNumber || 
        (inspection.fabricCut?.warp?.order?.orderNumber || 
         inspection.fabricCut?.warp?.order?.orderName || 
         inspection.orderNumber || '').toLowerCase().includes(filters.orderNumber.toLowerCase());
      
      const designMatch = !filters.designName || 
        (inspection.fabricCut?.warp?.order?.designName || '').toLowerCase().includes(filters.designName.toLowerCase()) ||
        (inspection.fabricCut?.warp?.order?.designNumber || '').toLowerCase().includes(filters.designName.toLowerCase());
      
      const loomMatch = !filters.loomNumber || 
        (inspection.fabricCut?.warp?.loom?.loomName || '').toLowerCase().includes(filters.loomNumber.toLowerCase());
      
      return warpMatch && orderMatch && designMatch && loomMatch;
    });
    
    setFilteredInspections(filtered);
  }, [inspections, filters]);

  // Only fetch data once on component mount, not on every render
  useEffect(() => {
    fetchFourPointInspections();
  }, []); // Empty dependency array to prevent frequent refreshing

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      warpNumber: '',
      orderNumber: '',
      designName: '',
      loomNumber: ''
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AssessmentIcon sx={{ mr: 2, fontSize: 32, color: '#8B0000' }} />
        <Typography variant="h4" component="h1" sx={{ color: '#8B0000', fontWeight: 'bold', flexGrow: 1 }}>
          Inspection Reports
        </Typography>
        {currentTab === 0 && (
          <Button
            variant="contained"
            onClick={() => navigate('/job-work-wages')}
          >
            Job Work Wages
          </Button>
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="4 Point" />
          <Tab label="Unwashed" />
          <Tab label="Washed" />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : (
          <>
            {/* Filter Section */}
            <Card sx={{ mt: 2, mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FilterListIcon sx={{ mr: 1, color: '#8B0000' }} />
                  <Typography variant="h6" sx={{ color: '#8B0000', fontWeight: 'bold' }}>
                    Filters
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ClearIcon />}
                      onClick={clearFilters}
                      sx={{ borderColor: '#8B0000', color: '#8B0000' }}
                    >
                      Clear All
                    </Button>
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Warp Number"
                      variant="outlined"
                      value={filters.warpNumber}
                      onChange={(e) => handleFilterChange('warpNumber', e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Order Number"
                      variant="outlined"
                      value={filters.orderNumber}
                      onChange={(e) => handleFilterChange('orderNumber', e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Design Name/Number"
                      variant="outlined"
                      value={filters.designName}
                      onChange={(e) => handleFilterChange('designName', e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Loom Number"
                      variant="outlined"
                      value={filters.loomNumber}
                      onChange={(e) => handleFilterChange('loomNumber', e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {filteredInspections.length} of {inspections.length} records
                  </Typography>
                  {(filters.warpNumber || filters.orderNumber || filters.designName || filters.loomNumber) && (
                    <Badge badgeContent={filteredInspections.length} color="primary">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Filtered Results
                      </Typography>
                    </Badge>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Enhanced Table */}
            <TableContainer 
              component={Paper} 
              sx={{ 
                mt: 2, 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow 
                    sx={{ 
                      backgroundColor: '#8B0000',
                      '& th': { 
                        color: 'white', 
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        borderBottom: 'none'
                      }
                    }}
                  >
                    <TableCell>Fabric Cut #</TableCell>
                    <TableCell>Warp #</TableCell>
                    <TableCell>Loom</TableCell>
                    <TableCell>Order #</TableCell>
                    <TableCell>Design</TableCell>
                    <TableCell align="center">Original Qty</TableCell>
                    <TableCell align="center">Inspected Qty</TableCell>
                    <TableCell align="center">Mistake Qty</TableCell>
                    <TableCell align="center">Actual Qty</TableCell>
                    <TableCell>Mistakes</TableCell>
                    <TableCell>Inspectors</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInspections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center">
                        <Box sx={{ py: 4 }}>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            {inspections.length === 0 ? 'No inspection records found' : 'No records match your filters'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {inspections.length === 0 
                              ? 'Start by performing some 4-Point inspections' 
                              : 'Try adjusting your filter criteria'
                            }
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInspections.map((inspection, index) => (
                      <TableRow 
                        key={inspection.id} 
                        hover
                        sx={{ 
                          '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                          '&:hover': { backgroundColor: '#f0f0f0' },
                          cursor: 'pointer'
                        }}
                      >
                        <TableCell sx={{ fontWeight: 'medium' }}>
                          {inspection.fabricNumber || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={inspection.fabricCut?.warp?.warpOrderNumber || 'N/A'} 
                            size="small" 
                            variant="outlined"
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2" fontWeight="medium">
                              {inspection.fabricCut?.warp?.loom?.loomName || 
                               inspection.fabricCut?.loomName || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {inspection.fabricCut?.warp?.loom?.companyName || 
                               inspection.fabricCut?.companyName || ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={inspection.fabricCut?.warp?.order?.orderNumber || 
                                   inspection.fabricCut?.warp?.order?.orderName || 
                                   inspection.orderNumber || 'N/A'} 
                            size="small" 
                            variant="outlined"
                            color="secondary"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {inspection.fabricCut?.warp?.order?.designName || 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {inspection.fabricCut?.warp?.order?.designNumber || ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="medium">
                            {inspection.originalQuantity || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="medium" color="primary.main">
                            {inspection.inspectedQuantity || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography 
                            variant="body2" 
                            fontWeight="medium"
                            color={inspection.mistakeQuantity > 0 ? "error.main" : "text.secondary"}
                          >
                            {inspection.mistakeQuantity || 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {inspection.actualQuantity || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {inspection.mistakes && inspection.mistakes.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                              {inspection.mistakes.map((mistake, mistakeIndex) => (
                                <Chip 
                                  key={mistakeIndex} 
                                  label={mistake} 
                                  size="small" 
                                  color="error"
                                  variant="outlined"
                                  sx={{ fontSize: '0.75rem' }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Chip label="None" size="small" color="success" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box>
                            {inspection.inspectors && inspection.inspectors.length > 0 ? (
                              inspection.inspectors.map((inspector, index) => (
                                <Typography key={index} variant="caption" display="block" fontWeight="medium">
                                  {inspector}
                                </Typography>
                              ))
                            ) : (
                              <>
                                <Typography variant="caption" display="block" fontWeight="medium">
                                  {inspection.inspector1 || 'N/A'}
                                </Typography>
                                <Typography variant="caption" display="block" fontWeight="medium">
                                  {inspection.inspector2 || 'N/A'}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {formatDate(inspection.inspectionDate)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            color="primary" 
                            onClick={() => handleEdit(inspection)}
                            size="small"
                            sx={{ 
                              '&:hover': { 
                                backgroundColor: 'primary.light',
                                color: 'white'
                              }
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Typography variant="h6" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          Unwashed Inspection Reports - Coming Soon
        </Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Typography variant="h6" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          Washed Inspection Reports - Coming Soon
        </Typography>
      </TabPanel>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={handleCloseEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit 4-Point Inspection</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Inspected Quantity"
              type="number"
              value={formData.inspectedQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, inspectedQuantity: e.target.value }))}
              fullWidth
              required
            />
            
            <TextField
              label="Mistake Quantity"
              type="number"
              value={formData.mistakeQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, mistakeQuantity: e.target.value }))}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Mistakes</InputLabel>
              <Select
                multiple
                value={formData.mistakes}
                onChange={handleMistakeChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {mistakeTypes.map((mistake) => (
                  <MenuItem key={mistake} value={mistake}>
                    <FormControlLabel
                      control={<Checkbox checked={formData.mistakes.includes(mistake)} />}
                      label={mistake}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Inspector 1</InputLabel>
              <Select
                value={formData.inspector1}
                onChange={(e) => setFormData(prev => ({ ...prev, inspector1: e.target.value }))}
              >
                {inspectorNames.map((name) => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Inspector 2</InputLabel>
              <Select
                value={formData.inspector2}
                onChange={(e) => setFormData(prev => ({ ...prev, inspector2: e.target.value }))}
              >
                {inspectorNames.map((name) => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="body2" color="text.secondary">
              Actual Quantity: {(parseFloat(formData.inspectedQuantity || 0) - parseFloat(formData.mistakeQuantity || 0)).toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default InspectionReports; 