/**
 * Main Server Entry Point
 * Initializes Express server, Simulator, and WebSocket
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { networkInterfaces } from 'os';
import dotenv from 'dotenv';
import Simulator from './simulation/simulator.js';
import createRoutes from './api/routes.js';
import setupWebSocket from './api/websocket.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const MODBUS_PORT = process.env.MODBUS_PORT || 502;
const MODBUS_DEVICE_ID = process.env.MODBUS_DEVICE_ID || 1;

/**
 * Get local network IP address
 * Prefers 192.168.x.x addresses (typical home network)
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

  // Prefer 192.168.x.x addresses (typical home/office networks)
  const homeNetworkIP = results.find(ip => ip.startsWith('192.168.'));
  if (homeNetworkIP) return homeNetworkIP;

  return results[0] || 'localhost';
}

const localIP = getLocalIP();

// Create Express app
const app = express();
const httpServer = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Create simulator instance
const simulator = new Simulator({
  modbusPort: parseInt(MODBUS_PORT),
  modbusDeviceId: parseInt(MODBUS_DEVICE_ID),
  networkIP: localIP
});

// Initialize simulator
(async () => {
  try {
    await simulator.initialize();
    console.log('Simulator initialized and ready');
  } catch (error) {
    console.error('Failed to initialize simulator:', error);
    process.exit(1);
  }
})();

// Setup routes
app.use('/api', createRoutes(simulator));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', simulator: simulator.getStatus() });
});

// Setup WebSocket
setupWebSocket(httpServer, simulator);

// Start HTTP server on all interfaces
httpServer.listen(PORT, HOST, () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Fronius Gen24 Modbus Simulator`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\nHTTP API Server:`);
  console.log(`  ➜ Local:   http://localhost:${PORT}`);
  console.log(`  ➜ Network: http://${localIP}:${PORT}`);
  console.log(`\nWeb UI:`);
  console.log(`  ➜ Local:   http://localhost:3000`);
  console.log(`  ➜ Network: http://${localIP}:3000`);
  console.log(`\nModbus TCP Server:`);
  console.log(`  ➜ Host:      ${HOST} (all interfaces)`);
  console.log(`  ➜ Port:      ${MODBUS_PORT}`);
  console.log(`  ➜ Device ID: ${MODBUS_DEVICE_ID}`);
  console.log(`  ➜ Network:   ${localIP}:${MODBUS_PORT}`);
  console.log(`\n${'='.repeat(70)}\n`);
  console.log(`Ready to start simulation. Use the API or Web UI to control.`);
  console.log(`\nIMPORTANT: Click START button in Web UI to enable Modbus server!\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  
  try {
    await simulator.stop();
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

export default app;

