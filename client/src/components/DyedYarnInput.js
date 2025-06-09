import React, { useState, useEffect } from 'react';
import {
  Paper, Typography, Box, Grid, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Palette as PaletteIcon } from '@mui/icons-material';

function DyedYarnInput() {
  const [dyedYarns, setDyedYarns] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    batchNumber: '', originalLot: '', color: '', dyeProcess: '', weight: '',
    dyedDate: new Date().toISOString().split('T')[0], colorFastness: 'A', 
    qualityGrade: 'A', notes: ''
  });

  const mockDyedYarns = [
    { id: 1, batchNumber: 'DY001', originalLot: 'LOT001', color: 'Navy Blue', 
      dyeProcess: 'Reactive Dye', weight: 180, dyedDate: '2024-06-09', 
      colorFastness: 'A', qualityGrade: 'A', status: 'Ready' },
    { id: 2, batchNumber: 'DY002', originalLot: 'LOT002', color: 'Crimson Red', 
      dyeProcess: 'Vat Dye', weight: 120, dyedDate: '2024-06-08', 
      colorFastness: 'B', qualityGrade: 'B', status: 'Quality Check' }
  ];

  useEffect(() => { setDyedYarns(mockDyedYarns); }, []);

  const handleSubmit = () => {
    const newYarn = { ...formData, id: Date.now(), weight: parseFloat(formData.weight) || 0, status: 'Quality Check' };
    setDyedYarns(prev => [...prev, newYarn]);
    setOpenDialog(false);
    setFormData({ batchNumber: '', originalLot: '', color: '', dyeProcess: '', weight: '',
      dyedDate: new Date().toISOString().split('T')[0], colorFastness: 'A', qualityGrade: 'A', notes: '' });
  };

  const getStatusColor = (status) => ({
    'Ready': 'success', 'Quality Check': 'warning', 'Rejected': 'error'
  }[status] || 'default');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#670d10' }}>
          Dyed Yarn Input Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}
          sx={{ backgroundColor: '#670d10', '&:hover': { backgroundColor: '#8b1214' } }}>
          Add Dyed Yarn
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { title: 'Total Batches', value: dyedYarns.length, color: '#2e7d32' },
          { title: 'Total Weight', value: `${dyedYarns.reduce((sum, y) => sum + y.weight, 0)} Kg`, color: '#1976d2' },
          { title: 'Quality Check', value: dyedYarns.filter(y => y.status === 'Quality Check').length, color: '#f57c00' },
          { title: 'Ready Stock', value: dyedYarns.filter(y => y.status === 'Ready').length, color: '#670d10' }
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
        <Typography variant="h6" sx={{ mb: 2, color: '#670d10', fontWeight: 'bold' }}>
          Dyed Yarn Inventory
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                {['Batch Number', 'Original Lot', 'Color', 'Dye Process', 'Weight (Kg)', 
                  'Dyed Date', 'Color Fastness', 'Quality', 'Status'].map(header => (
                  <TableCell key={header} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {dyedYarns.map((yarn) => (
                <TableRow key={yarn.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{yarn.batchNumber}</TableCell>
                  <TableCell>{yarn.originalLot}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PaletteIcon sx={{ color: yarn.color.toLowerCase().includes('blue') ? 'blue' : 
                        yarn.color.toLowerCase().includes('red') ? 'red' : '#666' }} />
                      {yarn.color}
                    </Box>
                  </TableCell>
                  <TableCell>{yarn.dyeProcess}</TableCell>
                  <TableCell>{yarn.weight}</TableCell>
                  <TableCell>{yarn.dyedDate}</TableCell>
                  <TableCell><Chip label={yarn.colorFastness} color={yarn.colorFastness === 'A' ? 'success' : 'warning'} size="small" /></TableCell>
                  <TableCell><Chip label={yarn.qualityGrade} color={yarn.qualityGrade === 'A' ? 'success' : 'warning'} size="small" /></TableCell>
                  <TableCell><Chip label={yarn.status} color={getStatusColor(yarn.status)} size="small" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#670d10', color: 'white' }}>Add New Dyed Yarn Batch</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            {[
              { key: 'batchNumber', label: 'Batch Number' },
              { key: 'originalLot', label: 'Original Lot Number' },
              { key: 'color', label: 'Color' },
              { key: 'dyeProcess', label: 'Dye Process' },
              { key: 'weight', label: 'Weight (Kg)', type: 'number' },
              { key: 'dyedDate', label: 'Dyed Date', type: 'date' }
            ].map(field => (
              <Grid item xs={12} md={6} key={field.key}>
                <TextField fullWidth {...field} value={formData[field.key]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? 
                    parseFloat(e.target.value) || 0 : e.target.value })}
                  margin="normal" InputLabelProps={field.type === 'date' ? { shrink: true } : undefined} />
              </Grid>
            ))}
            <Grid item xs={12} md={6}>
              <TextField fullWidth select label="Color Fastness" value={formData.colorFastness}
                onChange={(e) => setFormData({ ...formData, colorFastness: e.target.value })}
                margin="normal" SelectProps={{ native: true }}>
                <option value="A">A - Excellent</option>
                <option value="B">B - Good</option>
                <option value="C">C - Poor</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth select label="Quality Grade" value={formData.qualityGrade}
                onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
                margin="normal" SelectProps={{ native: true }}>
                <option value="A">A - Excellent</option>
                <option value="B">B - Good</option>
                <option value="C">C - Poor</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Notes" value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} margin="normal" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained"
            sx={{ backgroundColor: '#670d10', '&:hover': { backgroundColor: '#8b1214' } }}>
            Add Batch
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DyedYarnInput; 