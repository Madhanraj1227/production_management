import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Calculate,
  Assignment,
  Info
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { buildApiUrl } from '../config/api';

const MobileContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
}));

const HeaderPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  textAlign: 'center',
  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
  color: 'white',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    marginBottom: theme.spacing(1),
  },
}));

const CalculationBox = styled(Box)(({ theme }) => ({
  backgroundColor: '#e3f2fd',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  border: '2px solid #1976d2',
  marginTop: theme.spacing(2),
}));

function FourPointInspection() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    fabricId: '',
    batchNumber: '',
    originalQuantity: '',
    mistakeQuantity: '',
    actualQuantity: '',
    mistakeDescription: '',
    defectType: '',
    pointsAssigned: '',
    inspectorNotes: '',
    inspectedBy: 'insp'
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let updatedFormData = {
      ...formData,
      [name]: value
    };

    // Auto-calculate actual quantity when original or mistake quantity changes
    if (name === 'originalQuantity' || name === 'mistakeQuantity') {
      const original = parseFloat(name === 'originalQuantity' ? value : formData.originalQuantity) || 0;
      const mistake = parseFloat(name === 'mistakeQuantity' ? value : formData.mistakeQuantity) || 0;
      const actual = original - mistake;
      
      updatedFormData.actualQuantity = actual >= 0 ? actual.toFixed(2) : '0.00';
    }

    setFormData(updatedFormData);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.fabricId || !formData.originalQuantity || !formData.mistakeDescription) {
        throw new Error('Please fill in all required fields');
      }

      if (parseFloat(formData.originalQuantity) <= 0) {
        throw new Error('Original quantity must be greater than 0');
      }

      if (parseFloat(formData.mistakeQuantity) < 0) {
        throw new Error('Mistake quantity cannot be negative');
      }

      const inspectionData = {
        ...formData,
        inspectionType: 'four-point',
        originalQuantity: parseFloat(formData.originalQuantity),
        mistakeQuantity: parseFloat(formData.mistakeQuantity) || 0,
        actualQuantity: parseFloat(formData.actualQuantity),
        pointsAssigned: parseInt(formData.pointsAssigned) || 0,
        inspectionDate: new Date().toISOString(),
        status: 'completed'
      };

      const response = await fetch(buildApiUrl('/inspections'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inspectionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save inspection');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/inspection');
      }, 2000);

    } catch (error) {
      console.error('Error saving inspection:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/inspection');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      paddingTop: { xs: 2, sm: 3 },
      paddingBottom: { xs: 2, sm: 3 }
    }}>
      <MobileContainer maxWidth="md">
        <HeaderPaper elevation={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <IconButton 
              onClick={handleGoBack}
              sx={{ 
                position: 'absolute', 
                left: { xs: 16, sm: 24 }, 
                color: 'white' 
              }}
            >
              <ArrowBack />
            </IconButton>
            <Assignment sx={{ fontSize: { xs: 30, sm: 40 }, mr: 1 }} />
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="h1" 
              fontWeight="bold"
            >
              4-Point Inspection
            </Typography>
          </Box>
          <Typography 
            variant="body2" 
            sx={{ opacity: 0.9 }}
          >
            Standard fabric quality inspection using 4-point system
          </Typography>
        </HeaderPaper>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Inspection saved successfully! Redirecting...
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <StyledCard elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                <Info sx={{ mr: 1, verticalAlign: 'middle' }} />
                Fabric Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Fabric ID / Cut Number"
                    name="fabricId"
                    value={formData.fabricId}
                    onChange={handleInputChange}
                    size={isMobile ? "medium" : "medium"}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Batch Number"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleInputChange}
                    size={isMobile ? "medium" : "medium"}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </StyledCard>

          <StyledCard elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                <Calculate sx={{ mr: 1, verticalAlign: 'middle' }} />
                Quantity Measurements
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Original Quantity"
                    name="originalQuantity"
                    value={formData.originalQuantity}
                    onChange={handleInputChange}
                    size={isMobile ? "medium" : "medium"}
                    variant="outlined"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">meters</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Mistake Quantity"
                    name="mistakeQuantity"
                    value={formData.mistakeQuantity}
                    onChange={handleInputChange}
                    size={isMobile ? "medium" : "medium"}
                    variant="outlined"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">meters</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
              </Grid>

              <CalculationBox>
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                  Calculated Result
                </Typography>
                <Typography variant="h4" color="primary" fontWeight="bold" textAlign="center">
                  Actual Quantity: {formData.actualQuantity || '0.00'} meters
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
                  Formula: Original Quantity - Mistake Quantity = Actual Quantity
                </Typography>
              </CalculationBox>
            </CardContent>
          </StyledCard>

          <StyledCard elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                Defect Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    multiline
                    rows={3}
                    label="Mistake/Defect Description"
                    name="mistakeDescription"
                    value={formData.mistakeDescription}
                    onChange={handleInputChange}
                    size={isMobile ? "medium" : "medium"}
                    variant="outlined"
                    placeholder="Describe the defects found (holes, stains, weaving issues, etc.)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Defect Type"
                    name="defectType"
                    value={formData.defectType}
                    onChange={handleInputChange}
                    size={isMobile ? "medium" : "medium"}
                    variant="outlined"
                    placeholder="e.g., Hole, Stain, Wrinkle"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Points Assigned (1-4)"
                    name="pointsAssigned"
                    value={formData.pointsAssigned}
                    onChange={handleInputChange}
                    size={isMobile ? "medium" : "medium"}
                    variant="outlined"
                    inputProps={{ min: 1, max: 4, step: 1 }}
                    helperText="1=Minor, 2=Moderate, 3=Major, 4=Critical"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Inspector Notes"
                    name="inspectorNotes"
                    value={formData.inspectorNotes}
                    onChange={handleInputChange}
                    size={isMobile ? "medium" : "medium"}
                    variant="outlined"
                    placeholder="Additional observations or recommendations"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </StyledCard>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={handleGoBack}
              size={isMobile ? "medium" : "large"}
              sx={{ minWidth: { xs: 100, sm: 120 } }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size={isMobile ? "medium" : "large"}
              sx={{ 
                minWidth: { xs: 140, sm: 160 },
                backgroundColor: '#1976d2'
              }}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            >
              {loading ? 'Saving...' : 'Save Inspection'}
            </Button>
          </Box>
        </form>
      </MobileContainer>
    </Box>
  );
}

export default FourPointInspection; 