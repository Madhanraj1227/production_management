import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import WarpForm from './components/WarpForm';
import WarpEditForm from './components/WarpEditForm';
import WarpList from './components/WarpList';
import FabricCutList from './components/FabricCutList';
import FabricCutForm from './components/FabricCutForm';
import LoomForm from './components/LoomForm';
import LoomList from './components/LoomList';
import LoomIn from './components/LoomIn';
import OrderList from './components/OrderList';
import FourPointInspection from './components/FourPointInspection';
import UnwashedInspection from './components/UnwashedInspection';
import WashedInspection from './components/WashedInspection';
import InspectionReports from './components/InspectionReports';
import JobWorkWages from './components/JobWorkWages';
import JobWorkWagesApprovals from './components/JobWorkWagesApprovals';
import InvoiceApprovalStatus from './components/InvoiceApprovalStatus';
import Finances from './components/Finances';
import CreateProcessingCenter from './components/CreateProcessingCenter';
import SendForProcessing from './components/SendForProcessing';
import ProcessingOrderForm from './components/ProcessingOrderForm';
import ReceiveFromProcessing from './components/ReceiveFromProcessing';
import ReceiveFromProcessingHistory from './components/ReceiveFromProcessingHistory';
import FabricMovement from './components/FabricMovement';

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
        // Automatically log in if fullAccess is true
        if (userSession.fullAccess) {
          setUser(userSession);
        } else {
          localStorage.removeItem('userSession');
        }
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <ErrorBoundary>
          {user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<OrderList />} />
                <Route path="/orders/new" element={<OrderForm />} />
                <Route path="/warps" element={<WarpList />} />
                <Route path="/warps/new" element={<WarpForm />} />
                <Route path="/warps/edit/:id" element={<WarpEditForm />} />
                <Route path="/fabric-cuts" element={<FabricCutList />} />
                <Route path="/fabric-cuts/new" element={<FabricCutForm />} />
                <Route path="/looms" element={<LoomList />} />
                <Route path="/looms/new" element={<LoomForm />} />
                <Route path="/loom-in" element={<LoomIn />} />
                <Route path="/loom-in/:view" element={<LoomIn />} />
                <Route path="/inspection/4-point" element={<FourPointInspection />} />
                <Route path="/inspection/unwashed" element={<UnwashedInspection />} />
                <Route path="/inspection/washed" element={<WashedInspection />} />
                <Route path="/inspection-reports" element={<InspectionReports />} />
                <Route path="/job-work-wages" element={<JobWorkWages />} />
                <Route path="/approvals/job-work-wages" element={<JobWorkWagesApprovals />} />
                <Route path="/invoice-approvals/job-work-wages" element={<InvoiceApprovalStatus />} />
                <Route path="/finances" element={<Finances />} />
                <Route path="/processing/create-center" element={<CreateProcessingCenter />} />
                <Route path="/processing/send" element={<SendForProcessing />} />
                <Route path="/processing/receive" element={<ReceiveFromProcessingHistory />} />
                <Route path="/processing/receive/scan" element={<ReceiveFromProcessing />} />
                <Route path="/processing/receive/history" element={<ReceiveFromProcessingHistory />} />
                <Route path="/processing/create-order" element={<ProcessingOrderForm />} />
                <Route path="/fabric-movement" element={<FabricMovement />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </Layout>
          ) : (
            <Login onLogin={handleLogin} />
          )}
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  );
}

export default App;
