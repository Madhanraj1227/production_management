import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import YarnDashboard from './components/YarnDashboard';
import GreigeYarnInput from './components/GreigeYarnInput';
import GreigeYarnDelivery from './components/GreigeYarnDelivery';
import DyedYarnInput from './components/DyedYarnInput';
import DyedYarnDelivery from './components/DyedYarnDelivery';
import YarnInventory from './components/YarnInventory';
import OrderForm from './components/OrderForm';
import WarpForm from './components/WarpForm';
import WarpEditForm from './components/WarpEditForm';
import FabricCutForm from './components/FabricCutForm';
import LoomForm from './components/LoomForm';
import OrderList from './components/OrderList';
import WarpList from './components/WarpList';
import FabricCutList from './components/FabricCutList';
import LoomList from './components/LoomList';
import LoomIn from './components/LoomIn';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
      try {
        const userSession = JSON.parse(savedSession);
        setUser(userSession);
      } catch (error) {
        console.error('Error parsing user session:', error);
        localStorage.removeItem('userSession');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userSession) => {
    setUser(userSession);
  };

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    setUser(null);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <img 
              src="/ashok-textiles-logo.png" 
              alt="Company Logo" 
              style={{ width: 80, height: 80, marginBottom: 20 }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{ 
              width: 40, 
              height: 40, 
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #8B0000',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <style>
              {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
            </style>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <Login onLogin={handleLogin} />
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router>
          <Navbar user={user} onLogout={handleLogout} />
          <Routes>
            {/* Dashboard Routes - Role-based */}
            {user?.yarnOnly ? (
              <>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/yarn/greige-input" element={<GreigeYarnInput />} />
                <Route path="/yarn/greige-delivery" element={<GreigeYarnDelivery />} />
                <Route path="/yarn/dyed-input" element={<DyedYarnInput />} />
                <Route path="/yarn/dyed-delivery" element={<DyedYarnDelivery />} />
                <Route path="/yarn/inventory" element={<YarnInventory />} />
                {/* Redirect any unknown paths to dashboard for yarn users */}
                <Route path="*" element={<Dashboard user={user} />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Dashboard user={user} />} />
                {/* Fabric Management Routes - Only for Admin and Fabric Manager */}
                {(user?.fullAccess || user?.fabricAccess) && (
                  <>
                    <Route path="/orders/new" element={<OrderForm />} />
                    <Route path="/orders" element={<OrderList />} />
                    <Route path="/warps/new" element={<WarpForm />} />
                    <Route path="/warps/edit/:id" element={<WarpEditForm />} />
                    <Route path="/warps" element={<WarpList />} />
                    <Route path="/fabric-cuts/new" element={<FabricCutForm />} />
                    <Route path="/fabric-cuts" element={<FabricCutList />} />
                    <Route path="/looms/new" element={<LoomForm />} />
                    <Route path="/looms" element={<LoomList />} />
                    <Route path="/loom-in" element={<LoomIn />} />
                    <Route path="/loom-in/:view" element={<LoomIn />} />
                  </>
                )}
              </>
            )}
          </Routes>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
