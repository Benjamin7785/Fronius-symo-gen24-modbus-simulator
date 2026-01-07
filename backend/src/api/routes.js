/**
 * REST API Routes
 * Provides HTTP endpoints for simulator control and register access
 */

import express from 'express';

function createRoutes(simulator) {
  const router = express.Router();

  // Simulator control endpoints
  router.post('/simulator/start', async (req, res) => {
    try {
      await simulator.start();
      res.json({ success: true, message: 'Simulator started' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/simulator/stop', async (req, res) => {
    try {
      await simulator.stop();
      res.json({ success: true, message: 'Simulator stopped' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/simulator/status', (req, res) => {
    try {
      const status = simulator.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/simulator/reset', (req, res) => {
    try {
      simulator.reset();
      res.json({ success: true, message: 'Simulator reset' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/simulator/config', (req, res) => {
    res.json(simulator.getConfig());
  });

  router.put('/simulator/config', (req, res) => {
    try {
      simulator.updateConfig(req.body);
      res.json({ success: true, message: 'Configuration updated' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Power control endpoints
  router.put('/simulator/power', (req, res) => {
    try {
      const { power } = req.body;
      if (power === undefined || power < 0 || power > 10000) {
        return res.status(400).json({ error: 'Power must be between 0 and 10000 watts' });
      }
      
      simulator.setPower(power);
      res.json({ success: true, power });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/simulator/power', (req, res) => {
    try {
      const powerStatus = simulator.getPowerStatus();
      res.json(powerStatus);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register endpoints
  router.get('/registers', (req, res) => {
    try {
      const registers = simulator.getAllRegisters();
      res.json(registers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/registers/:address', (req, res) => {
    try {
      const address = parseInt(req.params.address);
      const count = parseInt(req.query.count) || 1;
      
      const register = simulator.getRegister(address, count);
      if (!register) {
        return res.status(404).json({ error: 'Register not found' });
      }
      
      res.json(register);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/registers/:address', (req, res) => {
    try {
      const address = parseInt(req.params.address);
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ error: 'Value is required' });
      }
      
      simulator.setRegister(address, value);
      res.json({ success: true, address, value });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Model endpoints
  router.get('/models', (req, res) => {
    try {
      const models = simulator.getModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/models/:modelId', (req, res) => {
    try {
      const modelId = parseInt(req.params.modelId);
      const registers = simulator.getModelRegisters(modelId);
      res.json(registers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Override endpoints (Advanced Testing Mode)
  // Force write to any register, including read-only (freezes auto-calculation)
  router.put('/registers/:address/override', (req, res) => {
    try {
      const address = parseInt(req.params.address);
      const { values } = req.body;
      
      if (!values || !Array.isArray(values)) {
        return res.status(400).json({ error: 'Values array is required' });
      }
      
      simulator.setRegisterOverride(address, values);
      res.json({ 
        success: true, 
        address, 
        values,
        message: 'Register manually overridden (frozen from auto-calculation)' 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Clear override for a specific register (resume auto-calculation)
  router.delete('/registers/:address/override', (req, res) => {
    try {
      const address = parseInt(req.params.address);
      
      const wasOverridden = simulator.clearRegisterOverride(address);
      if (wasOverridden) {
        res.json({ 
          success: true, 
          address,
          message: 'Override cleared, auto-calculation resumed' 
        });
      } else {
        res.status(404).json({ error: 'Register was not overridden' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Clear all overrides (resume all auto-calculations)
  router.delete('/registers/overrides', (req, res) => {
    try {
      const count = simulator.clearAllOverrides();
      res.json({ 
        success: true, 
        count,
        message: `${count} override(s) cleared, all auto-calculations resumed` 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get list of all overridden registers
  router.get('/registers/overrides', (req, res) => {
    try {
      const overrides = simulator.getOverriddenRegisters();
      res.json({ overrides });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default createRoutes;


