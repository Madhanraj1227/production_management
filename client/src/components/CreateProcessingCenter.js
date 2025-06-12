import React, { useState } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  Avatar,
  Grid,
  Paper
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';

function CreateProcessingCenter() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPerson: '',
    phoneNumber: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear messages when user starts typing
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      setErrorMessage('Processing center name is required');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMessage('Address is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // TODO: Implement API call to save processing center
      // For now, just simulate the save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage(`Processing center "${formData.name}" has been registered successfully!`);
      // Reset form
      setFormData({
        name: '',
        address: '',
        contactPerson: '',
        phoneNumber: '',
        email: ''
      });
    } catch (error) {
      setErrorMessage('Failed to register processing center. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData({
      name: '',
      address: '',
      contactPerson: '',
      phoneNumber: '',
      email: ''
    });
    setSuccessMessage('');
    setErrorMessage('');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      {/* Header Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        borderRadius: 3,
        p: 4,
        mb: 4,
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ 
            bgcolor: 'rgba(255,255,255,0.2)', 
            mr: 2, 
            width: 56, 
            height: 56 
          }}>
            <BusinessIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
              Create Processing Center
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Register a new processing facility for fabric finishing operations
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Alert Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Form Section */}
      <Card sx={{ 
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        borderRadius: 3
      }}>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          p: 3,
          borderBottom: '1px solid #dee2e6'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#495057' }}>
            Processing Center Information
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Enter the details of the new processing center below
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Processing Center Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Processing Center Name *"
                  variant="outlined"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., ABC Finishing Works, XYZ Processing Unit"
                  required
                />
              </Grid>

              {/* Address */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Complete Address *"
                  variant="outlined"
                  multiline
                  rows={3}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter complete address including street, city, state, and postal code"
                  required
                />
              </Grid>

              {/* Contact Person */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Person"
                  variant="outlined"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder="e.g., Manager Name"
                />
              </Grid>

              {/* Phone Number */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  variant="outlined"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="e.g., +91 9876543210"
                />
              </Grid>

              {/* Email */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  variant="outlined"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="e.g., contact@processingcenter.com"
                />
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              mt: 4,
              pt: 3,
              borderTop: '1px solid #dee2e6'
            }}>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClear}
                disabled={isSubmitting}
                sx={{ minWidth: 120 }}
              >
                Clear Form
              </Button>

              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isSubmitting || !formData.name.trim() || !formData.address.trim()}
                sx={{ 
                  minWidth: 200,
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
                }}
              >
                {isSubmitting ? 'Registering...' : 'Register Processing Center'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Information Section */}
      <Paper sx={{ 
        mt: 4, 
        p: 3, 
        bgcolor: '#f8f9fa',
        borderRadius: 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#495057', mb: 2 }}>
          Processing Center Guidelines
        </Typography>
        <Box component="ul" sx={{ pl: 2, color: '#6c757d' }}>
          <li>Processing center name should be unique and descriptive</li>
          <li>Provide complete address for accurate location tracking</li>
          <li>Contact details help in communication during processing operations</li>
          <li>Once registered, you can send fabric cuts to this processing center</li>
          <li>All fields marked with * are required</li>
        </Box>
      </Paper>
    </Container>
  );
}

export default CreateProcessingCenter; 