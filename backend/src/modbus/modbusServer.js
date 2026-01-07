/**
 * Modbus TCP Server
 * Implements Modbus TCP protocol with function codes 0x03, 0x06, 0x10
 */

import EventEmitter from 'events';
import net from 'net';
import { ModbusFunctionCode, ModbusExceptionCode } from '../../../shared/types.js';

class ModbusTCPServer extends EventEmitter {
  constructor(registerStore, port = 502, deviceId = 1) {
    super();
    this.registerStore = registerStore;
    this.port = port;
    this.deviceId = deviceId;
    this.server = null;
    this.clients = new Set();
    this.isRunning = false;
  }

  /**
   * Start the Modbus TCP server
   */
  start() {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        return reject(new Error('Server is already running'));
      }

      this.server = net.createServer((socket) => {
        this.handleClientConnection(socket);
      });

      this.server.on('error', (err) => {
        console.error('Modbus TCP Server error:', err);
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use`));
        } else if (err.code === 'EACCES') {
          reject(new Error(`Permission denied to bind to port ${this.port}. Try using port 5020 instead.`));
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        console.log(`Modbus TCP Server listening on port ${this.port} (all interfaces)`);
        this.emit('started', { port: this.port });
        resolve();
      });
    });
  }

  /**
   * Stop the Modbus TCP server
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        return resolve();
      }

      // Close all client connections
      for (const client of this.clients) {
        client.end();
      }
      this.clients.clear();

      if (this.server) {
        this.server.close(() => {
          this.isRunning = false;
          console.log('Modbus TCP Server stopped');
          this.emit('stopped');
          resolve();
        });
      } else {
        this.isRunning = false;
        resolve();
      }
    });
  }

  /**
   * Handle new client connection
   */
  handleClientConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`\n[Modbus] ========================================`);
    console.log(`[Modbus] Client connected: ${clientId}`);
    console.log(`[Modbus] ========================================`);
    
    this.clients.add(socket);
    this.emit('clientConnected', { clientId, count: this.clients.size });

    let buffer = Buffer.alloc(0);

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);

      // Modbus TCP header is 7 bytes + function code (1 byte) minimum
      while (buffer.length >= 8) {
        // Parse MBAP header
        const transactionId = buffer.readUInt16BE(0);
        const protocolId = buffer.readUInt16BE(2);
        const length = buffer.readUInt16BE(4);
        const unitId = buffer.readUInt8(6);

        // Check if we have the complete message
        const totalLength = 6 + length;
        if (buffer.length < totalLength) {
          break; // Wait for more data
        }

        // Extract the PDU (Protocol Data Unit)
        const pdu = buffer.slice(7, totalLength);
        buffer = buffer.slice(totalLength);

        // Process the request
        try {
          const response = this.processRequest(unitId, pdu);
          
          // Build response with MBAP header
          const responseLength = response.length + 1; // +1 for unit ID
          const responseBuffer = Buffer.alloc(6 + responseLength);
          
          responseBuffer.writeUInt16BE(transactionId, 0);
          responseBuffer.writeUInt16BE(protocolId, 2);
          responseBuffer.writeUInt16BE(responseLength, 4);
          responseBuffer.writeUInt8(unitId, 6);
          response.copy(responseBuffer, 7);

          socket.write(responseBuffer);

          this.emit('request', {
            clientId,
            functionCode: pdu[0],
            success: true
          });
        } catch (error) {
          console.error('Error processing request:', error);
          
          // Send exception response
          const exceptionResponse = this.buildExceptionResponse(pdu[0], error.exceptionCode || ModbusExceptionCode.SLAVE_DEVICE_FAILURE);
          const responseLength = exceptionResponse.length + 1;
          const responseBuffer = Buffer.alloc(6 + responseLength);
          
          responseBuffer.writeUInt16BE(transactionId, 0);
          responseBuffer.writeUInt16BE(protocolId, 2);
          responseBuffer.writeUInt16BE(responseLength, 4);
          responseBuffer.writeUInt8(unitId, 6);
          exceptionResponse.copy(responseBuffer, 7);

          socket.write(responseBuffer);

          this.emit('request', {
            clientId,
            functionCode: pdu[0],
            success: false,
            error: error.message
          });
        }
      }
    });

    socket.on('end', () => {
      console.log(`Client disconnected: ${clientId}`);
      this.clients.delete(socket);
      this.emit('clientDisconnected', { clientId, count: this.clients.size });
    });

    socket.on('error', (err) => {
      console.error(`Client error ${clientId}:`, err.message);
      this.clients.delete(socket);
    });
  }

  /**
   * Process Modbus request
   */
  processRequest(unitId, pdu) {
    // Check unit ID
    if (unitId !== 0 && unitId !== this.deviceId) {
      const error = new Error('Invalid unit ID');
      error.exceptionCode = ModbusExceptionCode.SLAVE_DEVICE_FAILURE;
      throw error;
    }

    const functionCode = pdu[0];

    switch (functionCode) {
      case ModbusFunctionCode.READ_HOLDING_REGISTERS:
        return this.handleReadHoldingRegisters(pdu);
      
      case ModbusFunctionCode.WRITE_SINGLE_REGISTER:
        return this.handleWriteSingleRegister(pdu);
      
      case ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS:
        return this.handleWriteMultipleRegisters(pdu);
      
      default:
        const error = new Error(`Unsupported function code: 0x${functionCode.toString(16)}`);
        error.exceptionCode = ModbusExceptionCode.ILLEGAL_FUNCTION;
        throw error;
    }
  }

  /**
   * Handle Read Holding Registers (0x03)
   */
  handleReadHoldingRegisters(pdu) {
    if (pdu.length < 5) {
      const error = new Error('Invalid request length');
      error.exceptionCode = ModbusExceptionCode.ILLEGAL_DATA_VALUE;
      throw error;
    }

    const startAddress = pdu.readUInt16BE(1);
    const quantity = pdu.readUInt16BE(3);

    // Log request details for debugging (limit logging for repeated requests)
    if (startAddress !== 131 || Math.random() < 0.01) {  // Only log 1% of register 131 requests
      console.log(`[Modbus] Read request: address=${startAddress} (reg ${startAddress + 40001}), quantity=${quantity}`);
    }

    // Validate quantity (Modbus spec allows 1-125 for read holding registers)
    if (quantity < 1 || quantity > 125) {
      console.error(`[Modbus] Invalid quantity: ${quantity} (must be 1-125)`);
      const error = new Error(`Invalid quantity: ${quantity}`);
      error.exceptionCode = ModbusExceptionCode.ILLEGAL_DATA_VALUE;
      throw error;
    }

    // Convert Modbus address (0-based) to register address (40001-based)
    const registerAddress = startAddress + 40001;

    // Read registers
    const values = this.registerStore.read(registerAddress, quantity);

    // Build response
    const byteCount = quantity * 2;
    const response = Buffer.alloc(2 + byteCount);
    response.writeUInt8(ModbusFunctionCode.READ_HOLDING_REGISTERS, 0);
    response.writeUInt8(byteCount, 1);

    for (let i = 0; i < quantity; i++) {
      response.writeUInt16BE(values[i], 2 + i * 2);
    }

    return response;
  }

  /**
   * Handle Write Single Register (0x06)
   */
  handleWriteSingleRegister(pdu) {
    if (pdu.length < 5) {
      const error = new Error('Invalid request length');
      error.exceptionCode = ModbusExceptionCode.ILLEGAL_DATA_VALUE;
      throw error;
    }

    const address = pdu.readUInt16BE(1);
    const value = pdu.readUInt16BE(3);

    // Convert Modbus address to register address
    const registerAddress = address + 40001;

    try {
      // Write to register store using manual override (v1.3: freezes auto-calculation)
      // This allows EDMM-20 to write to any register for advanced testing
      this.registerStore.setManualOverride(registerAddress, [value]);
      console.log(`[Modbus] Write via Modbus: Register ${registerAddress} set to ${value} (frozen from auto-calculation)`);
    } catch (error) {
      const err = new Error(error.message);
      err.exceptionCode = error.message.includes('read-only') 
        ? ModbusExceptionCode.ILLEGAL_DATA_ADDRESS
        : ModbusExceptionCode.ILLEGAL_DATA_VALUE;
      throw err;
    }

    // Build response (echo request)
    const response = Buffer.alloc(5);
    response.writeUInt8(ModbusFunctionCode.WRITE_SINGLE_REGISTER, 0);
    response.writeUInt16BE(address, 1);
    response.writeUInt16BE(value, 3);

    return response;
  }

  /**
   * Handle Write Multiple Registers (0x10)
   */
  handleWriteMultipleRegisters(pdu) {
    if (pdu.length < 6) {
      const error = new Error('Invalid request length');
      error.exceptionCode = ModbusExceptionCode.ILLEGAL_DATA_VALUE;
      throw error;
    }

    const startAddress = pdu.readUInt16BE(1);
    const quantity = pdu.readUInt16BE(3);
    const byteCount = pdu.readUInt8(5);

    // Validate
    if (quantity < 1 || quantity > 123 || byteCount !== quantity * 2) {
      const error = new Error('Invalid quantity or byte count');
      error.exceptionCode = ModbusExceptionCode.ILLEGAL_DATA_VALUE;
      throw error;
    }

    if (pdu.length < 6 + byteCount) {
      const error = new Error('Incomplete data');
      error.exceptionCode = ModbusExceptionCode.ILLEGAL_DATA_VALUE;
      throw error;
    }

    // Extract values
    const values = [];
    for (let i = 0; i < quantity; i++) {
      values.push(pdu.readUInt16BE(6 + i * 2));
    }

    // Convert Modbus address to register address
    const registerAddress = startAddress + 40001;

    try {
      // Write to register store using manual override (v1.3: freezes auto-calculation)
      // This allows EDMM-20 to write to any register for advanced testing
      this.registerStore.setManualOverride(registerAddress, values);
      console.log(`[Modbus] Write via Modbus: Registers ${registerAddress}-${registerAddress + quantity - 1} overridden (frozen from auto-calculation)`);
    } catch (error) {
      const err = new Error(error.message);
      err.exceptionCode = error.message.includes('read-only')
        ? ModbusExceptionCode.ILLEGAL_DATA_ADDRESS
        : ModbusExceptionCode.ILLEGAL_DATA_VALUE;
      throw err;
    }

    // Build response
    const response = Buffer.alloc(5);
    response.writeUInt8(ModbusFunctionCode.WRITE_MULTIPLE_REGISTERS, 0);
    response.writeUInt16BE(startAddress, 1);
    response.writeUInt16BE(quantity, 3);

    return response;
  }

  /**
   * Build exception response
   */
  buildExceptionResponse(functionCode, exceptionCode) {
    const response = Buffer.alloc(2);
    response.writeUInt8(functionCode | 0x80, 0); // Set high bit for exception
    response.writeUInt8(exceptionCode, 1);
    return response;
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      deviceId: this.deviceId,
      clientCount: this.clients.size
    };
  }
}

export default ModbusTCPServer;

