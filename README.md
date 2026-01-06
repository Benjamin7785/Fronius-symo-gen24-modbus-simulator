# Fronius Gen24 Plus Modbus TCP Simulator

Complete Modbus TCP simulator for Fronius Symo Gen24 Plus inverter with full SunSpec register support.

## Features

- **Full SunSpec Implementation**: All models including Common, Inverter, Nameplate, Controls, Storage, MPPT, DER models
- **Modbus TCP Server**: Supports function codes 0x03, 0x06, 0x10
- **Web UI**: React-based interface for monitoring and control
- **PV Power Simulation**: User-controllable power output (0-10kW) with realistic AC/DC values
- **Command Feedback**: Proper status updates and reversion timers for all write commands
- **Real-time Updates**: WebSocket support for live register value changes

## Quick Start (Windows)

### 1. Install Dependencies
```batch
install.bat
```

### 2. Start Simulator
```batch
Start.bat
```

### 3. Stop Simulator
```batch
Stop.bat
```

That's it! Open your browser to http://localhost:3000 and click START.

---

## Installation

### Windows (Recommended)
```batch
install.bat
```

### Manual Installation
```bash
npm run install:all
```

## Usage

### Windows Batch Files (Easiest)

**Start:**
```batch
Start.bat
```
- Starts both backend and frontend
- Shows all connection URLs
- Displays network IP

**Stop:**
```batch
Stop.bat
```
- Cleanly stops all Node.js processes

### npm Commands

```bash
# Run both backend and frontend
npm run dev

# Or run separately:
npm run dev:backend  # Backend on port 3001
npm run dev:frontend # Frontend on port 3000
```

### Production Mode

```bash
# Build frontend
npm run build

# Start backend server
npm start
```

## Configuration

Edit `backend/.env` to configure:

- `PORT`: REST API port (default: 3001)
- `MODBUS_PORT`: Modbus TCP port (default: 502)
- `MODBUS_DEVICE_ID`: Modbus device ID (default: 1)

**Note**: Port 502 requires administrator/root privileges on Linux/Mac. You can use port 5020 for testing without privileges.

## Architecture

- **Backend**: Node.js + Express + modbus-serial
- **Frontend**: React + Material-UI + Vite
- **Data**: XML register maps parsed at startup
- **Communication**: REST API + WebSocket for real-time updates

## Register Maps

Place the Fronius Gen24 register map XML files in the `data/` directory:
- `Gen24_Primo_Symo_Inverter_Register_Map_Int&SF_storage_ROW.xml`
- `Gen24_Primo_Symo_Inverter_Register_Map_Int&SF_ROW.xml`

## Testing with Modbus Clients

The simulator can be tested with various Modbus clients:

- **modpoll**: `modpoll -m tcp -a 1 -r 40001 -c 10 192.168.178.24`
- **qModMaster**: GUI-based Modbus testing tool
- **Modbus Poll**: Commercial tool for Windows

## Key Register Addresses

- **40001-40002**: SunSpec ID "SunS"
- **40070+**: Inverter Model (power, voltage, current, frequency)
- **40108**: Operating State (main status feedback)
- **40228+**: Immediate Controls (writable commands)
- **40346+**: Storage Control (battery management)

See the plan document for complete register reference.

## License

MIT


