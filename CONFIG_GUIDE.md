# Configuration Guide

## Environment Variables

The Fronius Gen24 Modbus Simulator can be configured using environment variables. Create a `.env` file in the `backend` directory with the following options:

### HTTP Server Configuration

```env
# HTTP API Server port (default: 3001)
PORT=3001

# Host to bind to (default: 0.0.0.0 for all interfaces)
HOST=0.0.0.0
```

### Modbus TCP Configuration

```env
# Modbus TCP Server port (default: 502)
# Note: Port 502 requires administrator privileges on Windows
# You can use port 5020 or any other port if needed
MODBUS_PORT=502

# Modbus Device ID / Unit ID (default: 1)
MODBUS_DEVICE_ID=1
```

## Example .env File

Create `backend/.env`:

```env
# HTTP API Server
PORT=3001
HOST=0.0.0.0

# Modbus TCP Server
MODBUS_PORT=502
MODBUS_DEVICE_ID=1

# Development mode
NODE_ENV=development
```

## Using a Different Modbus Port

If you don't have administrator privileges or port 502 is already in use, you can use a different port:

```env
MODBUS_PORT=5020
```

Then configure your Modbus client (e.g., SMA EDMM-20) to connect to port 5020 instead of 502.

## Network Access

The simulator is configured to listen on all network interfaces (`0.0.0.0`), making it accessible from:

- **Localhost**: `http://localhost:3001` (API) and `localhost:502` (Modbus)
- **Local Network**: `http://192.168.178.24:3001` (API) and `192.168.178.24:502` (Modbus)

Replace `192.168.178.24` with your actual local IP address, which is displayed when the server starts.

## Firewall Configuration

If you're accessing the simulator from another device on your network, ensure Windows Firewall allows incoming connections:

### Allow HTTP API (Port 3001)

```powershell
New-NetFirewallRule -DisplayName "Fronius Simulator API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Allow Modbus TCP (Port 502)

```powershell
New-NetFirewallRule -DisplayName "Modbus TCP" -Direction Inbound -LocalPort 502 -Protocol TCP -Action Allow
```

### Allow Custom Modbus Port (e.g., 5020)

```powershell
New-NetFirewallRule -DisplayName "Modbus TCP Custom" -Direction Inbound -LocalPort 5020 -Protocol TCP -Action Allow
```

## Running on Different Ports

### For Testing Without Admin Rights

```env
MODBUS_PORT=5020
PORT=3001
```

### For Multiple Simulators

Run multiple instances on different ports:

**Instance 1:**
```env
PORT=3001
MODBUS_PORT=502
MODBUS_DEVICE_ID=1
```

**Instance 2:**
```env
PORT=3002
MODBUS_PORT=503
MODBUS_DEVICE_ID=2
```

## Verification

After starting the simulator, you should see:

```
======================================================================
Fronius Gen24 Modbus Simulator
======================================================================

HTTP API Server:
  ➜ Local:   http://localhost:3001
  ➜ Network: http://192.168.178.24:3001

Web UI:
  ➜ Local:   http://localhost:3000
  ➜ Network: http://192.168.178.24:3000

Modbus TCP Server:
  ➜ Host:      0.0.0.0 (all interfaces)
  ➜ Port:      502
  ➜ Device ID: 1
  ➜ Network:   192.168.178.24:502

======================================================================

Ready to start simulation. Use the API or Web UI to control.

IMPORTANT: Click START button in Web UI to enable Modbus server!
```

## Testing Network Access

### From Same Machine

```powershell
# Test HTTP API
Invoke-WebRequest -Uri http://localhost:3001/health

# Test Modbus TCP
Test-NetConnection -ComputerName localhost -Port 502
```

### From Another Device

```powershell
# Test HTTP API
Invoke-WebRequest -Uri http://192.168.178.24:3001/health

# Test Modbus TCP
Test-NetConnection -ComputerName 192.168.178.24 -Port 502
```

## SMA EDMM-20 Configuration

When registering the simulator in the EDMM-20, use your network IP address:

| Field | Value |
|-------|-------|
| **IP-Adresse** | 192.168.178.24 (your local IP) |
| **Port** | 502 (or your custom port) |
| **Unit ID** | 1 (or your custom device ID) |
| **Modbus-Profil** | SunSpec |

## Common Issues

### Port 502 Access Denied

**Error**: `EACCES: permission denied`

**Solution**: Run PowerShell as Administrator or use a port above 1024:
```env
MODBUS_PORT=5020
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**: Change to a different port:
```env
MODBUS_PORT=5020
PORT=3002
```

### Cannot Access from Network

**Solution**: Check firewall rules and ensure `HOST=0.0.0.0` in .env file.

---

**Tip**: The simulator displays your local network IP when it starts. Use this IP address to access the simulator from other devices on your network!


