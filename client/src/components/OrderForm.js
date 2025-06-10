import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Fade,
  Avatar,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import BusinessIcon from '@mui/icons-material/Business';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

// Styled Components
const StyledPaper = styled(Paper)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: theme.spacing(1),
  borderRadius: theme.spacing(3),
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
}));

const ContentCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2.5),
  border: '1px solid rgba(255,255,255,0.2)',
  boxShadow: 'none',
}));

const SectionCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(145deg, #f8faff 0%, #ffffff 100%)',
  border: '1px solid #e1e8f7',
  borderRadius: theme.spacing(2),
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
  },
}));

const FileUploadCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  border: '2px dashed #ff9a56',
  borderRadius: theme.spacing(2),
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'scale(1.02)',
    borderColor: '#ff7043',
    boxShadow: '0 8px 20px rgba(255,154,86,0.3)',
  },
  '&.uploaded': {
    background: 'linear-gradient(135deg, #d4ff8a 0%, #8bc34a 100%)',
    borderColor: '#4caf50',
    '&:hover': {
      borderColor: '#388e3c',
    },
  },
}));

const GradientButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
  border: 0,
  borderRadius: theme.spacing(3),
  color: 'white',
  height: 48,
  padding: '0 30px',
  fontSize: '1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 3px 15px rgba(102, 126, 234, 0.4)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
  },
  '&:disabled': {
    background: 'linear-gradient(45deg, #cbd5e0 30%, #a0aec0 90%)',
    transform: 'none',
    boxShadow: 'none',
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(1.5),
    background: 'rgba(255,255,255,0.8)',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255,255,255,0.95)',
    },
    '&.Mui-focused': {
      background: 'white',
      '& fieldset': {
        borderColor: '#667eea',
        borderWidth: 2,
      },
    },
  },
}));

const steps = ['Basic Information', 'Production Details', 'Document Upload'];

function OrderForm() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    designName: '',
    designNumber: '',
    orderQuantity: '',
    warpingQuantity: '',
    type: '',
    count: '',
    construction: '',
    merchandiser: '',
  });

  const [files, setFiles] = useState({
    designSheet: null,
    yarnRequirementSheet: null,
    dyeingOrderForm: null,
  });

  const [uploadStatus, setUploadStatus] = useState({});
  const [generatedOrderNumber, setGeneratedOrderNumber] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      
      setFiles({
        ...files,
        [fileType]: file,
      });
      
      setUploadStatus({
        ...uploadStatus,
        [fileType]: 'selected',
      });
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const isStepValid = (step) => {
    switch (step) {
      case 0:
        return formData.designName && formData.designNumber && formData.orderQuantity && formData.warpingQuantity && formData.type && Number(formData.warpingQuantity) > Number(formData.orderQuantity);
      case 1:
        return true; // Optional fields
      case 2:
        return true; // File uploads are optional
      default:
        return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      formDataToSend.set('orderQuantity', Number(formData.orderQuantity));
      
      Object.keys(files).forEach(key => {
        if (files[key]) {
          formDataToSend.append(key, files[key]);
        }
      });

      setUploadStatus({ uploading: true });
      
      const response = await axios.post(buildApiUrl('orders'), formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setGeneratedOrderNumber(response.data.orderNumber);
      setUploadStatus({ success: true });
      
      setTimeout(() => {
        navigate('/orders');
      }, 3000);
      
    } catch (error) {
      console.error('Error creating order:', error);
      setUploadStatus({ error: 'Error creating order. Please try again.' });
    }
  };

  const FileUploadField = ({ label, fileType, icon, accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png" }) => {
    const isUploaded = files[fileType];
    
    const handleCardClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const fileInput = document.getElementById(`file-upload-${fileType}`);
      if (fileInput) {
        fileInput.click();
      }
    };
    
    return (
      <FileUploadCard 
        className={isUploaded ? 'uploaded' : ''}
        onClick={handleCardClick}
        sx={{ cursor: 'pointer' }}
      >
        <CardContent sx={{ textAlign: 'center', p: 3 }}>
          <Avatar 
            sx={{ 
              width: 60, 
              height: 60, 
              margin: '0 auto 16px',
              bgcolor: isUploaded ? '#4caf50' : '#ff9a56',
            }}
          >
            {isUploaded ? <CheckCircleIcon /> : icon}
          </Avatar>
          
          <Typography variant="h6" gutterBottom color={isUploaded ? 'success.main' : 'primary'}>
            {label}
          </Typography>
          
          <input
            accept={accept}
            style={{ display: 'none' }}
            id={`file-upload-${fileType}`}
            type="file"
            onChange={(e) => handleFileChange(e, fileType)}
            onClick={(e) => e.stopPropagation()}
          />
          
          <Button
            variant={isUploaded ? "outlined" : "contained"}
            startIcon={isUploaded ? <CheckCircleIcon /> : <CloudUploadIcon />}
            color={isUploaded ? "success" : "primary"}
            onClick={handleCardClick}
            sx={{ 
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              pointerEvents: 'none', // Prevent button click since card handles it
            }}
          >
            {isUploaded ? 'File Selected' : 'Choose File'}
          </Button>
          
          {isUploaded && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={`${files[fileType].name} (${(files[fileType].size / 1024).toFixed(1)} KB)`}
                color="success"
                variant="outlined"
                size="small"
              />
            </Box>
          )}
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            PDF, DOC, DOCX, JPG, PNG (Max 5MB)
          </Typography>
        </CardContent>
      </FileUploadCard>
    );
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Fade in timeout={500}>
            <SectionCard>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Avatar sx={{ width: 60, height: 60, margin: '0 auto 16px', bgcolor: '#667eea' }}>
                    <BusinessIcon />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    Basic Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tell us about your order requirements
                  </Typography>
                  {formData.type && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                      <Typography variant="body2">
                        <strong>Order Number:</strong> Will be auto-generated as AT/{new Date().getFullYear()}/{formData.type === 'bulk' ? 'B' : 'S'}/xxxxx
                      </Typography>
                    </Alert>
                  )}
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Order Type</InputLabel>
                      <Select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        label="Order Type"
                        sx={{ 
                          borderRadius: 1.5,
                          background: 'rgba(255,255,255,0.8)',
                        }}
                      >
                        <MenuItem value="bulk">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="Bulk" color="primary" size="small" />
                            <Typography>Bulk Production</Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="sample">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="Sample" color="secondary" size="small" />
                            <Typography>Sample Development</Typography>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      fullWidth
                      label="Order Quantity (meters)"
                      name="orderQuantity"
                      type="number"
                      value={formData.orderQuantity}
                      onChange={handleChange}
                      required
                      placeholder="Enter quantity in meters"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      fullWidth
                      label="Warping Quantity (meters)"
                      name="warpingQuantity"
                      type="number"
                      value={formData.warpingQuantity}
                      onChange={handleChange}
                      required
                      placeholder="Enter warping quantity"
                      error={formData.orderQuantity && formData.warpingQuantity && Number(formData.warpingQuantity) <= Number(formData.orderQuantity)}
                      helperText={
                        formData.orderQuantity && formData.warpingQuantity && Number(formData.warpingQuantity) <= Number(formData.orderQuantity)
                          ? "Warping quantity must be greater than order quantity"
                          : "Include extra quantity for shrinkage and wastage"
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      fullWidth
                      label="Design Name"
                      name="designName"
                      value={formData.designName}
                      onChange={handleChange}
                      required
                      placeholder="Enter design name"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      fullWidth
                      label="Design Number"
                      name="designNumber"
                      value={formData.designNumber}
                      onChange={handleChange}
                      required
                      placeholder="Enter design number"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </SectionCard>
          </Fade>
        );

      case 1:
        return (
          <Fade in timeout={500}>
            <SectionCard>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Avatar sx={{ width: 60, height: 60, margin: '0 auto 16px', bgcolor: '#764ba2' }}>
                    <DesignServicesIcon />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    Production Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Specify technical and production details
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      fullWidth
                      label="Count"
                      name="count"
                      value={formData.count}
                      onChange={handleChange}
                      placeholder="e.g., 40s, 60s"
                      helperText="Yarn count specification"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <StyledTextField
                      fullWidth
                      label="Construction"
                      name="construction"
                      value={formData.construction}
                      onChange={handleChange}
                      placeholder="e.g., Plain weave, Twill"
                      helperText="Fabric construction type"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <StyledTextField
                      fullWidth
                      label="Merchandiser"
                      name="merchandiser"
                      value={formData.merchandiser}
                      onChange={handleChange}
                      placeholder="Enter merchandiser name"
                      helperText="Responsible merchandiser for this order"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </SectionCard>
          </Fade>
        );

      case 2:
        return (
          <Fade in timeout={500}>
            <SectionCard>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Avatar sx={{ width: 60, height: 60, margin: '0 auto 16px', bgcolor: '#ff9a56' }}>
                    <AttachFileIcon />
                  </Avatar>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    Document Upload
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload supporting documents for your order (Optional)
                  </Typography>
                </Box>
                
                {/* File Upload Section - Outside of form context */}
                <Box onClick={(e) => e.stopPropagation()}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <FileUploadField
                        label="Design Sheet"
                        fileType="designSheet"
                        icon={<DesignServicesIcon />}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <FileUploadField
                        label="Yarn Requirement"
                        fileType="yarnRequirementSheet"
                        icon={<BusinessIcon />}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <FileUploadField
                        label="Dyeing Order Form"
                        fileType="dyeingOrderForm"
                        icon={<CloudUploadIcon />}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> Document uploads are optional. You can create the order without uploading files and add them later if needed.
                  </Typography>
                </Alert>
              </CardContent>
            </SectionCard>
          </Fade>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <StyledPaper>
        <ContentCard>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h3" component="h1" fontWeight="bold" sx={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}>
                Create New Order
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Follow the steps to create your textile order
              </Typography>
            </Box>

            {/* Status Alerts */}
            {uploadStatus.uploading && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography fontWeight="bold">Creating Order...</Typography>
                <LinearProgress sx={{ mt: 1 }} />
              </Alert>
            )}
            
            {uploadStatus.success && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography fontWeight="bold">
                  Order created successfully! 
                  {generatedOrderNumber && (
                    <>
                      <br />
                      Order Number: <strong>{generatedOrderNumber}</strong>
                    </>
                  )}
                  <br />
                  Redirecting to orders list...
                </Typography>
              </Alert>
            )}
            
            {uploadStatus.error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography fontWeight="bold">{uploadStatus.error}</Typography>
              </Alert>
            )}

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel sx={{
                    '& .MuiStepIcon-root': {
                      color: '#e0e0e0',
                      '&.Mui-active': {
                        color: '#667eea',
                      },
                      '&.Mui-completed': {
                        color: '#4caf50',
                      },
                    },
                  }}>
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Form Content - Only for non-file steps */}
            {activeStep < 2 && (
              <Box component="form" onSubmit={handleSubmit}>
                {renderStepContent(activeStep)}

                {/* Navigation Buttons for Form Steps */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    type="button"
                    onClick={() => navigate('/orders')}
                    variant="outlined"
                    sx={{ 
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#5a67d8',
                        background: 'rgba(102, 126, 234, 0.04)',
                      },
                    }}
                  >
                    Cancel
                  </Button>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {activeStep > 0 && (
                      <Button
                        type="button"
                        onClick={handleBack}
                        variant="outlined"
                        sx={{ 
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Back
                      </Button>
                    )}
                    
                    <GradientButton
                      type="button"
                      onClick={handleNext}
                      disabled={!isStepValid(activeStep)}
                    >
                      Next Step
                    </GradientButton>
                  </Box>
                </Box>
              </Box>
            )}

            {/* File Upload Step - Completely outside form */}
            {activeStep === 2 && (
              <Box>
                {renderStepContent(activeStep)}

                {/* Navigation Buttons for File Upload Step */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    type="button"
                    onClick={() => navigate('/orders')}
                    variant="outlined"
                    sx={{ 
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#5a67d8',
                        background: 'rgba(102, 126, 234, 0.04)',
                      },
                    }}
                  >
                    Cancel
                  </Button>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      type="button"
                      onClick={handleBack}
                      variant="outlined"
                      sx={{ 
                        borderRadius: 3,
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Back
                    </Button>
                    
                    <GradientButton
                      type="button"
                      onClick={handleSubmit}
                      disabled={uploadStatus.uploading}
                    >
                      {uploadStatus.uploading ? 'Creating Order...' : 'Create Order'}
                    </GradientButton>
                  </Box>
                </Box>
              </Box>
            )}
          </CardContent>
        </ContentCard>
      </StyledPaper>
    </Container>
  );
}

export default OrderForm; 