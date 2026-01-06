# Quick Start Guide

## Installation

Run the installation batch file (Windows):
```bash
install.bat
```

Or install manually:
```bash
npm run install:all
```

## Starting the Simulator

### Option 1: Run Both Frontend and Backend (Recommended)
```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Modbus TCP: Port 502

### Option 2: Backend Only
```bash
npm run dev:backend
```

## Using the Web UI

1. **Open your browser:** http://localhost:3000

2. **Start the simulator:**
   - Click the **"Start"** button
   - You should see status change to "Running"

3. **Control PV Power:**
   - Use the slider to set power output (0-10,000W)
   - Or type a value in the text field
   - Watch the Current power and Energy counters update

4. **Browse Registers:**
   - Click different tabs to see register groups
   - Search for specific registers
   - Click the edit icon on writable registers to modify values

## Testing with Modbus Client

### Simple Test with modpoll
```bash
# Read SunSpec ID (should show 'SunS')
modpoll -m tcp -a 1 -r 40001 -c 2 -t 4 localhost

# Read AC Power
modpoll -m tcp -a 1 -r 40083 -c 1 -t 3 localhost

# Write Power Limit to 50%
modpoll -m tcp -a 1 -r 40233 -c 1 -t 4 localhost 5000
```

## Features Implemented

✅ **Full SunSpec Protocol**
- Common Model (1)
- Inverter Model 103 (Int+SF)
- Nameplate Model (120)
- Basic Settings (121)
- Extended Measurements (122)
- Immediate Controls (123) - Writable!
- Storage Control (124) - Writable!
- MPPT Extension (160)

✅ **Realistic PV Simulation**
- User-controllable power output (0-10kW slider)
- Physically consistent AC/DC values
- Smooth transitions with random variations
- Energy counter accumulation
- Temperature simulation

✅ **Command-Response Feedback**
- Operating State updates based on commands
- Power limit throttling
- Reversion timers (auto-reset after timeout)
- Connect/disconnect handling
- Battery charge status

✅ **Modbus TCP Server**
- Function codes: 0x03 (Read), 0x06 (Write Single), 0x10 (Write Multiple)
- Proper exception codes
- Multi-client support
- Real-time register updates

✅ **Web UI**
- Real-time register monitoring
- Power output control
- Register browser with search
- Edit writable registers
- WebSocket updates

## Troubleshooting

### Port 502 Permission Error
If you see "Permission denied" for port 502:

1. **Edit `backend/.env`:**
```
MODBUS_PORT=5020
```

2. **Restart the simulator**

### Cannot Connect
Make sure the simulator is started (click "Start" button in UI or use API)

## API Endpoints

```
POST   /api/simulator/start      - Start Modbus server
POST   /api/simulator/stop       - Stop Modbus server
GET    /api/simulator/status     - Get status
PUT    /api/simulator/power      - Set power output
GET    /api/registers             - Get all registers
PUT    /api/registers/:address   - Update register
```

## Next Steps

- See [TESTING.md](TESTING.md) for comprehensive testing guide
- See [README.md](README.md) for full documentation
- Check register addresses in the plan document

## Support

For issues or questions, refer to:
- The comprehensive plan document
- TESTING.md for troubleshooting
- Fronius Gen24 Modbus specification PDF


