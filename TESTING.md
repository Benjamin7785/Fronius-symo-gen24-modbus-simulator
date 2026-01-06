# Testing Guide for Fronius Gen24 Modbus Simulator

## Installation

1. **Install dependencies:**
```bash
npm run install:all
```

2. **Start the simulator:**
```bash
# Development mode (recommended for testing)
npm run dev

# Or start backend only
npm run dev:backend
```

The simulator will start on:
- **Backend API**: http://localhost:3001
- **Frontend UI**: http://localhost:3000
- **Modbus TCP**: Port 502 (or 5020 if 502 requires admin rights)

## Testing with Web UI

1. Open http://localhost:3000 in your browser
2. Click **Start** to start the Modbus TCP server
3. Use the **Power Output Slider** to set PV generation (0-10000W)
4. Browse registers in the **Register Browser** tab
5. Edit writable registers by clicking the edit icon

## Testing with Modbus Clients

### Using modpoll (Command Line)

**Install modpoll:**
- Download from: https://www.modbusdriver.com/modpoll.html

**Read SunSpec ID (should return 'SunS'):**
```bash
modpoll -m tcp -a 1 -r 40001 -c 2 -t 4 localhost
```

**Read AC Power (register 40083):**
```bash
modpoll -m tcp -a 1 -r 40083 -c 1 -t 3 localhost
```

**Read Inverter State (register 40108):**
```bash
modpoll -m tcp -a 1 -r 40108 -c 1 -t 3 localhost
```

**Write Power Limit to 50% (register 40233):**
```bash
modpoll -m tcp -a 1 -r 40233 -c 1 -t 4 localhost 5000
```

### Using qModMaster (GUI)

**Install qModMaster:**
- Download from: https://github.com/zhaoshoukuan/qModMaster

**Steps:**
1. Open qModMaster
2. Select **ModBus TCP** mode
3. Set IP: `127.0.0.1` (or your server IP)
4. Set Port: `502`
5. Set Slave ID: `1`
6. Function: **Read Holding Registers (0x03)**
7. Start Address: `40000` (for register 40001)
8. Number of Registers: `10`
9. Click **Read/Write**

### Using Python (pymodbus)

```python
from pymodbus.client import ModbusTcpClient

# Connect to simulator
client = ModbusTcpClient('localhost', port=502)

# Read SunSpec ID (40001-40002)
result = client.read_holding_registers(0, 2, slave=1)
print(f"SunSpec ID: {result.registers}")

# Read AC Power (40083)
result = client.read_holding_registers(82, 1, slave=1)
power_raw = result.registers[0]
print(f"AC Power (raw): {power_raw}")
print(f"AC Power (scaled): {power_raw * 0.01}W")

# Write Power Limit to 80% (register 40233)
# Value 8000 with scale factor -2 = 80.00%
client.write_register(232, 8000, slave=1)

# Read back to confirm
result = client.read_holding_registers(232, 1, slave=1)
print(f"Power Limit: {result.registers[0] * 0.01}%")

client.close()
```

## SunSpec Compliance Testing

### 1. Verify SunSpec Magic Number

**Register 40001-40002 should contain 'SunS' (0x53756e53):**
```
Expected: [0x5375, 0x6E53]
```

### 2. Verify Common Model (1)

**Register 40003: Model ID = 1**
**Register 40004: Length = 65**
**Registers 40005-40020: Manufacturer = "Fronius"**

### 3. Verify Inverter Model (103)

**Register 40070: Model ID = 103**
**Register 40071: Length = 50**
**Register 40108: Operating State** (values 1-8)

### 4. Test Control Commands

**Connect/Disconnect (Register 40232):**
```bash
# Disconnect (0)
modpoll -m tcp -a 1 -r 40232 -c 1 -t 4 localhost 0

# Check Operating State (should change to SHUTTING_DOWN then STANDBY)
modpoll -m tcp -a 1 -r 40108 -c 1 -t 3 localhost

# Reconnect (1)
modpoll -m tcp -a 1 -r 40232 -c 1 -t 4 localhost 1
```

**Power Limit Test:**
```bash
# Enable power limit
modpoll -m tcp -a 1 -r 40237 -c 1 -t 4 localhost 1

# Set limit to 30% (3000 with SF=-2)
modpoll -m tcp -a 1 -r 40233 -c 1 -t 4 localhost 3000

# Set reversion timeout to 60 seconds
modpoll -m tcp -a 1 -r 40235 -c 1 -t 4 localhost 60

# Verify Operating State changes to THROTTLED (5)
modpoll -m tcp -a 1 -r 40108 -c 1 -t 3 localhost

# Wait 60 seconds - power limit should auto-revert to 100%
```

### 5. Test Reversion Timers

All control commands should revert to defaults after their timeout expires:
- Connection state (40231)
- Power limit (40235)
- Power factor (40244)
- VAR control (40251)

## Expected Register Values

### Key Status Registers (When Running at 5000W):

| Register | Name | Expected Value (Raw) | Scaled Value | Notes |
|----------|------|---------------------|--------------|-------|
| 40001-40002 | SunS | 0x53756e53 | 'SunS' | Magic number |
| 40072 | AC Current | ~2174 | 21.74 A | I = P/(V×PF) |
| 40077 | AC Voltage | 23000 | 230.00 V | Nominal voltage |
| 40083 | AC Power | 500000 | 5000.00 W | Set by slider |
| 40085 | Power Factor | 990 | 0.990 | Typical for inverter |
| 40086 | Frequency | 5000 | 50.00 Hz | Grid frequency |
| 40108 | Operating State | 4 | MPPT | Normal operation |

### Scale Factors:

- Power/Voltage/Current: SF = -2 (divide by 100)
- Power Factor: SF = -3 (divide by 1000)
- Frequency: SF = -2 (divide by 100)

## Troubleshooting

### Port 502 Permission Denied

**Solution:** Use port 5020 instead
```bash
# Edit backend/.env
MODBUS_PORT=5020

# Or use environment variable
MODBUS_PORT=5020 npm run dev:backend
```

### Connection Refused

**Check if simulator is running:**
```bash
curl http://localhost:3001/health
```

**Check Modbus port:**
```bash
# Windows PowerShell
Test-NetConnection -ComputerName localhost -Port 502

# Linux/Mac
nc -zv localhost 502
```

### Registers Return 0

**Ensure simulator is started via API/UI**
- Click "Start" button in Web UI
- Or: `curl -X POST http://localhost:3001/api/simulator/start`

## Success Criteria

✅ **Basic Functionality:**
- [ ] Simulator starts without errors
- [ ] Web UI loads and connects via WebSocket
- [ ] Power slider adjusts AC power registers
- [ ] Modbus clients can connect on port 502

✅ **SunSpec Compliance:**
- [ ] SunSpec magic number 'SunS' at 40001-40002
- [ ] All model IDs and lengths correct
- [ ] Register addresses match specification
- [ ] Scale factors applied correctly

✅ **Control Commands:**
- [ ] Power limit reduces actual power output
- [ ] Operating state changes reflect commands
- [ ] Reversion timers work correctly
- [ ] Write to read-only registers returns error

✅ **Real-Time Updates:**
- [ ] Register values update in UI without refresh
- [ ] Power output shows smooth transitions
- [ ] Energy counter increments
- [ ] Temperature varies realistically

## Performance Benchmarks

- **Modbus Response Time**: < 50ms
- **Register Update Rate**: 1 Hz
- **Power Transition**: Smooth over 1-2 seconds
- **WebSocket Latency**: < 100ms

## Next Steps

1. Test with actual Fronius monitoring software
2. Test with industrial SCADA systems
3. Validate against IEEE 1547-2018 profiles (DER models 701-713)
4. Load testing with multiple concurrent clients


