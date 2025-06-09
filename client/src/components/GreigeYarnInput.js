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
  IconButton,
  Alert,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

function GreigeYarnInput() {
  const [greigeYarns, setGreigeYarns] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedYarn, setSelectedYarn] = useState(null);
  const [formData, setFormData] = useState({
    supplierName: '',
    yarnType: '',
    count: '',
    weight: '',
    lotNumber: '',
    receivedDate: new Date().toISOString().split('T')[0],
    qualityGrade: 'A',
    notes: ''
  });

  // Mock data for development
  const mockGreigeYarns = [
    {
      id: 1,
      supplierName: 'Cotton Mills Ltd',
      yarnType: 'Cotton',
      count: '30s',
      weight: 500,
      lotNumber: 'LOT001',
      receivedDate: '2024-06-08',
      qualityGrade: 'A',
      status: 'Received',
      notes: 'Good quality batch'
    },
    {
      id: 2,
      supplierName: 'Textile Suppliers Co',
      yarnType: 'Polyester',
      count: '40s',
      weight: 300,
      lotNumber: 'LOT002',
      receivedDate: '2024-06-07',
      qualityGrade: 'B',
      status: 'Quality Check',
      notes: 'Minor variations in thickness'
    }
  ];

  useEffect(() => {
    setGreigeYarns(mockGreigeYarns);
  }, []);

  const handleOpenDialog = (yarn = null) => {
    if (yarn) {
      setSelectedYarn(yarn);
      setFormData(yarn);
    } else {
      setSelectedYarn(null);
      setFormData({
        supplierName: '',
        yarnType: '',
        count: '',
        weight: '',
        lotNumber: '',
        receivedDate: new Date().toISOString().split('T')[0],
        qualityGrade: 'A',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedYarn(null);
  };

  const handleSubmit = () => {
    if (selectedYarn) {
      // Update existing
      setGreigeYarns(yarns => yarns.map(yarn => 
        yarn.id === selectedYarn.id ? { ...formData, id: selectedYarn.id } : yarn
      ));
    } else {
      // Add new
      const newYarn = {
        ...formData,
        id: Date.now(),
        status: 'Received'
      };
      setGreigeYarns(yarns => [...yarns, newYarn]);
    }
    handleCloseDialog();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Received': return 'success';
      case 'Quality Check': return 'warning';
      case 'Approved': return 'primary';
      case 'Rejected': return 'error';
      default: return 'default';
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'success';
      case 'B': return 'warning';
      case 'C': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#670d10' }}>
          Greige Yarn Input Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            backgroundColor: '#670d10',
            '&:hover': { backgroundColor: '#8b1214' }
          }}
        >
          Add Greige Yarn
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Total Received
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                {greigeYarns.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                Lots
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Total Weight
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                {greigeYarns.reduce((sum, yarn) => sum + yarn.weight, 0)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                Kg
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f57c00 0%, #ff9800 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Pending QC
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                {greigeYarns.filter(yarn => yarn.status === 'Quality Check').length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                Lots
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #670d10 0%, #8b1214 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                Grade A Quality
              </Typography>
              <Typography variant="h4" sx={{ color: 'white', mt: 1 }}>
                {greigeYarns.filter(yarn => yarn.qualityGrade === 'A').length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                Lots
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Greige Yarn Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#670d10', fontWeight: 'bold' }}>
          Greige Yarn Inventory
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Lot Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Yarn Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Count</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Weight (Kg)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Received Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Quality Grade</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {greigeYarns.map((yarn) => (
                <TableRow key={yarn.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{yarn.lotNumber}</TableCell>
                  <TableCell>{yarn.supplierName}</TableCell>
                  <TableCell>{yarn.yarnType}</TableCell>
                  <TableCell>{yarn.count}</TableCell>
                  <TableCell>{yarn.weight}</TableCell>
                  <TableCell>{yarn.receivedDate}</TableCell>
                  <TableCell>
                    <Chip 
                      label={yarn.qualityGrade} 
                      color={getGradeColor(yarn.qualityGrade)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={yarn.status} 
                      color={getStatusColor(yarn.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(yarn)}
                        sx={{ color: '#670d10' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{ color: '#1976d2' }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#670d10', color: 'white' }}>
          {selectedYarn ? 'Edit Greige Yarn' : 'Add New Greige Yarn'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Supplier Name"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Yarn Type"
                value={formData.yarnType}
                onChange={(e) => setFormData({ ...formData, yarnType: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Count"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Weight (Kg)"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                margin="normal"
              />
            </Grid>
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
                type="date"
                label="Received Date"
                value={formData.receivedDate}
                onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Quality Grade"
                value={formData.qualityGrade}
                onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
                margin="normal"
                SelectProps={{ native: true }}
              >
                <option value="A">A - Excellent</option>
                <option value="B">B - Good</option>
                <option value="C">C - Poor</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                margin="normal"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ 
              backgroundColor: '#670d10',
              '&:hover': { backgroundColor: '#8b1214' }
            }}
          >
            {selectedYarn ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GreigeYarnInput; 