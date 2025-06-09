import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Avatar,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  LockOutlined,
  Visibility,
  VisibilityOff,
  Person,
  Business
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: 400,
  margin: 'auto',
  marginTop: theme.spacing(8),
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  margin: theme.spacing(1),
  backgroundColor: '#8B0000',
  width: theme.spacing(7),
  height: theme.spacing(7),
}));

const LoginForm = styled('form')(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(1),
}));

const SubmitButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(3, 0, 2),
  padding: theme.spacing(1.5),
  backgroundColor: '#8B0000',
  '&:hover': {
    backgroundColor: '#660000',
  },
}));

const BackgroundContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(3),
  gap: theme.spacing(2),
}));

const LogoImage = styled('img')(({ theme }) => ({
  width: 60,
  height: 60,
  borderRadius: theme.spacing(1),
  objectFit: 'contain',
}));

// Predefined users for production system
const DEMO_USERS = [
  { username: 'admin', password: 'admin123', role: 'Admin', fullAccess: true },
  { username: 'fabric', password: 'fabric123', role: 'Fabric Manager', fabricAccess: true },
  { username: 'yarn', password: 'yarn123', role: 'Yarn Manager', yarnOnly: true }
];

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { username, password } = formData;

    // Check credentials
    const user = DEMO_USERS.find(u => 
      u.username === username && u.password === password
    );

    if (user) {
      // Store user session
      const userSession = {
        username: user.username,
        role: user.role,
        fullAccess: user.fullAccess || false,
        fabricAccess: user.fabricAccess || false,
        yarnOnly: user.yarnOnly || false,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem('userSession', JSON.stringify(userSession));
      onLogin(userSession);
    } else {
      setError('Invalid username or password');
    }
    
    setLoading(false);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <BackgroundContainer>
      <Container component="main" maxWidth="xs">
        <StyledPaper elevation={6}>
          <LogoContainer>
            <LogoImage 
              src="/ashok-textiles-logo.png" 
              alt="Company Logo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <Box>
              <Typography component="h1" variant="h5" sx={{ color: '#8B0000', fontWeight: 'bold' }}>
                Ashok Textiles
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                Production Management System
              </Typography>
            </Box>
          </LogoContainer>

          <StyledAvatar>
            <LockOutlined />
          </StyledAvatar>
          
          <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <LoginForm onSubmit={handleSubmit}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <SubmitButton
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Business />}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </SubmitButton>
          </LoginForm>

          <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, width: '100%' }}>
            <Typography variant="body2" color="textSecondary" align="center" gutterBottom>
              <strong>Login Credentials:</strong>
            </Typography>
            <Typography variant="caption" display="block" align="center">
              • admin / admin123 (Admin - Full Access)
            </Typography>
            <Typography variant="caption" display="block" align="center">
              • fabric / fabric123 (Fabric Manager)
            </Typography>
            <Typography variant="caption" display="block" align="center">
              • yarn / yarn123 (Yarn Manager)
            </Typography>
          </Box>
        </StyledPaper>
      </Container>
    </BackgroundContainer>
  );
}

export default Login; 