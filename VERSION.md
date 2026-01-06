# Version History

## Version 1.2 (January 6, 2026)

**User Experience Improvements - Convenient Startup/Shutdown**

### New Features

1. **Start.bat** - One-click simulator startup
   - Automatically starts both backend and frontend servers
   - Displays all connection URLs (Web UI, API, Modbus)
   - Shows configuration reminder (click START button)
   - Colored console output for better visibility
   - Keeps window open for monitoring

2. **Stop.bat** - Clean shutdown
   - Safely terminates all Node.js processes
   - Prevents orphaned processes
   - User-friendly confirmation messages

3. **Enhanced Documentation**
   - Updated README.md with prominent Quick Start section
   - Updated QUICKSTART.md with complete startup procedure
   - Added step-by-step guide for first-time users
   - Batch files prominently featured in all docs

### Benefits

- **No command line knowledge required** - Just double-click Start.bat
- **Network IP displayed** - Easy EDMM-20 configuration
- **Clean process management** - Stop.bat ensures no orphaned processes
- **Beginner-friendly** - Perfect for users unfamiliar with npm/Node.js
- **Windows-optimized** - Native batch file experience

### Files Added

- Start.bat
- Stop.bat

### Files Modified

- README.md (Quick Start section added)
- QUICKSTART.md (Complete startup procedure)

### Usage

**Starting:**
```batch
Start.bat
```

**Stopping:**
```batch
Stop.bat
```

That's it! No need to remember `npm run dev` or other commands.

---

## Version 1.1.2 (January 6, 2026)

**Complete Scale Factor Fixes**

### Issues Fixed

1. **Voltage Scaling Mismatch** (Version 1.1.1)
   - Fixed V_SF usage from -2 to -1 in pvGenerator.js
   - Phase voltages now display as 230V (was 2309V)
   - Line voltages now display as 400V (was 4000V)

2. **Power Scale Factor Corrections** (Version 1.1.2)
   - Fixed VA_SF (40089) from -2 to 0
   - Fixed VAr_SF (40091) from -2 to 0
   - Fixed DCW_SF (40102) from -2 to 0
   - Fixed DCW_SF (40258, MPPT) from -2 to 0
   - All power values now display correctly (not 100x too small)

3. **Complete Inverter Values** (Version 1.1)
   - Added per-phase AC currents (AphA, AphB, AphC)
   - Added line-to-line voltages (PPVphAB, PPVphBC, PPVphCA)
   - Added apparent power (VA) and reactive power (VAr)
   - Added DC values for all 4 MPPT modules
   - All values now physically consistent

### Physical Verification

All values verified against physical relationships:
- AC: P = V × I × PF (2410W = 230V × 10.6A × 0.991)
- AC: S = V × I (2432VA = 230V × 10.6A)
- AC: Q = √(S² - P²) (326VAr)
- DC: P = V × I (2485W = 650V × 3.82A)
- Efficiency: DC/AC = 2485W/2410W = 1.03 ≈ 1/0.97

### Files Modified
- backend/src/simulation/pvGenerator.js
- backend/src/parser/registerDefinitions.js

### Documentation Added
- COMPLETE_VALUES_UPDATE.md
- VOLTAGE_SCALING_FIX.md
- SCALE_FACTOR_FIX_COMPLETE.md

---

## Version 1.0 (January 6, 2026)

**Initial Release - Full EDMM-20 Integration**

### Features

#### Core Functionality
- ✅ **Fronius Gen24 Plus Modbus TCP Simulator** (Gen24 SIM)
- ✅ **Full SunSpec Compliance** with complete register maps:
  - Model 1: Common (SunSpec ID, Manufacturer, Model, Serial, Version)
  - Model 103: Inverter (Three Phase) with AC power, voltage, current, frequency
  - Model 120: Nameplate Ratings (WRtg, VARtg, WMax, PFMin)
  - Model 121: Basic Settings (WMax, VRef, VRefOfs)
  - Model 122: Extended Measurements and Status (PVConn, StorConn, Conn)
  - Model 123: Immediate Controls (WMaxLimPct, WMaxLim_Ena)
  - Model 124: Storage Control (WChaMax, WDisChaMax)
  - Model 160: MPPT Extension (DC voltage, current, power per string)
  - End Block (0xFFFF marker)

#### PV Power Simulation
- ✅ **User-controlled power slider** (0-10,000 W)
- ✅ **Realistic PV generation** with smooth transitions
- ✅ **Physical value consistency**:
  - AC Power (W) with SF=0 (1:1 scaling)
  - AC Voltage (~230V) with SF=-1 (0.1V resolution)
  - AC Current (calculated: P/(V×PF)) with SF=-2 (0.01A resolution)
  - Frequency (~50Hz) with SF=-2 (0.01Hz resolution)
  - Power Factor (0.99)
- ✅ **DC values per MPPT string**:
  - Voltage (400-800V range)
  - Current (calculated from power)
  - Power (distributed across strings)

#### EDMM-20 Integration
- ✅ **Device Discovery** - Correctly responds to SunSpec model scan
- ✅ **Rated Power Display** - Shows 10 kW Nennleistung (WRtg=10000, WMax=10000)
- ✅ **Power Output** - Real-time power display matching slider setting
- ✅ **Status Feedback** - Correct operating states (Start, Abregelung, etc.)
- ✅ **Power Limitation Control** (Wirkleistungsbegrenzung):
  - Bidirectional register 40233 (WMaxLimPct)
  - EDMM-20 can read current limitation
  - EDMM-20 can write new limitation (0-100%)
  - Status changes to "Abregelung" when limited
- ✅ **Connection Status** - PV and Storage shown as connected and operating
- ✅ **Grid Parameters** - Voltage and frequency always present

#### Web User Interface
- ✅ **Simulator Control Panel**:
  - Start/Stop Modbus server
  - Power output slider (0-10kW)
  - Real-time monitoring (Current Power, Total Energy, Efficiency)
  - Network configuration display (IP, Port, Device ID)
- ✅ **Register Browser**:
  - All Models view with register hierarchy
  - Writable Registers tab for manual control
  - Read-Only Registers tab for monitoring
  - **Dropdown menus** for enum registers (e.g., Enable/Disable)
  - Real-time value updates via WebSocket
  - Scaled value display (with scale factors)
- ✅ **Responsive Material-UI design**

#### Network Configuration
- ✅ **Auto-detection** of local network IP (192.168.178.x range priority)
- ✅ **Configurable Modbus port** (default 503, configurable via .env)
- ✅ **Accessible on local network** for external devices (EDMM-20)
- ✅ **Device ID configuration** (default 1)
- ✅ **Multi-interface support** (listens on 0.0.0.0)

#### Technical Implementation
- ✅ **Node.js backend** with Express REST API
- ✅ **React frontend** with Vite build system
- ✅ **WebSocket** for real-time updates
- ✅ **Modbus TCP server** (Function codes 0x03, 0x06, 0x10)
- ✅ **Integer + Scale Factor (Int+SF)** data format
- ✅ **XML register map parsing** from Fronius documentation
- ✅ **In-memory register storage** with change notification
- ✅ **Command-response feedback** mechanisms
- ✅ **Internal write methods** for simulation updates to read-only registers
- ✅ **Scale factor handling** for all data types (int16, uint16, int32, uint32)

### Documentation

- **README.md** - Main project documentation
- **QUICKSTART.md** - Quick start guide for first-time users
- **EDMM20_FINAL_STATUS.md** - Complete EDMM-20 integration guide
- **CONFIG_GUIDE.md** - Network configuration instructions
- **WIRKLEISTUNGSBEGRENZUNG_GUIDE.md** - Power limitation control guide
- **EDMM20_SETUP_GUIDE.md** - Step-by-step EDMM-20 setup
- **TESTING.md** - Testing procedures and scripts

### Test Scripts

- **test-modbus-client.js** - Modbus TCP connectivity test
- **verify-sunspec-compliance.js** - SunSpec compliance verification
- **test-device-name.js** - Device name verification
- **diagnose-edmm20.ps1** - PowerShell diagnostic script
- **compare-with-real-fronius.js** - Compare with real inverter

### Key Fixes and Improvements

#### SunSpec Compliance Fixes
1. **SunSpec ID** (40001-40002): Fixed to 0x53756E53 ("SunS")
2. **Model Lengths**: All models have correct length values
   - Common: 65 registers
   - Inverter: 50 registers
   - Nameplate: 26 registers
   - Basic Settings: 30 registers
   - Extended Measurements: 44 registers
   - Immediate Controls: 24 registers
   - Storage Control: 24 registers
   - MPPT Extension: 88 registers
3. **End Block**: Correctly set to 0xFFFF at register 40370

#### EDMM-20 Discovery Fixes
1. **PVConn** (40184): Set to 7 (Connected + Available + Operating)
2. **StorConn** (40185): Set to 7 (Connected + Available + Operating)
3. **Grid Parameters**: Always present (Hz, PhVphA) even at 0W
4. **Power Scale Factor** (W_SF): Set to 0 for proper 10kW representation

#### Power and Limitation Fixes
1. **WRtg** (40125): Set to 10000W (10kW rated power)
2. **WMax** (40152): Set to 10000W (10kW maximum power)
3. **WMaxLimPct** (40233): Bidirectional feedback register
4. **WMaxLim_Ena** (40237): Enabled for power limitation control
5. **Scale Factors**: Correctly initialized for all value types

### Statistics

- **Total Files**: 58
- **Total Lines**: 20,356
- **Backend Files**: 12 JavaScript modules
- **Frontend Files**: 8 React components
- **Documentation**: 20+ markdown files
- **Test Scripts**: 6 diagnostic tools

### System Requirements

- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **OS**: Windows, macOS, or Linux
- **Network**: Local network access for EDMM-20 integration
- **Port**: 503 (Modbus TCP), 3000 (Web UI), 3001 (API)

### Installation

```bash
# Install dependencies
npm run install-all

# Start simulator
npm run dev
```

### Usage

1. **Start the simulator**: `npm run dev`
2. **Open Web UI**: http://localhost:3000
3. **Click START** button to enable Modbus server
4. **Set power** using slider (0-10kW)
5. **Configure EDMM-20** to connect to `<your-ip>:503`, Device ID 1
6. **Monitor** via EDMM-20 or Web UI Register Browser

### Known Limitations

- Limited to single device (Device ID 1)
- Battery storage simulation is basic (status only, no charge/discharge)
- No support for Model 103 variants (single-phase, split-phase)
- MPPT string configuration is fixed (3 strings)

### Future Enhancements (Not in v1.0)

- Multi-device support (multiple Device IDs)
- Advanced battery simulation with SOC, charge/discharge cycles
- Configurable MPPT string count
- Historical data logging and export
- Alarm and event simulation
- Single-phase and split-phase inverter models
- Custom register map import/export

### Credits

- **Modbus Protocol**: Modbus.org
- **SunSpec Protocol**: SunSpec Alliance
- **Fronius Register Maps**: Fronius International GmbH
- **SMA EDMM-20**: SMA Solar Technology AG

### License

This simulator is intended for testing and development purposes only.

---

**Release Date**: January 6, 2026  
**Git Commit**: 84e4e63  
**Git Tag**: v1.0

