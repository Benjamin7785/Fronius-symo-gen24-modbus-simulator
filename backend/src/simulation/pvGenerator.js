/**
 * PV Power Generator - Realistic PV inverter simulation
 * Generates physically consistent AC/DC values with smooth transitions
 */

import { OperatingState } from '../../../shared/types.js';

import EventEmitter from 'events';

class PVGenerator extends EventEmitter {
  constructor(registerStore) {
    super();
    this.registerStore = registerStore;
    this.targetPower = 0; // Target AC power in watts
    this.currentPower = 0; // Current AC power (smoothed)
    this.updateInterval = null;
    this.lastUpdateTime = Date.now();
    
    // Configuration
    this.nominalVoltage = 230; // V (single phase)
    this.nominalFrequency = 50; // Hz
    this.powerFactor = 0.99;
    this.efficiency = 0.97; // Inverter efficiency
    this.smoothingFactor = 0.1; // Exponential smoothing (0-1, lower = smoother)
    this.noiseLevel = 0.02; // ±2% random variation
    
    // DC side (MPPT)
    this.dcVoltageBase = 600; // Base DC voltage
    this.mpptChannels = 4; // Number of MPPT inputs (EDMM-20 shows A, B, C, D)
    
    // Energy counter
    this.totalEnergy = 0; // Wh
    this.powerLimitFactor = 1.0; // 1.0 = 100%, can be reduced by control commands
  }

  /**
   * Start the simulation
   */
  start() {
    // Update at 1 Hz
    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000);
    
    console.log('PV Generator started');
  }

  /**
   * Stop the simulation
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    console.log('PV Generator stopped');
  }

  /**
   * Set target power output
   */
  setTargetPower(watts) {
    this.targetPower = Math.max(0, Math.min(watts, 10000));
    console.log(`Target power set to ${this.targetPower}W`);
    
    // Update operating state
    if (this.targetPower > 0) {
      const connReg = this.registerStore.getRegisterByName('Conn');
      if (connReg && connReg.value === 1) {
        this.registerStore.setRegisterByNameInternal('St', OperatingState.STARTING);
        setTimeout(() => {
          this.registerStore.setRegisterByNameInternal('St', OperatingState.MPPT);
        }, 2000);
      }
    } else {
      this.registerStore.setRegisterByNameInternal('St', OperatingState.STANDBY);
    }
  }

  /**
   * Set power limit factor (0.0 to 1.0)
   */
  setPowerLimitFactor(factor) {
    this.powerLimitFactor = Math.max(0, Math.min(factor, 1.0));
    console.log(`Power limit factor set to ${(this.powerLimitFactor * 100).toFixed(1)}%`);
  }

  /**
   * Update simulation (called every second)
   */
  update() {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // seconds
    this.lastUpdateTime = now;
    
    // Always update grid parameters (voltage and frequency) even when not producing
    this.updateGridParameters();
    
    // Check if connected
    const connReg = this.registerStore.getRegisterByName('Conn');
    if (!connReg || connReg.value === 0) {
      this.currentPower = 0;
      this.updateRegisters(0);
      return;
    }
    
    // Apply power limit
    const effectiveTarget = this.targetPower * this.powerLimitFactor;
    
    // Smooth transition using exponential smoothing
    this.currentPower = this.currentPower + this.smoothingFactor * (effectiveTarget - this.currentPower);
    
    // Add small random variation (Perlin-like noise simulation)
    const noise = (Math.random() - 0.5) * 2 * this.noiseLevel;
    const noisyPower = this.currentPower * (1 + noise);
    
    // Update energy counter (Wh)
    this.totalEnergy += (noisyPower * deltaTime) / 3600;
    
    // Update all registers
    this.updateRegisters(noisyPower);
    
    // Emit power update event
    this.emit('powerUpdated', this.getStatus());
  }

  /**
   * Update grid parameters (voltage and frequency) - always available
   */
  updateGridParameters() {
    const acVoltage = this.nominalVoltage + (Math.random() - 0.5) * 2; // ±1V variation
    const frequency = this.nominalFrequency + (Math.random() - 0.5) * 0.04; // ±0.02Hz
    
    // Voltage scale factor is -1 (0.1 scale) to match V_SF register
    const voltageSF = -1;
    const voltageScaleFactor = Math.pow(10, -voltageSF);
    
    // Frequency scale factor is -2 (0.01 scale)
    const freqSF = -2;
    const freqScaleFactor = Math.pow(10, -freqSF);
    
    // Update AC Voltage (V) - phase voltages
    this.updateIfExists('PhVphA', Math.round(acVoltage * voltageScaleFactor));
    this.updateIfExists('PhVphB', Math.round(acVoltage * voltageScaleFactor));
    this.updateIfExists('PhVphC', Math.round(acVoltage * voltageScaleFactor));
    
    // Update Frequency (Hz)
    this.updateIfExists('Hz', Math.round(frequency * freqScaleFactor));
  }

  /**
   * Update all inverter registers with physically consistent values
   */
  updateRegisters(acPower) {
    // AC Side values
    const acVoltage = this.nominalVoltage + (Math.random() - 0.5) * 2; // ±1V variation
    const frequency = this.nominalFrequency + (Math.random() - 0.5) * 0.04; // ±0.02Hz
    const powerFactor = this.powerFactor + (Math.random() - 0.5) * 0.02; // ±0.01 variation
    
    // Calculate AC current: I = P / (V × PF)
    const acCurrent = acVoltage > 0 ? acPower / (acVoltage * powerFactor) : 0;
    
    // Calculate per-phase currents (balanced three-phase)
    // For a balanced three-phase system, current per phase = total current / 3
    const currentPerPhase = acCurrent / 3;
    
    // Calculate line-to-line voltages (√3 × phase voltage)
    // In three-phase systems: V_LL = V_phase × 1.732
    const lineToLineVoltage = acVoltage * Math.sqrt(3);
    
    // Calculate apparent power: S = P / PF (VA)
    const apparentPower = powerFactor > 0 ? acPower / powerFactor : 0;
    
    // Calculate reactive power: Q = √(S² - P²) (VAr)
    // Using power triangle: Q = S × sin(arccos(PF))
    const reactivePower = Math.sqrt(Math.max(0, 
      apparentPower * apparentPower - acPower * acPower
    ));
    
    // DC Side values (with inverter efficiency)
    const dcPower = acPower / this.efficiency;
    
    // DC voltage varies with power output (characteristic of MPPT)
    const dcVoltage = this.dcVoltageBase + (dcPower / 50); // Increases slightly with power
    const dcCurrent = dcVoltage > 0 ? dcPower / dcVoltage : 0;
    
    // Update AC Current (A) - 40072, SF=-2 (0.01 scale)
    const currentSF = -2;
    const currentScaleFactor = Math.pow(10, -currentSF);
    this.registerStore.setRegisterByNameInternal('A', Math.round(acCurrent * currentScaleFactor));
    
    // Update AC Voltage (V) - SF=-1 (0.1 scale) to match V_SF register
    const voltageSF = -1;
    const voltageScaleFactor = Math.pow(10, -voltageSF);
    this.registerStore.setRegisterByNameInternal('PhVphA', Math.round(acVoltage * voltageScaleFactor));
    this.registerStore.setRegisterByNameInternal('PhVphB', Math.round(acVoltage * voltageScaleFactor));
    this.registerStore.setRegisterByNameInternal('PhVphC', Math.round(acVoltage * voltageScaleFactor));
    
    // Update AC Power (W) - 40084, SF=0 (no scaling, 1:1)
    // For 10kW inverter, we need no scaling to fit in int16 range
    this.registerStore.setRegisterByNameInternal('W', Math.round(acPower));
    
    // Update Power Factor (PF) - 40091, SF=-3 (0.001 scale)
    const pfSF = -3;
    const pfScaleFactor = Math.pow(10, -pfSF);
    this.registerStore.setRegisterByNameInternal('PF', Math.round(powerFactor * pfScaleFactor));
    
    // Update Frequency (Hz) - 40086, SF=-2 (0.01 scale)
    const freqSF = -2;
    const freqScaleFactor = Math.pow(10, -freqSF);
    this.registerStore.setRegisterByNameInternal('Hz', Math.round(frequency * freqScaleFactor));
    
    // Update per-phase AC currents (AphA, AphB, AphC) - 40073-40075, SF=-2
    // CRITICAL: EDMM-20 displays these as "Netzstrom Phase L1/L2/L3"
    this.updateIfExists('AphA', Math.round(currentPerPhase * currentScaleFactor));
    this.updateIfExists('AphB', Math.round(currentPerPhase * currentScaleFactor));
    this.updateIfExists('AphC', Math.round(currentPerPhase * currentScaleFactor));
    
    // Update line-to-line voltages (PPVphAB, PPVphBC, PPVphCA) - 40077-40079, SF=-1
    this.updateIfExists('PPVphAB', Math.round(lineToLineVoltage * voltageScaleFactor));
    this.updateIfExists('PPVphBC', Math.round(lineToLineVoltage * voltageScaleFactor));
    this.updateIfExists('PPVphCA', Math.round(lineToLineVoltage * voltageScaleFactor));
    
    // Update apparent power (VA) - 40088, SF=0 (same as W)
    this.updateIfExists('VA', Math.round(apparentPower));
    
    // Update reactive power (VAr) - 40090, SF=0 (same as W)
    this.updateIfExists('VAr', Math.round(reactivePower));
    
    // Update Energy Counter (WH) - 40113-40114 (uint32)
    // This needs special handling for 32-bit value
    const totalWh = Math.round(this.totalEnergy);
    const whHigh = (totalWh >> 16) & 0xFFFF;
    const whLow = totalWh & 0xFFFF;
    
    this.registerStore.writeInternal(40113, [whHigh, whLow]);
    
    // Update DC values for MPPT channels (Model 160)
    // Distribute power across MPPT channels
    const powerPerChannel = dcPower / this.mpptChannels;
    const currentPerChannel = dcCurrent / this.mpptChannels;
    
    // DC scale factors
    const dcCurrentSF = -2;
    const dcCurrentScaleFactor = Math.pow(10, -dcCurrentSF);
    const dcVoltageSF = -2;
    const dcVoltageScaleFactor = Math.pow(10, -dcVoltageSF);
    
    // Update overall DC values (Model 103) - 40097-40102
    this.updateIfExists('DCA', Math.round(dcCurrent * dcCurrentScaleFactor));
    this.updateIfExists('DCV', Math.round(dcVoltage * dcVoltageScaleFactor));
    this.updateIfExists('DCW', Math.round(dcPower));
    
    // Update MPPT Module 1 (Model 160) - 40273-40275
    // CRITICAL: EDMM-20 displays these as "DC Strom Eingang [A]", "DC Spannung Eingang [A]"
    this.updateIfExists('module/1/DCA', Math.round(currentPerChannel * dcCurrentScaleFactor));
    this.updateIfExists('module/1/DCV', Math.round(dcVoltage * dcVoltageScaleFactor));
    this.updateIfExists('module/1/DCW', Math.round(powerPerChannel));
    
    // Update MPPT Module 2 (Model 160) - 40293-40295
    // CRITICAL: EDMM-20 displays these as "DC Strom Eingang [B]", "DC Spannung Eingang [B]"
    this.updateIfExists('module/2/DCA', Math.round(currentPerChannel * dcCurrentScaleFactor));
    this.updateIfExists('module/2/DCV', Math.round(dcVoltage * dcVoltageScaleFactor));
    this.updateIfExists('module/2/DCW', Math.round(powerPerChannel));
    
    // Update MPPT Module 3 (Model 160) - 40313-40315
    // CRITICAL: EDMM-20 displays these as "DC Strom Eingang [C]", "DC Spannung Eingang [C]"
    this.updateIfExists('module/3/DCA', Math.round(currentPerChannel * dcCurrentScaleFactor));
    this.updateIfExists('module/3/DCV', Math.round(dcVoltage * dcVoltageScaleFactor));
    this.updateIfExists('module/3/DCW', Math.round(powerPerChannel));
    
    // Update MPPT Module 4 (Model 160) - 40333-40335
    // CRITICAL: EDMM-20 displays these as "DC Strom Eingang [D]", "DC Spannung Eingang [D]"
    this.updateIfExists('module/4/DCA', Math.round(currentPerChannel * dcCurrentScaleFactor));
    this.updateIfExists('module/4/DCV', Math.round(dcVoltage * dcVoltageScaleFactor));
    this.updateIfExists('module/4/DCW', Math.round(powerPerChannel))
    
    // Update operating state based on power
    if (acPower > 100) {
      const currentState = this.registerStore.getRegisterByName('St');
      if (currentState && currentState.value !== OperatingState.THROTTLED) {
        if (this.powerLimitFactor < 1.0) {
          this.registerStore.setRegisterByNameInternal('St', OperatingState.THROTTLED);
        } else {
          this.registerStore.setRegisterByNameInternal('St', OperatingState.MPPT);
        }
      }
    } else if (acPower < 10) {
      this.registerStore.setRegisterByNameInternal('St', OperatingState.STANDBY);
    }
    
    // Update temperature (simulated ambient variation)
    const temperature = 30 + Math.sin(Date.now() / 60000) * 10 + (Math.random() - 0.5) * 2;
    this.updateIfExists('TmpCab', Math.round(temperature * 10)); // Scale factor -1
  }

  /**
   * Update register if it exists
   */
  updateIfExists(name, value) {
    try {
      const reg = this.registerStore.getRegisterByName(name);
      if (reg) {
        this.registerStore.setRegisterByNameInternal(name, value);
      }
    } catch (e) {
      // Register doesn't exist, ignore
    }
  }

  /**
   * Get current power status
   */
  getStatus() {
    return {
      targetPower: this.targetPower,
      currentPower: this.currentPower,
      powerLimitFactor: this.powerLimitFactor,
      totalEnergy: this.totalEnergy,
      efficiency: this.efficiency
    };
  }
}

export default PVGenerator;

