/**
 * Register definitions and metadata
 * Provides lookup functions and constants for register handling
 */

import { SunSpecModels, OperatingState, ChargeStatus, DataType } from '../../../shared/types.js';

/**
 * Convert signed integer to uint16 representation
 */
function convertToInt16(value) {
  if (value < 0) {
    return 65536 + value; // Two's complement for negative numbers
  }
  return value;
}

/**
 * Get register metadata by address
 */
export function getRegisterMetadata(address, allRegisters) {
  return allRegisters.find(r => r.address === address);
}

/**
 * Get all registers for a specific SunSpec model
 */
export function getModelRegisters(modelId, allRegisters) {
  // Find model start by looking for the model ID register
  const modelStart = allRegisters.find(r => 
    r.name === 'ID' && parseInt(r.range) === modelId
  );
  
  if (!modelStart) return [];
  
  // Find length register (next register after ID)
  const lengthReg = allRegisters.find(r => r.address === modelStart.address + 1);
  if (!lengthReg) return [];
  
  const modelLength = parseInt(lengthReg.range) || 50;
  const endAddress = modelStart.address + 1 + modelLength;
  
  return allRegisters.filter(r => 
    r.address >= modelStart.address && r.address <= endAddress
  );
}

/**
 * Initialize register with proper default values based on SunSpec spec
 */
export function initializeRegisterDefaults(registers) {
  const initialized = [...registers];
  
  for (const reg of initialized) {
    // SunSpec magic number - uint32 value 0x53756e53 ("SunS")
    if (reg.address === 40001 && reg.name === 'SID') {
      reg.value = 0x53756e53; // Full 32-bit SunSpec ID
    }
    
    // Common Model ID (40003) - Always 1 for Common Model
    else if (reg.address === 40003 && reg.name === 'ID') {
      reg.value = 1;
    }
    
    // SunSpec Model Length Registers - CRITICAL for EDMM-20 discovery!
    // Common Model (1) - Length = 65
    else if (reg.address === 40004 && reg.name === 'L') {
      reg.value = 65;
    }
    // Inverter Model (103) - Length = 50
    else if (reg.address === 40071 && reg.name === 'L') {
      reg.value = 50;
    }
    // Nameplate Model (120) - Length = 26
    else if (reg.address === 40123 && reg.name === 'L') {
      reg.value = 26;
    }
    // Settings Model (121) - Length = 30
    else if (reg.address === 40151 && reg.name === 'L') {
      reg.value = 30;
    }
    // Status Model (122) - Length = 44
    else if (reg.address === 40183 && reg.name === 'L') {
      reg.value = 44;
    }
    // Controls Model (123) - Length = 24
    else if (reg.address === 40229 && reg.name === 'L') {
      reg.value = 24;
    }
    // Storage Model (124) - Length = 24
    else if (reg.address === 40345 && reg.name === 'L') {
      reg.value = 24;
    }
    // MPPT Model (160) - Length = 88
    else if (reg.address === 40255 && reg.name === 'L') {
      reg.value = 88;
    }
    
    // PV Connection Status (40184 - PVConn) - CRITICAL for EDMM-20!
    // Bitfield: Bit 0=Connected, Bit 1=Available, Bit 2=Operating
    // Value 7 = 0b00000111 = Connected + Available + Operating
    else if (reg.address === 40184 && reg.name === 'PVConn') {
      reg.value = 7; // PV is connected, available, and operating
    }
    
    // Storage Connection Status (40185 - StorConn)
    // For Gen24 Plus with storage, set to 7 (connected + available + operating)
    // For systems without storage, can be 0
    else if (reg.address === 40185 && reg.name === 'StorConn') {
      reg.value = 7; // Storage is connected, available, and operating
    }
    
    // Rated Power (Nennleistung) - CRITICAL for EDMM-20!
    // WRtg (40125) - Continuous power output capability
    else if (reg.address === 40125 && reg.name === 'WRtg') {
      reg.value = 10000; // 10kW inverter (with SF=0, this is 10000W)
    }
    // WRtg_SF (40126) - Scale factor for WRtg
    else if (reg.address === 40126 && reg.name === 'WRtg_SF') {
      reg.value = convertToInt16(0); // 0 = no scaling
    }
    // WMax (40152) - Maximum power output setting (defaults to WRtg)
    else if (reg.address === 40152 && reg.name === 'WMax') {
      reg.value = 10000; // 10kW maximum
    }
    // WMax_SF (40172) - Scale factor for WMax
    else if (reg.address === 40172 && reg.name === 'WMax_SF') {
      reg.value = convertToInt16(0); // 0 = no scaling
    }
    
    // Scale Factors - CRITICAL for proper value interpretation!
    // Power Scale Factors - CRITICAL: All power values use SF=0 for 10kW inverter
    // W_SF (40085) - AC Active Power scale factor
    else if (reg.address === 40085 && reg.name === 'W_SF') {
      reg.value = convertToInt16(0); // 0 means no scaling (1:1)
    }
    // VA_SF (40089) - AC Apparent Power scale factor
    else if (reg.address === 40089 && reg.name === 'VA_SF') {
      reg.value = convertToInt16(0); // 0 means no scaling (1:1)
    }
    // VAr_SF (40091) - AC Reactive Power scale factor
    else if (reg.address === 40091 && reg.name === 'VAr_SF') {
      reg.value = convertToInt16(0); // 0 means no scaling (1:1)
    }
    // DCW_SF (40102) - DC Power scale factor
    else if (reg.address === 40102 && reg.name === 'DCW_SF') {
      reg.value = convertToInt16(0); // 0 means no scaling (1:1)
    }
    // DCW_SF for MPPT Model 160 (40258)
    else if (reg.address === 40258 && reg.name === 'DCW_SF') {
      reg.value = convertToInt16(0); // 0 means no scaling (1:1)
    }
    // A_SF (40073) - AC Current scale factor
    else if (reg.address === 40073 && reg.name === 'A_SF') {
      reg.value = convertToInt16(-2); // -2 means multiply by 0.01
    }
    // V_SF (40083) - AC Voltage scale factor
    else if (reg.address === 40083 && reg.name === 'V_SF') {
      reg.value = convertToInt16(-1); // -1 means multiply by 0.1
    }
    // Hz_SF (40087) - Frequency scale factor
    else if (reg.address === 40087 && reg.name === 'Hz_SF') {
      reg.value = convertToInt16(-2); // -2 means multiply by 0.01
    }
    // PF_SF (40091) - Power Factor scale factor
    else if (reg.address === 40091 && reg.name === 'PF_SF') {
      reg.value = convertToInt16(-3); // -3 means multiply by 0.001
    }
    
    // Common model - Manufacturer
    else if (reg.address >= 40005 && reg.address <= 40020 && reg.name === 'Mn') {
      reg.value = stringToRegisters('Fronius').slice(0, 16);
    }
    
    // Device model name
    else if (reg.address >= 40021 && reg.address <= 40036 && reg.name === 'Md') {
      reg.value = stringToRegisters('Gen24 SIM').slice(0, 16);
    }
    
    // Version
    else if (reg.address >= 40045 && reg.address <= 40052 && reg.name === 'Vr') {
      reg.value = stringToRegisters('1.28.5-1').slice(0, 8);
    }
    
    // Serial number
    else if (reg.address >= 40053 && reg.address <= 40068 && reg.name === 'SN') {
      reg.value = stringToRegisters('12345678').slice(0, 16);
    }
    
    // Device address
    else if (reg.address === 40069 && reg.name === 'DA') {
      reg.value = 1;
    }
    
    // SunSpec Model ID Registers
    // Inverter Model (103)
    else if (reg.address === 40070 && reg.name === 'ID') {
      reg.value = 103;
    }
    // Nameplate Model (120)
    else if (reg.address === 40122 && reg.name === 'ID') {
      reg.value = 120;
    }
    // Settings Model (121)
    else if (reg.address === 40150 && reg.name === 'ID') {
      reg.value = 121;
    }
    // Status Model (122)
    else if (reg.address === 40182 && reg.name === 'ID') {
      reg.value = 122;
    }
    // Controls Model (123)
    else if (reg.address === 40228 && reg.name === 'ID') {
      reg.value = 123;
    }
    // Storage Model (124)
    else if (reg.address === 40344 && reg.name === 'ID') {
      reg.value = 124;
    }
    // MPPT Model (160)
    else if (reg.address === 40254 && reg.name === 'ID') {
      reg.value = 160;
    }
    
    // Scale factors (commonly -2 for power, -1 for voltage/current)
    else if (reg.type === 'sunssf') {
      if (reg.name.includes('W_SF') || reg.name.includes('VA_SF')) {
        reg.value = -2; // Power scale: 0.01
      } else if (reg.name.includes('V_SF')) {
        reg.value = -2; // Voltage scale: 0.01
      } else if (reg.name.includes('A_SF')) {
        reg.value = -2; // Current scale: 0.01
      } else if (reg.name.includes('PF_SF')) {
        reg.value = -3; // Power factor scale: 0.001
      } else if (reg.name.includes('Hz_SF')) {
        reg.value = -2; // Frequency scale: 0.01
      } else {
        reg.value = -2; // Default scale
      }
    }
    
    // Operating state - default to OFF
    else if (reg.address === 40108 && reg.name === 'St') {
      reg.value = OperatingState.OFF;
    }
    
    // Grid frequency - default to 50.00 Hz (5000 with SF=-2)
    else if (reg.name === 'Hz') {
      reg.value = 5000;
    }
    
    // Power factor - default to 1.0 (1000 with SF=-3)
    else if (reg.name === 'PF') {
      reg.value = 1000;
    }
    
    // AC Voltage - default to 230V (23000 with SF=-2)
    else if (reg.name === 'PhVphA' || reg.name === 'PhVphB' || reg.name === 'PhVphC') {
      reg.value = 23000;
    }
    
    // DER Type - PV with Storage
    else if (reg.name === 'DERTyp') {
      reg.value = 82; // PV_STOR
    }
    
    // Connection state - default to connected
    else if (reg.name === 'Conn') {
      reg.value = 1;
    }
    
    // Enable registers - default to disabled
    else if (reg.name && reg.name.endsWith('_Ena')) {
      reg.value = 0;
    }
    
    // WMaxLimPct - default to 100% (10000 with SF=-2)
    else if (reg.name === 'WMaxLimPct') {
      reg.value = 10000;
    }
    
    // Battery charge state - default to OFF
    else if (reg.name === 'ChaSt') {
      reg.value = ChargeStatus.OFF;
    }
    
    // End block markers (SunSpec requires 0xFFFF to terminate model list)
    else if (reg.name === 'ID' && (reg.address === 40303 || reg.address === 40370)) {
      reg.value = 0xFFFF; // End of SunSpec models
    }
    else if (reg.name === 'L' && (reg.address === 40304 || reg.address === 40371)) {
      reg.value = 0; // End block length is always 0
    }
  }
  
  return initialized;
}

/**
 * Convert string to array of register values (2 chars per register)
 */
function stringToRegisters(str) {
  const registers = [];
  for (let i = 0; i < str.length; i += 2) {
    const char1 = str.charCodeAt(i) || 0;
    const char2 = str.charCodeAt(i + 1) || 0;
    registers.push((char1 << 8) | char2);
  }
  return registers;
}

/**
 * Convert register array to string
 */
export function registersToString(registers) {
  let str = '';
  for (const reg of registers) {
    const char1 = (reg >> 8) & 0xFF;
    const char2 = reg & 0xFF;
    if (char1 > 0) str += String.fromCharCode(char1);
    if (char2 > 0) str += String.fromCharCode(char2);
  }
  return str.replace(/\0/g, '').trim();
}

/**
 * Apply scale factor to get actual value
 */
export function applyScaleFactor(value, scaleFactor) {
  return value * Math.pow(10, scaleFactor);
}

/**
 * Remove scale factor to get register value
 */
export function removeScaleFactor(actualValue, scaleFactor) {
  return Math.round(actualValue / Math.pow(10, scaleFactor));
}

export default {
  getRegisterMetadata,
  getModelRegisters,
  initializeRegisterDefaults,
  registersToString,
  applyScaleFactor,
  removeScaleFactor
};

