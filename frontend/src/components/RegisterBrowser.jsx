import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Box,
  TextField,
  InputAdornment
} from '@mui/material';
import { Search } from '@mui/icons-material';
import RegisterTable from './RegisterTable';
import { getAllRegisters, getModels } from '../services/api';
import { onRegisterChanged } from '../services/websocket';

const RegisterBrowser = () => {
  const [registers, setRegisters] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Subscribe to register changes
    const unsubscribe = onRegisterChanged(handleRegisterChange);

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [regsResponse, modelsResponse] = await Promise.all([
        getAllRegisters(),
        getModels()
      ]);
      setRegisters(regsResponse.data);
      setModels(modelsResponse.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterChange = (data) => {
    // Update register values in real-time
    setRegisters(prev => {
      const updated = [...prev];
      data.changes?.forEach(change => {
        const index = updated.findIndex(r => r.address === change.address);
        if (index !== -1) {
          updated[index] = { ...updated[index], value: change.newValue };
        }
      });
      return updated;
    });
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const filterRegisters = (regs) => {
    if (!searchQuery) return regs;

    const query = searchQuery.toLowerCase();
    return regs.filter(reg => 
      reg.address.toString().includes(query) ||
      reg.name?.toLowerCase().includes(query) ||
      reg.description?.toLowerCase().includes(query)
    );
  };

  const getRegistersByTab = () => {
    if (selectedTab === 0) {
      // All registers
      return filterRegisters(registers);
    } else if (selectedTab === 1) {
      // Writable registers only
      return filterRegisters(registers.filter(r => r.writable));
    } else {
      // Model-specific registers
      const modelId = models[selectedTab - 2]?.id;
      if (!modelId) return [];
      
      // Filter by model (simple heuristic based on description)
      const filtered = registers.filter(reg => 
        reg.description?.includes(`model ${modelId}`) ||
        reg.description?.includes(`${modelId}`)
      );
      return filterRegisters(filtered);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Register Browser
          </Typography>
          <TextField
            placeholder="Search registers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab label="All Registers" />
            <Tab label="Writable" />
            {models.map((model) => (
              <Tab key={model.id} label={model.name} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ mt: 2 }}>
          <RegisterTable registers={getRegistersByTab()} loading={loading} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default RegisterBrowser;


