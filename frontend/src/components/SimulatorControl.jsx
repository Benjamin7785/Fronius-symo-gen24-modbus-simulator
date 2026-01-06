import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Chip,
  Slider,
  TextField,
  Alert
} from '@mui/material';
import { PlayArrow, Stop, Refresh } from '@mui/icons-material';
import { startSimulator, stopSimulator, resetSimulator, setPower, getSimulatorStatus } from '../services/api';
import { onStatus, onPowerChanged, requestStatus, requestPower } from '../services/websocket';

const SimulatorControl = () => {
  const [status, setStatus] = useState(null);
  const [power, setPowerValue] = useState(0);
  const [targetPower, setTargetPower] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initial status fetch
    loadStatus();

    // Subscribe to WebSocket updates
    const unsubscribeStatus = onStatus(handleStatusUpdate);
    const unsubscribePower = onPowerChanged(handlePowerUpdate);

    return () => {
      unsubscribeStatus();
      unsubscribePower();
    };
  }, []);

  const loadStatus = async () => {
    try {
      const response = await getSimulatorStatus();
      setStatus(response.data);
      if (response.data.power) {
        setPowerValue(response.data.power.targetPower);
        setTargetPower(response.data.power.targetPower);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  const handleStatusUpdate = (data) => {
    setStatus(data);
  };

  const handlePowerUpdate = (data) => {
    console.log('Power update received:', data);
    
    // Update power values
    if (data.targetPower !== undefined) {
      setPowerValue(data.targetPower);
      setTargetPower(data.targetPower);
    }
    
    // Update status with new power data
    setStatus(prevStatus => {
      if (!prevStatus) return prevStatus;
      return {
        ...prevStatus,
        power: data
      };
    });
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      await startSimulator();
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError(null);
    try {
      await stopSimulator();
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      await resetSimulator();
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePowerChange = (event, newValue) => {
    setTargetPower(newValue);
  };

  const handlePowerCommit = async (event, newValue) => {
    try {
      await setPower(newValue);
      setPowerValue(newValue);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handlePowerInput = (event) => {
    const value = Number(event.target.value);
    if (!isNaN(value) && value >= 0 && value <= 10000) {
      setTargetPower(value);
      handlePowerCommit(null, value);
    }
  };

  const isRunning = status?.running || false;

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Simulator Control
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Status
              </Typography>
              <Chip
                label={isRunning ? 'Running' : 'Stopped'}
                color={isRunning ? 'success' : 'default'}
                sx={{ mr: 1 }}
              />
              {status?.modbus && (
                <Chip
                  label={`Port ${status.modbus.port}`}
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
              )}
              {status?.modbus?.clientCount !== undefined && (
                <Chip
                  label={`${status.modbus.clientCount} client(s)`}
                  variant="outlined"
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrow />}
                onClick={handleStart}
                disabled={isRunning || loading}
              >
                Start
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={handleStop}
                disabled={!isRunning || loading}
              >
                Stop
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              PV Power Output
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={targetPower}
                onChange={handlePowerChange}
                onChangeCommitted={handlePowerCommit}
                min={0}
                max={10000}
                step={100}
                marks={[
                  { value: 0, label: '0W' },
                  { value: 5000, label: '5kW' },
                  { value: 10000, label: '10kW' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${(value / 1000).toFixed(1)}kW`}
                disabled={!isRunning}
              />
            </Box>
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                label="Target Power (W)"
                type="number"
                value={targetPower}
                onChange={(e) => setTargetPower(Number(e.target.value))}
                onBlur={handlePowerInput}
                inputProps={{ min: 0, max: 10000, step: 100 }}
                size="small"
                disabled={!isRunning}
                sx={{ width: 150 }}
              />
              {status?.power && (
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Current Power
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {(status.power.currentPower).toFixed(1)} W
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Energy
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {(status.power.totalEnergy / 1000).toFixed(2)} kWh
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Efficiency
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {(status.power.efficiency * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>

          {status?.config && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <TextField
                  label="Network IP Address"
                  value={status.networkIP || 'localhost'}
                  InputProps={{
                    readOnly: true,
                  }}
                  size="small"
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="Modbus Port"
                  value={status.config.modbusPort}
                  InputProps={{
                    readOnly: true,
                  }}
                  size="small"
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Device ID"
                  value={status.config.modbusDeviceId}
                  InputProps={{
                    readOnly: true,
                  }}
                  size="small"
                  sx={{ width: 120 }}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SimulatorControl;


