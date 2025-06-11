import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';

function UnwashedInspection() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CleaningServicesIcon sx={{ mr: 2, fontSize: 32, color: '#8B0000' }} />
        <Typography variant="h4" component="h1" sx={{ color: '#8B0000', fontWeight: 'bold' }}>
          Unwashed Inspection
        </Typography>
      </Box>
      
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Unwashed Fabric Inspection System
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          This section will contain the unwashed fabric inspection functionality.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
          Coming soon...
        </Typography>
      </Paper>
    </Container>
  );
}

export default UnwashedInspection; 