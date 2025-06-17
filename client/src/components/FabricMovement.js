import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Tabs, Tab, AppBar, Paper
} from '@mui/material';
import MoveFabric from './MoveFabric';
import ReceiveFabrics from './ReceiveFabrics';
import { buildApiUrl } from '../config/api';
import axios from 'axios';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function FabricMovement() {
  const [tabValue, setTabValue] = useState(0);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(buildApiUrl('fabric-movements'));
      setMovements(response.data);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const handleMovementCreated = () => {
    fetchMovements(); // Refresh the list when a new movement is created
  };

  const handleMovementReceived = () => {
    fetchMovements(); // Refresh the list when movements are received
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <AppBar position="static" color="default" elevation={0}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white',
            p: 3
          }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              🚚 Fabric Movement
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
              Manage fabric transfers between locations
            </Typography>
          </Box>
          
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{ 
              bgcolor: 'white',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 'bold',
                minHeight: 60
              }
            }}
          >
            <Tab 
              label="Move Fabric" 
              icon={<span style={{ fontSize: '1.2rem' }}>📦</span>}
              iconPosition="start"
            />
            <Tab 
              label="Receive Fabrics" 
              icon={<span style={{ fontSize: '1.2rem' }}>📥</span>}
              iconPosition="start"
            />
          </Tabs>
        </AppBar>

        <TabPanel value={tabValue} index={0}>
          <MoveFabric onMovementCreated={handleMovementCreated} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ReceiveFabrics 
            movements={movements} 
            loading={loading}
            onMovementReceived={handleMovementReceived}
            refreshTrigger={0}
          />
        </TabPanel>
      </Paper>
    </Container>
  );
}

export default FabricMovement; 