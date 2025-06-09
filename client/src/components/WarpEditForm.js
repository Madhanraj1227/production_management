import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';

function WarpEditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [warp, setWarp] = useState(null);
  const [looms, setLooms] = useState([]);
  
  const [formData, setFormData] = useState({
    quantity: '',
    loomId: '',
    startDate: '',
    endDate: '',
  });

  // Helper function to format Firestore timestamp to date string
  const formatFirestoreDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      let date;
      if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return '';
      }
      
      // Format as YYYY-MM-DD for HTML date input
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch warp details
        const warpResponse = await axios.get(`http://localhost:3001/api/warps/${id}`);
        const warpData = warpResponse.data;
        setWarp(warpData);

        // Fetch available looms
        const loomsResponse = await axios.get('http://localhost:3001/api/looms');
        setLooms(loomsResponse.data);

        // Set form data with proper date formatting
        setFormData({
          quantity: warpData.quantity || '',
          loomId: warpData.loomId || '',
          startDate: formatFirestoreDate(warpData.startDate),
          endDate: formatFirestoreDate(warpData.endDate),
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load warp details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate required fields
      if (!formData.quantity) {
        setError('Quantity is required');
        return;
      }

      if (!formData.loomId) {
        setError('Please select a loom');
        return;
      }

      if (!formData.startDate || !formData.endDate) {
        setError('Both start date and end date are required');
        return;
      }

      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        setError('End date must be after start date');
        return;
      }

      // Check if selected loom is available (unless it's the current loom)
      const selectedLoom = looms.find(loom => loom.id === formData.loomId);
      if (selectedLoom && selectedLoom.status === 'busy' && selectedLoom.id !== warp.loomId) {
        setError('Selected loom is currently busy. Please choose an idle loom.');
        return;
      }

      const updateData = {
        quantity: parseInt(formData.quantity),
        loomId: formData.loomId,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      await axios.patch(`http://localhost:3001/api/warps/${id}`, updateData);
      
      setSuccess('Warp updated successfully!');
      setTimeout(() => {
        navigate('/warps');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating warp:', error);
      setError(error.response?.data?.error || 'Failed to update warp. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!warp) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Warp not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/warps')}
            sx={{ mr: 2 }}
          >
            Back to Warps
          </Button>
          <Typography variant="h4" component="h1">
            Edit Warp
          </Typography>
        </Box>

        {/* Warp Information Display */}
        <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Warp Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Warp Number</Typography>
              <Typography variant="body1" fontWeight="bold">{warp.warpOrderNumber || warp.warpNumber || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Order Number</Typography>
              <Typography variant="body1" fontWeight="bold">{warp.order?.orderNumber || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Design Name</Typography>
              <Typography variant="body1">{warp.order?.designName || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Design Number</Typography>
              <Typography variant="body1">{warp.order?.designNumber || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity (meters)"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                required
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Select Loom</InputLabel>
                <Select
                  value={formData.loomId}
                  label="Select Loom"
                  onChange={(e) => handleInputChange('loomId', e.target.value)}
                >
                  {looms.map((loom) => (
                    <MenuItem 
                      key={loom.id} 
                      value={loom.id}
                      disabled={loom.status === 'busy' && loom.id !== warp.loomId}
                    >
                      {loom.companyName} - {loom.loomName} 
                      {loom.status === 'busy' && loom.id !== warp.loomId && ' (Busy)'}
                      {loom.id === warp.loomId && ' (Current)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                required
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: formData.startDate
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/warps')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : null}
                >
                  {saving ? 'Updating...' : 'Update Warp'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default WarpEditForm; 