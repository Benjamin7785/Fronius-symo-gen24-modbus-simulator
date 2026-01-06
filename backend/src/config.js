/**
 * Configuration module
 * Loads environment variables and provides configuration defaults
 */

import dotenv from 'dotenv';
import { networkInterfaces } from 'os';

// Load environment variables from .env file
dotenv.config();

/**
 * Get local network IP address
 */
function getLocalIP() {
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        results.push(net.address);
      }
    }
  }

  return results[0] || 'localhost';
}

const config = {
  // HTTP API Server
  http: {
    port: parseInt(process.env.HTTP_PORT) || 3001,
    host: process.env.HTTP_HOST || '0.0.0.0',
  },

  // Modbus TCP Server
  modbus: {
    port: parseInt(process.env.MODBUS_PORT) || 502,
    host: process.env.MODBUS_HOST || '0.0.0.0',
    deviceId: parseInt(process.env.MODBUS_DEVICE_ID) || 1,
  },

  // WebSocket
  websocket: {
    port: parseInt(process.env.WS_PORT) || 3001,
  },

  // Network
  localIP: getLocalIP(),

  // Environment
  env: process.env.NODE_ENV || 'development',
};

export default config;


