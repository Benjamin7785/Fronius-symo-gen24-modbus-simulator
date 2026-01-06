/**
 * Data type handlers for Modbus registers
 * Handles conversions between different data types
 */

import { DataType } from '../../../shared/types.js';

/**
 * Read value from register(s) based on data type
 */
export function readValue(registers, address, type, size = 1) {
  const index = address - 40001; // Convert to 0-based index
  
  if (index < 0 || index >= registers.length) {
    return null;
  }
  
  switch (type.toLowerCase()) {
    case DataType.UINT16:
    case DataType.ENUM16:
      return registers[index] & 0xFFFF;
      
    case DataType.INT16:
    case DataType.SUNSSF:
      const val16 = registers[index] & 0xFFFF;
      // Convert to signed
      return val16 > 32767 ? val16 - 65536 : val16;
      
    case DataType.UINT32:
    case DataType.BITFIELD32:
      if (index + 1 >= registers.length) return null;
      const high = registers[index] & 0xFFFF;
      const low = registers[index + 1] & 0xFFFF;
      return (high << 16) | low;
      
    case DataType.INT32:
      if (index + 1 >= registers.length) return null;
      const high32 = registers[index] & 0xFFFF;
      const low32 = registers[index + 1] & 0xFFFF;
      const val32 = (high32 << 16) | low32;
      // Convert to signed
      return val32 > 2147483647 ? val32 - 4294967296 : val32;
      
    case DataType.STRING:
      const stringRegs = [];
      for (let i = 0; i < size; i++) {
        if (index + i < registers.length) {
          stringRegs.push(registers[index + i]);
        }
      }
      return registersToString(stringRegs);
      
    default:
      return registers[index] & 0xFFFF;
  }
}

/**
 * Write value to register(s) based on data type
 */
export function writeValue(registers, address, type, value, size = 1) {
  const index = address - 40001; // Convert to 0-based index
  
  if (index < 0 || index >= registers.length) {
    return false;
  }
  
  switch (type.toLowerCase()) {
    case DataType.UINT16:
    case DataType.ENUM16:
      registers[index] = value & 0xFFFF;
      break;
      
    case DataType.INT16:
    case DataType.SUNSSF:
      // Convert signed to unsigned
      const val16 = value < 0 ? value + 65536 : value;
      registers[index] = val16 & 0xFFFF;
      break;
      
    case DataType.UINT32:
    case DataType.BITFIELD32:
      if (index + 1 >= registers.length) return false;
      registers[index] = (value >> 16) & 0xFFFF;
      registers[index + 1] = value & 0xFFFF;
      break;
      
    case DataType.INT32:
      if (index + 1 >= registers.length) return false;
      // Convert signed to unsigned
      const val32 = value < 0 ? value + 4294967296 : value;
      registers[index] = (val32 >> 16) & 0xFFFF;
      registers[index + 1] = val32 & 0xFFFF;
      break;
      
    case DataType.STRING:
      const stringRegs = stringToRegisters(value, size);
      for (let i = 0; i < size && i < stringRegs.length; i++) {
        if (index + i < registers.length) {
          registers[index + i] = stringRegs[i];
        }
      }
      break;
      
    default:
      registers[index] = value & 0xFFFF;
  }
  
  return true;
}

/**
 * Convert string to register array
 */
function stringToRegisters(str, maxRegisters) {
  const registers = [];
  const maxChars = maxRegisters * 2;
  const paddedStr = str.padEnd(maxChars, '\0');
  
  for (let i = 0; i < maxChars; i += 2) {
    const char1 = paddedStr.charCodeAt(i) || 0;
    const char2 = paddedStr.charCodeAt(i + 1) || 0;
    registers.push((char1 << 8) | char2);
  }
  
  return registers;
}

/**
 * Convert register array to string
 */
function registersToString(registers) {
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
 * Validate value against range
 */
export function validateValue(value, range, type) {
  if (!range) return true;
  
  // Parse range string
  const rangeMatch = range.match(/(-?\d+)\s*-\s*(-?\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return value >= min && value <= max;
  }
  
  // Enum values
  if (range.includes(':')) {
    const enumValues = range.split('\n').map(line => {
      const match = line.match(/^(\d+):/);
      return match ? parseInt(match[1]) : null;
    }).filter(v => v !== null);
    
    if (enumValues.length > 0) {
      return enumValues.includes(value);
    }
  }
  
  return true;
}

/**
 * Get size in registers for a data type
 */
export function getTypeSize(type) {
  switch (type.toLowerCase()) {
    case DataType.UINT32:
    case DataType.INT32:
    case DataType.BITFIELD32:
      return 2;
    default:
      return 1;
  }
}

export default {
  readValue,
  writeValue,
  validateValue,
  getTypeSize
};


