/**
 * Main Simulator Class
 * Coordinates all components: register store, Modbus server, feedback, PV generation
 */

import EventEmitter from 'events';
import XMLParser from '../parser/xmlParser.js';
import { initializeRegisterDefaults } from '../parser/registerDefinitions.js';
import RegisterStore from '../modbus/registerStore.js';
import ModbusTCPServer from '../modbus/modbusServer.js';
import FeedbackHandler from '../modbus/feedbackHandler.js';
import PVGenerator from './pvGenerator.js';

class Simulator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      modbusPort: config.modbusPort || 502,
      modbusDeviceId: config.modbusDeviceId || 1,
      networkIP: config.networkIP || 'localhost',
      ...config
    };
    
    this.registerStore = null;
    this.modbusServer = null;
    this.feedbackHandler = null;
    this.pvGenerator = null;
    this.isInitialized = false;
    this.isRunning = false;
  }

  /**
   * Initialize the simulator
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Simulator already initialized');
      return;
    }

    console.log('Initializing Fronius Gen24 Modbus Simulator...');

    try {
      // Parse XML register maps
      console.log('Parsing XML register maps...');
      const parser = new XMLParser();
      const registerDefs = await parser.parseAllFiles();
      
      // Initialize register definitions with default values
      const initializedRegs = initializeRegisterDefaults(registerDefs);

      // Create register store
      this.registerStore = new RegisterStore();
      this.registerStore.initialize(initializedRegs);

      // Create Modbus TCP server
      this.modbusServer = new ModbusTCPServer(
        this.registerStore,
        this.config.modbusPort,
        this.config.modbusDeviceId
      );

      // Create feedback handler
      this.feedbackHandler = new FeedbackHandler(this.registerStore);

      // Create PV generator
      this.pvGenerator = new PVGenerator(this.registerStore);

      // Connect feedback handler to PV generator
      this.feedbackHandler.on('powerLimitChanged', (factor) => {
        this.pvGenerator.setPowerLimitFactor(factor);
      });

      // Forward events
      this.registerStore.on('registerChanged', (data) => {
        this.emit('registerChanged', data);
      });

      this.registerStore.on('overridesChanged', (overrides) => {
        this.emit('overridesChanged', overrides);
      });

      this.pvGenerator.on('powerUpdated', (powerStatus) => {
        this.emit('powerChanged', powerStatus);
      });

      this.modbusServer.on('started', () => {
        this.emit('statusChanged');
      });

      this.modbusServer.on('stopped', () => {
        this.emit('statusChanged');
      });

      this.modbusServer.on('clientConnected', () => {
        this.emit('statusChanged');
      });

      this.modbusServer.on('clientDisconnected', () => {
        this.emit('statusChanged');
      });

      this.isInitialized = true;
      console.log('Simulator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize simulator:', error);
      throw error;
    }
  }

  /**
   * Start the simulator
   */
  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isRunning) {
      throw new Error('Simulator is already running');
    }

    console.log('Starting simulator...');

    // Start Modbus server
    await this.modbusServer.start();

    // Start feedback handler
    this.feedbackHandler.start();

    // Start PV generator
    this.pvGenerator.start();

    this.isRunning = true;
    this.emit('statusChanged');
    
    console.log('Simulator started successfully');
  }

  /**
   * Stop the simulator
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping simulator...');

    // Stop PV generator
    this.pvGenerator.stop();

    // Stop feedback handler
    this.feedbackHandler.stop();

    // Stop Modbus server
    await this.modbusServer.stop();

    this.isRunning = false;
    this.emit('statusChanged');
    
    console.log('Simulator stopped');
  }

  /**
   * Reset simulator to defaults
   */
  reset() {
    this.registerStore.reset();
    this.pvGenerator.setTargetPower(0);
    this.emit('statusChanged');
  }

  /**
   * Set PV power output
   */
  setPower(watts) {
    if (!this.pvGenerator) {
      throw new Error('Simulator not initialized');
    }
    
    this.pvGenerator.setTargetPower(watts);
    this.emit('powerChanged');
  }

  /**
   * Get power status
   */
  getPowerStatus() {
    if (!this.pvGenerator) {
      return null;
    }
    
    return this.pvGenerator.getStatus();
  }

  /**
   * Get simulator status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      modbus: this.modbusServer ? this.modbusServer.getStatus() : null,
      power: this.getPowerStatus(),
      config: this.config,
      networkIP: this.config.networkIP
    };
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    if (this.isRunning) {
      throw new Error('Cannot update configuration while simulator is running');
    }
    
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get all registers
   */
  getAllRegisters() {
    if (!this.registerStore) {
      return [];
    }
    
    return this.registerStore.getAllMetadata().map(meta => ({
      ...meta,
      value: this.registerStore.read(meta.address, 1)[0],
      scaledValue: this.registerStore.getScaledValue(meta.address)
    }));
  }

  /**
   * Get register by address
   */
  getRegister(address, count = 1) {
    if (!this.registerStore) {
      return null;
    }
    
    const metadata = this.registerStore.getMetadata(address);
    if (!metadata) {
      return null;
    }
    
    const values = this.registerStore.read(address, count);
    
    return {
      ...metadata,
      value: values[0],
      values: values,
      scaledValue: this.registerStore.getScaledValue(address)
    };
  }

  /**
   * Set register value
   */
  setRegister(address, value) {
    if (!this.registerStore) {
      throw new Error('Simulator not initialized');
    }
    
    this.registerStore.write(address, [value]);
  }

  /**
   * Force write to any register including read-only (creates manual override)
   * This freezes the register from auto-calculation for advanced testing
   */
  setRegisterOverride(address, values) {
    if (!this.registerStore) {
      throw new Error('Simulator not initialized');
    }
    
    this.registerStore.setManualOverride(address, values);
  }

  /**
   * Clear manual override for a register (resume auto-calculation)
   */
  clearRegisterOverride(address) {
    if (!this.registerStore) {
      throw new Error('Simulator not initialized');
    }
    
    return this.registerStore.clearOverride(address);
  }

  /**
   * Clear all manual overrides (resume all auto-calculations)
   */
  clearAllOverrides() {
    if (!this.registerStore) {
      throw new Error('Simulator not initialized');
    }
    
    return this.registerStore.clearAllOverrides();
  }

  /**
   * Get list of all overridden register addresses
   */
  getOverriddenRegisters() {
    if (!this.registerStore) {
      return [];
    }
    
    const addresses = this.registerStore.getOverriddenRegisters();
    
    // Return with metadata for each overridden register
    return addresses.map(address => {
      const metadata = this.registerStore.getMetadata(address);
      return {
        address,
        name: metadata ? metadata.name : 'Unknown',
        value: this.registerStore.read(address, 1)[0],
        scaledValue: this.registerStore.getScaledValue(address)
      };
    });
  }

  /**
   * Get available SunSpec models
   */
  getModels() {
    // Return list of implemented models
    return [
      { id: 1, name: 'Common', description: 'Well-known model for all SunSpec compliant devices' },
      { id: 103, name: 'Inverter (Int+SF)', description: 'Three phase inverter with integer + scale factor' },
      { id: 120, name: 'Nameplate', description: 'Inverter nameplate ratings' },
      { id: 121, name: 'Basic Settings', description: 'Basic inverter settings' },
      { id: 122, name: 'Extended Measurements', description: 'Extended measurements and status' },
      { id: 123, name: 'Immediate Controls', description: 'Immediate inverter controls' },
      { id: 124, name: 'Storage Control', description: 'Battery storage control' },
      { id: 160, name: 'MPPT Extension', description: 'Multiple MPPT inverter extension' }
    ];
  }

  /**
   * Get registers for a specific model
   */
  getModelRegisters(modelId) {
    if (!this.registerStore) {
      return [];
    }
    
    return this.registerStore.getRegistersByModel(modelId);
  }
}

export default Simulator;


