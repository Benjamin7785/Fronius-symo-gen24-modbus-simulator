/**
 * API Service - HTTP client for communicating with backend
 */

import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simulator control
export const startSimulator = () => api.post('/simulator/start');
export const stopSimulator = () => api.post('/simulator/stop');
export const getSimulatorStatus = () => api.get('/simulator/status');
export const resetSimulator = () => api.post('/simulator/reset');
export const getConfig = () => api.get('/simulator/config');
export const updateConfig = (config) => api.put('/simulator/config', config);

// Power control
export const setPower = (power) => api.put('/simulator/power', { power });
export const getPower = () => api.get('/simulator/power');

// Register access
export const getAllRegisters = () => api.get('/registers');
export const getRegister = (address, count = 1) => 
  api.get(`/registers/${address}`, { params: { count } });
export const setRegister = (address, value) => 
  api.put(`/registers/${address}`, { value });

// Model access
export const getModels = () => api.get('/models');
export const getModelRegisters = (modelId) => api.get(`/models/${modelId}`);

// Override management (Advanced Testing Mode - v1.3)
export const setRegisterOverride = (address, values) => 
  api.put(`/registers/${address}/override`, { values });
export const clearRegisterOverride = (address) => 
  api.delete(`/registers/${address}/override`);
export const clearAllOverrides = () => 
  api.delete(`/registers/overrides`);
export const getOverriddenRegisters = () => 
  api.get(`/registers/overrides`);

export default api;


