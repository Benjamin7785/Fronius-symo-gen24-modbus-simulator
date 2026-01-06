/**
 * XML Parser for Fronius Gen24 Register Maps
 * Parses Excel XML format to extract SunSpec register definitions
 */

import fs from 'fs';
import path from 'path';
import { parseString } from 'xml2js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class XMLParser {
  constructor() {
    this.registers = [];
  }

  /**
   * Parse XML file and extract register definitions
   */
  async parseFile(filePath) {
    try {
      const xmlContent = fs.readFileSync(filePath, 'utf-8');
      const result = await this.parseXML(xmlContent);
      const registers = this.extractRegisters(result);
      console.log(`Parsed ${registers.length} registers from ${path.basename(filePath)}`);
      return registers;
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse XML string to JavaScript object
   */
  parseXML(xmlString) {
    return new Promise((resolve, reject) => {
      parseString(xmlString, { explicitArray: false }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Extract register definitions from parsed XML
   */
  extractRegisters(xmlObj) {
    const registers = [];
    
    try {
      const workbook = xmlObj.Workbook;
      const worksheet = workbook.Worksheet[0]; // First worksheet
      const table = worksheet.Table;
      const rows = Array.isArray(table.Row) ? table.Row : [table.Row];

      let currentModel = null;
      let inDataSection = false;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.Cell) continue;

        const cells = Array.isArray(row.Cell) ? row.Cell : [row.Cell];
        const cellValues = this.extractCellValues(cells);

        // Skip empty rows
        if (cellValues.every(v => !v)) continue;

        // Check if this is a header row
        if (this.isHeaderRow(cellValues)) {
          inDataSection = true;
          continue;
        }

        // Parse data rows
        if (inDataSection && cellValues[0] && !isNaN(cellValues[0])) {
          const register = this.parseRegisterRow(cellValues);
          if (register) {
            registers.push(register);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting registers:', error);
    }

    return registers;
  }

  /**
   * Extract cell values from Excel XML cells
   */
  extractCellValues(cells) {
    const values = [];
    let currentIndex = 0;

    for (const cell of cells) {
      // Handle cell index (Excel XML includes ss:Index for non-sequential cells)
      if (cell.$  && cell.$['ss:Index']) {
        const targetIndex = parseInt(cell.$['ss:Index']) - 1;
        while (currentIndex < targetIndex) {
          values.push('');
          currentIndex++;
        }
      }

      // Extract cell data
      let value = '';
      if (cell.Data) {
        if (typeof cell.Data === 'string') {
          value = cell.Data;
        } else if (cell.Data._) {
          value = cell.Data._;
        }
      }

      values.push(value);
      currentIndex++;
    }

    return values;
  }

  /**
   * Check if row is a header row
   */
  isHeaderRow(cellValues) {
    return cellValues[0] === 'Start' && 
           cellValues[1] === 'End' && 
           cellValues[5] === 'Name';
  }

  /**
   * Parse a register data row
   */
  parseRegisterRow(cellValues) {
    try {
      const [start, end, size, rw, funcCodes, name, description, type, units, scaleFactor, range] = cellValues;

      // Parse start address
      const startAddr = parseInt(start);
      if (isNaN(startAddr) || startAddr < 40001) return null;

      // Parse size
      const registerSize = parseInt(size) || 1;

      // Determine if writable
      const isWritable = rw === 'RW' || rw === 'R/W';

      // Parse function codes
      const functions = funcCodes ? funcCodes.replace(/\n/g, ',').split(',').map(f => f.trim()) : ['0x03'];

      return {
        address: startAddr,
        endAddress: parseInt(end) || startAddr,
        size: registerSize,
        name: name || '',
        description: description || '',
        type: type || 'uint16',
        units: units || '',
        scaleFactor: scaleFactor || '',
        range: range || '',
        writable: isWritable,
        functionCodes: functions,
        value: this.getDefaultValue(type, range)
      };
    } catch (error) {
      console.error('Error parsing register row:', error);
      return null;
    }
  }

  /**
   * Get default value for a register based on type and range
   */
  getDefaultValue(type, range) {
    // SunSpec ID
    if (range && range.includes('SunS')) {
      return 0x53756e53; // 'SunS' in hex
    }

    // Model IDs
    if (range === '1') return 1;
    if (range === '101, 103') return 103;
    if (range === '120') return 120;
    if (range === '121') return 121;
    if (range === '122') return 122;
    if (range === '123') return 123;
    if (range === '124') return 124;
    if (range === '160') return 160;

    // Default values by type
    switch (type.toLowerCase()) {
      case 'string':
        return '';
      case 'uint16':
      case 'uint32':
        return 0;
      case 'int16':
      case 'int32':
      case 'sunssf':
        return 0;
      case 'enum16':
        return 0;
      case 'bitfield32':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Parse all XML files in data directory
   */
  async parseAllFiles() {
    const dataDir = path.join(__dirname, '../../../data');
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xml'));
    
    console.log(`Found ${files.length} XML files to parse`);
    
    let allRegisters = [];
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const registers = await this.parseFile(filePath);
      allRegisters = allRegisters.concat(registers);
    }

    // Remove duplicates (same address)
    const uniqueRegisters = this.removeDuplicates(allRegisters);
    
    console.log(`Total unique registers: ${uniqueRegisters.length}`);
    
    return uniqueRegisters;
  }

  /**
   * Remove duplicate registers (keep first occurrence)
   */
  removeDuplicates(registers) {
    const seen = new Set();
    return registers.filter(reg => {
      if (seen.has(reg.address)) {
        return false;
      }
      seen.add(reg.address);
      return true;
    });
  }
}

export default XMLParser;


