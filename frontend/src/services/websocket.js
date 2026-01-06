/**
 * WebSocket Service - Real-time communication with backend
 */

import { io } from 'socket.io-client';

let socket = null;
const listeners = {
  status: [],
  registerChanged: [],
  power: []
};

export const connectWebSocket = () => {
  if (socket) return socket;

  socket = io('/', {
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });

  socket.on('status', (data) => {
    console.log('📊 Status update received:', data);
    listeners.status.forEach(callback => callback(data));
  });

  socket.on('registerChanged', (data) => {
    console.log('📝 Register changed:', data);
    listeners.registerChanged.forEach(callback => callback(data));
  });

  socket.on('power', (data) => {
    console.log('⚡ Power update received:', data);
    listeners.power.forEach(callback => callback(data));
  });

  return socket;
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onStatus = (callback) => {
  listeners.status.push(callback);
  return () => {
    listeners.status = listeners.status.filter(cb => cb !== callback);
  };
};

export const onRegisterChanged = (callback) => {
  listeners.registerChanged.push(callback);
  return () => {
    listeners.registerChanged = listeners.registerChanged.filter(cb => cb !== callback);
  };
};

export const onPowerChanged = (callback) => {
  listeners.power.push(callback);
  return () => {
    listeners.power = listeners.power.filter(cb => cb !== callback);
  };
};

export const requestStatus = () => {
  if (socket) {
    socket.emit('getStatus');
  }
};

export const requestPower = () => {
  if (socket) {
    socket.emit('getPower');
  }
};


