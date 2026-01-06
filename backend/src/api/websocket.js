/**
 * WebSocket Handler
 * Provides real-time updates to connected clients
 */

import { Server } from 'socket.io';

function setupWebSocket(httpServer, simulator) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    // Send initial status
    socket.emit('status', simulator.getStatus());

    // Subscribe to simulator events
    const handleRegisterChange = (data) => {
      socket.emit('registerChanged', data);
    };

    const handleStatusChange = () => {
      socket.emit('status', simulator.getStatus());
    };

    const handlePowerChange = () => {
      socket.emit('power', simulator.getPowerStatus());
    };

    // Attach event listeners
    simulator.on('registerChanged', handleRegisterChange);
    simulator.on('statusChanged', handleStatusChange);
    simulator.on('powerChanged', handlePowerChange);

    // Handle client requests
    socket.on('getStatus', () => {
      socket.emit('status', simulator.getStatus());
    });

    socket.on('getPower', () => {
      socket.emit('power', simulator.getPowerStatus());
    });

    socket.on('getRegisters', () => {
      socket.emit('registers', simulator.getAllRegisters());
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
      
      // Remove event listeners
      simulator.off('registerChanged', handleRegisterChange);
      simulator.off('statusChanged', handleStatusChange);
      simulator.off('powerChanged', handlePowerChange);
    });
  });

  console.log('WebSocket server initialized');
  return io;
}

export default setupWebSocket;


