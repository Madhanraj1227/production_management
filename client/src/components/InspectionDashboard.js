import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Assignment,
  LocalLaundryService,
  Opacity,
  CheckCircle
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const InspectionAvatar = styled(Avatar)(({ theme }) => ({
  width: theme.spacing(8),
  height: theme.spacing(8),
  margin: '0 auto',
  marginBottom: theme.spacing(2),
}));

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
  background: 'linear-gradient(135deg, #8B0000 0%, #660000 100%)',
  color: 'white',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
}));

function InspectionDashboard({ user }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const inspectionTypes = [
    {
      id: 'four-point',
      title: '4-Point Inspection',
      description: 'Standard fabric quality inspection using 4-point system',
      icon: <Assignment />,
      color: '#1976d2',
      path: '/inspection/four-point'
    },
    {
      id: 'unwashed',
      title: 'Unwashed Inspection',
      description: 'Pre-wash fabric quality inspection',
      icon: <Opacity />,
      color: '#ed6c02',
      path: '/inspection/unwashed'
    },
    {
      id: 'washed',
      title: 'Washed Inspection',
      description: 'Post-wash fabric quality inspection',
      icon: <LocalLaundryService />,
      color: '#2e7d32',
      path: '/inspection/washed'
    }
  ];

  const handleInspectionSelect = (inspectionType) => {
    navigate(inspectionType.path);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      paddingTop: { xs: 2, sm: 3 }
    }}>
      <MobileContainer maxWidth="lg">
        <HeaderPaper elevation={3}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1" 
            gutterBottom
            fontWeight="bold"
          >
            Fabric Inspection System
          </Typography>
          <Typography 
            variant={isMobile ? "body2" : "body1"} 
            sx={{ opacity: 0.9 }}
          >
            Welcome, {user?.username} | {user?.role}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ opacity: 0.8, display: 'block', mt: 1 }}
          >
            Select the type of inspection you want to perform
          </Typography>
        </HeaderPaper>

        <Grid container spacing={isMobile ? 2 : 3}>
          {inspectionTypes.map((inspection) => (
            <Grid item xs={12} sm={6} md={4} key={inspection.id}>
              <StyledCard 
                elevation={2}
                onClick={() => handleInspectionSelect(inspection)}
              >
                <CardContent sx={{ 
                  flexGrow: 1, 
                  textAlign: 'center',
                  py: { xs: 2, sm: 3 }
                }}>
                  <InspectionAvatar 
                    sx={{ 
                      backgroundColor: inspection.color,
                      width: { xs: 60, sm: 80 },
                      height: { xs: 60, sm: 80 }
                    }}
                  >
                    {inspection.icon}
                  </InspectionAvatar>
                  
                  <Typography 
                    variant={isMobile ? "h6" : "h5"} 
                    component="h2" 
                    gutterBottom
                    fontWeight="bold"
                  >
                    {inspection.title}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      lineHeight: 1.4
                    }}
                  >
                    {inspection.description}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    variant="contained"
                    size={isMobile ? "medium" : "large"}
                    sx={{
                      backgroundColor: inspection.color,
                      minWidth: { xs: 120, sm: 150 },
                      '&:hover': {
                        backgroundColor: inspection.color,
                        filter: 'brightness(0.9)',
                      },
                    }}
                    startIcon={<CheckCircle />}
                  >
                    Start Inspection
                  </Button>
                </CardActions>
              </StyledCard>
            </Grid>
          ))}
        </Grid>

        {/* Quick Stats Section */}
        <Paper 
          sx={{ 
            mt: { xs: 3, sm: 4 },
            p: { xs: 2, sm: 3 },
            textAlign: 'center'
          }}
          elevation={2}
        >
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            gutterBottom
            color="primary"
            fontWeight="bold"
          >
            Inspection Guidelines
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' },
              lineHeight: 1.6,
              maxWidth: 600,
              margin: '0 auto'
            }}
          >
            Ensure all fabric defects are properly documented. For 4-point inspection, 
            record defect types and quantities. Original quantity minus mistake quantity 
            equals the actual usable fabric quantity.
          </Typography>
        </Paper>
      </MobileContainer>
    </Box>
  );
}

export default InspectionDashboard; 