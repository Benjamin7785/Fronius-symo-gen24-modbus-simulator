/**
 * Register Store - In-memory storage for all Modbus registers
 * Manages register values, provides read/write access, and emits change events
 */

import EventEmitter from 'events';
import { readValue, writeValue, validateValue } from './dataTypes.js';
import { applyScaleFactor, removeScaleFactor } from '../parser/registerDefinitions.js';

class RegisterStore extends EventEmitter {
  constructor() {
    super();
    this.registers = new Array(400).fill(0); // Array for holding register values (40001-40400)
    this.registerMetadata = new Map(); // Map of address -> register metadata
    this.scaleFactors = new Map(); // Map of register name -> scale factor register address
    this.manualOverrides = new Set(); // Set of addresses with manual overrides (frozen from auto-calculation)
  }

  /**
   * Initialize store with register definitions
   */
  initialize(registerDefinitions) {
    console.log(`Initializing register store with ${registerDefinitions.length} definitions`);
    
    // Clear existing data
    this.registerMetadata.clear();
    this.scaleFactors.clear();
    
    // Build metadata map and set initial values
    for (const reg of registerDefinitions) {
      this.registerMetadata.set(reg.address, reg);
      
      // Set initial value
      if (reg.value !== undefined) {
        const index = reg.address - 40001;
        if (index >= 0 && index < this.registers.length) {
          // Handle string values specially
          if (reg.type === 'string' && Array.isArray(reg.value)) {
            for (let i = 0; i < reg.value.length && index + i < this.registers.length; i++) {
              this.registers[index + i] = reg.value[i];
            }
          } else if (reg.type === 'uint32' || reg.type === 'int32' || reg.type === 'bitfield32') {
            // Handle 32-bit values
            this.registers[index] = (reg.value >> 16) & 0xFFFF;
            if (index + 1 < this.registers.length) {
              this.registers[index + 1] = reg.value & 0xFFFF;
            }
          } else {
            this.registers[index] = reg.value & 0xFFFF;
          }
        }
      }
      
      // Track scale factor relationships
      if (reg.scaleFactor && reg.scaleFactor !== '') {
        this.scaleFactors.set(reg.name, reg.scaleFactor);
      }
    }
    
    console.log(`Register store initialized with ${this.registerMetadata.size} registers`);
  }

  /**
   * Read register value(s)
   */
  read(address, count = 1) {
    const values = [];
    
    for (let i = 0; i < count; i++) {
      const addr = address + i;
      const index = addr - 40001;
      
      if (index >= 0 && index < this.registers.length) {
        values.push(this.registers[index]);
      } else {
        values.push(0); // Return 0 for out-of-range addresses
      }
    }
    
    return values;
  }

  /**
   * Write register value(s)
   */
  write(address, values) {
    if (!Array.isArray(values)) {
      values = [values];
    }
    
    const metadata = this.registerMetadata.get(address);
    
    // Check if register is writable
    if (metadata && !metadata.writable) {
      throw new Error(`Register ${address} is read-only`);
    }
    
    // Validate value
    if (metadata && values.length > 0) {
      if (!validateValue(values[0], metadata.range, metadata.type)) {
        throw new Error(`Invalid value for register ${address}: ${values[0]}`);
      }
    }
    
    // Write values
    const changedRegisters = [];
    for (let i = 0; i < values.length; i++) {
      const addr = address + i;
      const index = addr - 40001;
      
      if (index >= 0 && index < this.registers.length) {
        const oldValue = this.registers[index];
        this.registers[index] = values[i] & 0xFFFF;
        
        if (oldValue !== this.registers[index]) {
          changedRegisters.push({ address: addr, oldValue, newValue: this.registers[index] });
        }
      }
    }
    
    // Emit change event
    if (changedRegisters.length > 0) {
      this.emit('registerChanged', {
        address,
        count: values.length,
        changes: changedRegisters,
        metadata
      });
    }
    
    return true;
  }

  /**
   * Get register metadata
   */
  getMetadata(address) {
    return this.registerMetadata.get(address);
  }

  /**
   * Get all register metadata
   */
  getAllMetadata() {
    return Array.from(this.registerMetadata.values());
  }

  /**
   * Get register value with scale factor applied
   */
  getScaledValue(address) {
    const metadata = this.getMetadata(address);
    if (!metadata) return null;
    
    const rawValue = readValue(this.registers, address, metadata.type, metadata.size);
    
    // Apply scale factor if available
    if (metadata.scaleFactor && metadata.scaleFactor !== '') {
      const sfName = metadata.scaleFactor;
      // Find scale factor register
      const sfReg = Array.from(this.registerMetadata.values()).find(r => r.name === sfName);
      if (sfReg) {
        const sf = readValue(this.registers, sfReg.address, sfReg.type);
        return applyScaleFactor(rawValue, sf);
      }
    }
    
    return rawValue;
  }

  /**
   * Set register value with scale factor
   */
  setScaledValue(address, scaledValue) {
    const metadata = this.getMetadata(address);
    if (!metadata) return false;
    
    let rawValue = scaledValue;
    
    // Remove scale factor if available
    if (metadata.scaleFactor && metadata.scaleFactor !== '') {
      const sfName = metadata.scaleFactor;
      const sfReg = Array.from(this.registerMetadata.values()).find(r => r.name === sfName);
      if (sfReg) {
        const sf = readValue(this.registers, sfReg.address, sfReg.type);
        rawValue = removeScaleFactor(scaledValue, sf);
      }
    }
    
    return writeValue(this.registers, address, metadata.type, rawValue, metadata.size);
  }

  /**
   * Get registers by model
   */
  getRegistersByModel(modelId) {
    const registers = [];
    
    for (const [address, metadata] of this.registerMetadata) {
      // Simple model detection - could be improved
      if (metadata.description && metadata.description.includes(`model ${modelId}`)) {
        registers.push({
          ...metadata,
          value: this.read(address, 1)[0],
          scaledValue: this.getScaledValue(address)
        });
      }
    }
    
    return registers;
  }

  /**
   * Get register by name
   */
  getRegisterByName(name) {
    for (const [address, metadata] of this.registerMetadata) {
      if (metadata.name === name) {
        return {
          ...metadata,
          value: this.read(address, 1)[0],
          scaledValue: this.getScaledValue(address)
        };
      }
    }
    return null;
  }

  /**
   * Internal write method that bypasses read-only check (for simulation)
   * Respects manual overrides - will not write to overridden registers
   */
  writeInternal(address, values) {
    const changedRegisters = [];
    
    for (let i = 0; i < values.length; i++) {
      const addr = address + i;
      const index = addr - 40001;
      
      // Skip if register is manually overridden (frozen)
      if (this.manualOverrides.has(addr)) {
        continue;
      }
      
      if (index >= 0 && index < this.registers.length) {
        const oldValue = this.registers[index];
        this.registers[index] = values[i];
        
        if (oldValue !== values[i]) {
          changedRegisters.push({
            address: addr,
            value: values[i],
            scaledValue: this.getScaledValue(addr)
          });
        }
      }
    }
    
    if (changedRegisters.length > 0) {
      this.emit('change', changedRegisters);
    }
    
    return true;
  }

  /**
   * Set register by name (public - uses write with read-only check)
   */
  setRegisterByName(name, value) {
    for (const [address, metadata] of this.registerMetadata) {
      if (metadata.name === name) {
        return this.write(address, [value]);
      }
    }
    return false;
  }

  /**
   * Set register by name (internal - bypasses read-only check for simulation)
   */
  setRegisterByNameInternal(name, value) {
    for (const [address, metadata] of this.registerMetadata) {
      if (metadata.name === name) {
        return this.writeInternal(address, [value]);
      }
    }
    return false;
  }

  /**
   * Reset all registers to default values
   */
  reset() {
    // Re-initialize would restore defaults
    this.emit('reset');
  }

  /**
   * Get raw register array (for Modbus server direct access)
   */
  getRawRegisters() {
    return this.registers;
  }

  /**
   * Set manual override for a register (force write, freezes auto-calculation)
   * This allows writing to read-only registers for advanced testing
   */
  setManualOverride(address, values) {
    if (!Array.isArray(values)) {
      values = [values];
    }
    
    const changedRegisters = [];
    
    for (let i = 0; i < values.length; i++) {
      const addr = address + i;
      const index = addr - 40001;
      
      if (index >= 0 && index < this.registers.length) {
        const oldValue = this.registers[index];
        this.registers[index] = values[i] & 0xFFFF;
        
        // Mark as overridden (frozen)
        this.manualOverrides.add(addr);
        
        if (oldValue !== this.registers[index]) {
          changedRegisters.push({
            address: addr,
            value: this.registers[index],
            scaledValue: this.getScaledValue(addr),
            overridden: true
          });
        }
      }
    }
    
    // Emit change and override events
    if (changedRegisters.length > 0) {
      this.emit('change', changedRegisters);
      this.emit('overridesChanged', Array.from(this.manualOverrides));
    }
    
    console.log(`[Override] Register ${address} manually overridden (frozen from auto-calculation)`);
    return true;
  }

  /**
   * Clear manual override for a register (resume auto-calculation)
   */
  clearOverride(address) {
    const wasOverridden = this.manualOverrides.has(address);
    
    if (wasOverridden) {
      this.manualOverrides.delete(address);
      this.emit('overridesChanged', Array.from(this.manualOverrides));
      console.log(`[Override] Register ${address} override cleared (auto-calculation resumed)`);
    }
    
    return wasOverridden;
  }

  /**
   * Clear all manual overrides (resume all auto-calculations)
   */
  clearAllOverrides() {
    const count = this.manualOverrides.size;
    
    if (count > 0) {
      this.manualOverrides.clear();
      this.emit('overridesChanged', []);
      console.log(`[Override] All ${count} overrides cleared (auto-calculation resumed)`);
    }
    
    return count;
  }

  /**
   * Check if a register is manually overridden (frozen)
   */
  isOverridden(address) {
    return this.manualOverrides.has(address);
  }

  /**
   * Get list of all overridden register addresses
   */
  getOverriddenRegisters() {
    return Array.from(this.manualOverrides);
  }

  /**
   * Get address by register name
   */
  getAddressByName(name) {
    for (const [address, metadata] of this.registerMetadata) {
      if (metadata.name === name) {
        return address;
      }
    }
    return null;
  }
}

export default RegisterStore;

