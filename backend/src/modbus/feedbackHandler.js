/**
 * Feedback Handler - Command-Response Feedback System
 * Manages status updates and reversion timers for writable registers
 */

import EventEmitter from 'events';
import { OperatingState, ChargeStatus } from '../../../shared/types.js';

class FeedbackHandler extends EventEmitter {
  constructor(registerStore) {
    super();
    this.registerStore = registerStore;
    this.reversionTimers = new Map();
    this.timerInterval = null;
    
    // Listen for register changes
    this.registerStore.on('registerChanged', (event) => {
      this.handleRegisterChange(event);
    });
  }

  /**
   * Start the feedback handler
   */
  start() {
    // Start 1-second timer for reversion countdowns
    this.timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
    
    console.log('Feedback handler started');
  }

  /**
   * Stop the feedback handler
   */
  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Clear all timers
    this.reversionTimers.clear();
    
    console.log('Feedback handler stopped');
  }

  /**
   * Handle register changes
   */
  handleRegisterChange(event) {
    const { address, changes, metadata } = event;
    
    if (!metadata || !metadata.name) return;
    
    const name = metadata.name;
    
    // Handle specific control registers
    switch (name) {
      case 'Conn':
        this.handleConnectionChange(changes[0].newValue);
        this.startReversionTimer('conn', 40231, 1);
        break;
      
      case 'WMaxLimPct':
        this.handlePowerLimitChange(changes[0].newValue);
        this.startReversionTimer('powerLimit', 40235, 10000);
        break;
      
      case 'WMaxLim_Ena':
        this.handlePowerLimitEnable(changes[0].newValue);
        break;
      
      case 'OutPFSet':
        this.handlePowerFactorChange(changes[0].newValue);
        this.startReversionTimer('powerFactor', 40244, 1000);
        break;
      
      case 'VArPct':
        this.handleVarChange(changes[0].newValue);
        this.startReversionTimer('var', 40251, 0);
        break;
      
      case 'StorCtl_Mod':
        this.handleStorageMode(changes[0].newValue);
        break;
      
      case 'OutWRte':
      case 'InWRte':
        this.handleStorageRateChange();
        this.startReversionTimer('storageRate', 40358, 10000);
        break;
      
      case 'MinRsvPct':
        this.handleMinReserveChange(changes[0].newValue);
        break;
    }
  }

  /**
   * Handle connection state change
   */
  handleConnectionChange(value) {
    if (value === 0) {
      // Disconnecting
      this.registerStore.setRegisterByNameInternal('St', OperatingState.SHUTTING_DOWN);
      
      // After delay, set to standby
      setTimeout(() => {
        this.registerStore.setRegisterByNameInternal('St', OperatingState.STANDBY);
      }, 2000);
    } else {
      // Connecting
      this.registerStore.setRegisterByNameInternal('St', OperatingState.STARTING);
      
      // After delay, set to appropriate state based on power
      setTimeout(() => {
        const power = this.registerStore.getRegisterByName('W');
        if (power && power.value > 0) {
          this.registerStore.setRegisterByNameInternal('St', OperatingState.MPPT);
        } else {
          this.registerStore.setRegisterByNameInternal('St', OperatingState.STANDBY);
        }
      }, 2000);
    }
  }

  /**
   * Handle power limit change
   */
  handlePowerLimitChange(value) {
    const enableReg = this.registerStore.getRegisterByName('WMaxLim_Ena');
    
    if (enableReg && enableReg.value === 1) {
      // Power limiting is enabled
      if (value < 10000) { // Less than 100%
        this.registerStore.setRegisterByNameInternal('St', OperatingState.THROTTLED);
      } else {
        const connReg = this.registerStore.getRegisterByName('Conn');
        if (connReg && connReg.value === 1) {
          this.registerStore.setRegisterByNameInternal('St', OperatingState.MPPT);
        }
      }
      
      // Emit event for simulation to adjust power
      this.emit('powerLimitChanged', value / 10000); // Convert to percentage (0-1)
    }
  }

  /**
   * Handle power limit enable
   */
  handlePowerLimitEnable(value) {
    if (value === 1) {
      // Enabled - apply current limit
      const limitReg = this.registerStore.getRegisterByName('WMaxLimPct');
      if (limitReg) {
        this.handlePowerLimitChange(limitReg.value);
      }
    } else {
      // Disabled - return to normal operation
      const connReg = this.registerStore.getRegisterByName('Conn');
      if (connReg && connReg.value === 1) {
        this.registerStore.setRegisterByNameInternal('St', OperatingState.MPPT);
      }
      this.emit('powerLimitChanged', 1.0); // 100%
    }
  }

  /**
   * Handle power factor change
   */
  handlePowerFactorChange(value) {
    // Update the actual power factor register (would be handled by simulation)
    this.emit('powerFactorChanged', value / 1000); // Scale factor -3
  }

  /**
   * Handle VAR change
   */
  handleVarChange(value) {
    this.emit('varChanged', value);
  }

  /**
   * Handle storage control mode
   */
  handleStorageMode(mode) {
    // Update charge status based on mode
    const chaSt = this.registerStore.getRegisterByName('ChaSt');
    
    if (mode === 0) {
      // Off
      if (chaSt) {
        this.registerStore.setRegisterByNameInternal('ChaSt', ChargeStatus.OFF);
      }
    } else if (mode === 3) {
      // Charge/Discharge mode - will be set by rate handlers
      this.handleStorageRateChange();
    }
  }

  /**
   * Handle storage rate change
   */
  handleStorageRateChange() {
    const outWRte = this.registerStore.getRegisterByName('OutWRte');
    const inWRte = this.registerStore.getRegisterByName('InWRte');
    
    if (!outWRte || !inWRte) return;
    
    // Determine charge status
    if (Math.abs(outWRte.value) > Math.abs(inWRte.value)) {
      // Discharging
      this.registerStore.setRegisterByNameInternal('ChaSt', ChargeStatus.DISCHARGING);
      this.emit('storageRateChanged', { type: 'discharge', rate: outWRte.value / 10000 });
    } else if (Math.abs(inWRte.value) > Math.abs(outWRte.value)) {
      // Charging
      this.registerStore.setRegisterByNameInternal('ChaSt', ChargeStatus.CHARGING);
      this.emit('storageRateChanged', { type: 'charge', rate: inWRte.value / 10000 });
    } else {
      // Holding
      this.registerStore.setRegisterByNameInternal('ChaSt', ChargeStatus.HOLDING);
      this.emit('storageRateChanged', { type: 'hold', rate: 0 });
    }
  }

  /**
   * Handle minimum reserve change
   */
  handleMinReserveChange(value) {
    this.emit('minReserveChanged', value / 100); // Convert to percentage
  }

  /**
   * Start reversion timer
   */
  startReversionTimer(name, timeoutAddress, defaultValue) {
    // Get timeout value from register
    const timeoutReg = this.registerStore.getMetadata(timeoutAddress);
    if (!timeoutReg) return;
    
    const timeout = this.registerStore.read(timeoutAddress, 1)[0];
    
    if (timeout === 0) {
      // Infinite timeout - don't start timer
      this.reversionTimers.delete(name);
      return;
    }
    
    // Store timer info
    this.reversionTimers.set(name, {
      timeout,
      remaining: timeout,
      defaultValue,
      targetRegister: timeoutAddress - 1 // Assumes control register is before timeout register
    });
  }

  /**
   * Timer tick (called every second)
   */
  tick() {
    for (const [name, timer] of this.reversionTimers) {
      if (timer.remaining > 0) {
        timer.remaining--;
        
        if (timer.remaining === 0) {
          // Timeout expired - revert to default
          this.revertToDefault(name, timer);
        }
      }
    }
  }

  /**
   * Revert register to default value
   */
  revertToDefault(name, timer) {
    console.log(`Reverting ${name} to default value ${timer.defaultValue}`);
    
    try {
      this.registerStore.write(timer.targetRegister, [timer.defaultValue]);
      this.reversionTimers.delete(name);
      
      this.emit('reverted', { name, defaultValue: timer.defaultValue });
    } catch (error) {
      console.error(`Error reverting ${name}:`, error);
    }
  }

  /**
   * Cancel reversion timer
   */
  cancelTimer(name) {
    this.reversionTimers.delete(name);
  }

  /**
   * Get active timers
   */
  getActiveTimers() {
    const timers = [];
    for (const [name, timer] of this.reversionTimers) {
      timers.push({
        name,
        remaining: timer.remaining,
        total: timer.timeout
      });
    }
    return timers;
  }
}

export default FeedbackHandler;

