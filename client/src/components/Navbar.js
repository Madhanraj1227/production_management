import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import {
  Person,
  ExitToApp,
  AccessTime,
} from '@mui/icons-material';

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const isActive = (path) => location.pathname === path;

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    onLogout();
  };

  const getInitials = (username) => {
    return username ? username.substring(0, 2).toUpperCase() : 'US';
  };

  const formatLoginTime = (loginTime) => {
    if (!loginTime) return '';
    const date = new Date(loginTime);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#670d10' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Logo Section - Left */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/ashok-textiles-logo.png" 
            alt="Ashok Textiles Logo" 
            style={{ height: '50px', width: 'auto' }}
          />
        </Box>

        {/* Title Section - Center - Only show for fabric management users */}
        {!user?.yarnOnly && (
          <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
              Production Management
            </Typography>
          </Box>
        )}

        {/* Navigation Section - Right */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Dashboard - Always visible */}
          <Button 
            color="inherit" 
            component={Link} 
            to="/" 
            sx={{ 
              fontWeight: isActive('/') ? 'bold' : 'normal',
              backgroundColor: isActive('/') ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            Dashboard
          </Button>

          {/* Fabric Management Navigation - Only for Admin and Fabric Manager */}
          {(user?.fullAccess || user?.fabricAccess) && (
            <>
              <Button 
                color="inherit" 
                component={Link} 
                to="/orders" 
                sx={{ 
                  fontWeight: isActive('/orders') ? 'bold' : 'normal',
                  backgroundColor: isActive('/orders') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Orders
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/looms" 
                sx={{ 
                  fontWeight: isActive('/looms') ? 'bold' : 'normal',
                  backgroundColor: isActive('/looms') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Looms
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/warps" 
                sx={{ 
                  fontWeight: isActive('/warps') ? 'bold' : 'normal',
                  backgroundColor: isActive('/warps') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Warps
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/fabric-cuts" 
                sx={{ 
                  fontWeight: isActive('/fabric-cuts') ? 'bold' : 'normal',
                  backgroundColor: isActive('/fabric-cuts') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Fabric Cuts
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/loom-in" 
                sx={{ 
                  fontWeight: isActive('/loom-in') ? 'bold' : 'normal',
                  backgroundColor: isActive('/loom-in') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Loom-in
              </Button>
            </>
          )}

          {/* Yarn Management Navigation - Only for Yarn Manager */}
          {user?.yarnOnly && (
            <>
              <Button 
                color="inherit" 
                component={Link} 
                to="/yarn/greige-input" 
                sx={{ 
                  fontWeight: isActive('/yarn/greige-input') ? 'bold' : 'normal',
                  backgroundColor: isActive('/yarn/greige-input') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Greige Yarn Input
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/yarn/greige-delivery" 
                sx={{ 
                  fontWeight: isActive('/yarn/greige-delivery') ? 'bold' : 'normal',
                  backgroundColor: isActive('/yarn/greige-delivery') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Greige Yarn Delivery
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/yarn/dyed-input" 
                sx={{ 
                  fontWeight: isActive('/yarn/dyed-input') ? 'bold' : 'normal',
                  backgroundColor: isActive('/yarn/dyed-input') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Dyed Yarn Input
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/yarn/dyed-delivery" 
                sx={{ 
                  fontWeight: isActive('/yarn/dyed-delivery') ? 'bold' : 'normal',
                  backgroundColor: isActive('/yarn/dyed-delivery') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Dyed Yarn Delivery
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/yarn/inventory" 
                sx={{ 
                  fontWeight: isActive('/yarn/inventory') ? 'bold' : 'normal',
                  backgroundColor: isActive('/yarn/inventory') ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                Inventory
              </Button>
            </>
          )}

          {/* User Section */}
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={user?.role || 'User'}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
            <Button
              onClick={handleUserMenuOpen}
              sx={{
                color: 'white',
                textTransform: 'none',
                minWidth: 'auto',
                padding: 0,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  width: 35,
                  height: 35,
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                {getInitials(user?.username)}
              </Avatar>
            </Button>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  minWidth: 200,
                  mt: 1,
                }
              }}
            >
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #eee' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {user?.username}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {user?.role}
                </Typography>
              </Box>
              
              <MenuItem disabled>
                <ListItemIcon>
                  <AccessTime fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Logged in" 
                  secondary={formatLoginTime(user?.loginTime)}
                />
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <ExitToApp fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 