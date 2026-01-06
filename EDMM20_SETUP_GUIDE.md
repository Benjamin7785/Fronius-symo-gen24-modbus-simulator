# SMA EDMM-20 Setup Guide for Fronius Gen24 Simulator

## Problem

The SMA EDMM-20 (Energy Data Manager) cannot find the Fronius Gen24 Modbus simulator during device registration.

## Root Cause

The Modbus TCP server is **NOT automatically started** when the backend initializes. It only starts when you click the **START** button in the web UI or call the `/api/simulator/start` endpoint.

The EDMM-20 scans for Modbus devices by:
1. Connecting to the specified IP address on port 502
2. Reading the SunSpec ID register (40001-40002)
3. If it gets a valid SunSpec ID (0x53756e or "SunS"), it recognizes it as a SunSpec device

## Solution

### Option 1: Start the Simulator Before Scanning (Recommended)

1. **Open the Web UI**: http://localhost:3000 (or http://192.168.178.24:3000 from another device)

2. **Click the START button** in the Simulator Control panel

3. **Verify the status shows "Running"** with Port 502

4. **Now scan for devices in the EDMM-20**:
   - Interface: Ethernet Modbus TCP
   - Modbus Profile: SunSpec
   - IP Address: 192.168.178.24 (or your simulator IP)
   - Port: 502
   - Unit ID: 1
   - Device Name: Modbus (or "Fronius Symo GEN24 10.0")

### Option 2: Auto-Start Modbus Server on Backend Initialization

Modify the backend to automatically start the Modbus server when it initializes.

**File**: `backend/src/server.js`

Add this after simulator initialization:

\`\`\`javascript
// Auto-start the simulator for EDMM-20 compatibility
simulator.start().then(() => {
  console.log('Simulator auto-started for external device compatibility');
}).catch((err) => {
  console.error('Failed to auto-start simulator:', err.message);
});
\`\`\`

### Option 3: Use API to Start Simulator

Before scanning with EDMM-20, use PowerShell or curl to start the simulator:

\`\`\`powershell
Invoke-RestMethod -Uri "http://192.168.178.24:3001/api/simulator/start" -Method POST
\`\`\`

Or from Linux/Mac:

\`\`\`bash
curl -X POST http://192.168.178.24:3001/api/simulator/start
\`\`\`

## Verification Steps

### 1. Check if Modbus Server is Listening

**Windows PowerShell**:
\`\`\`powershell
Test-NetConnection -ComputerName 192.168.178.24 -Port 502
\`\`\`

Expected output:
\`\`\`
TcpTestSucceeded : True
\`\`\`

### 2. Test Modbus Connection

Use the included test script:

\`\`\`powershell
node test-modbus-client.js
\`\`\`

Expected output:
\`\`\`
✅ Connected to Modbus server
📖 Test 1: Reading SunSpec ID (40001-40002)...
✅ Response received:
   Register 40001: 0 (0x0000)
   Register 40002: 21365 (0x5375) <- "Su"
\`\`\`

The value `21365` (0x5375) represents "Su" - the first part of "SunS" (SunSpec ID).

### 3. Check Backend Logs

Look for these lines in the backend terminal:

\`\`\`
Starting simulator...
Modbus TCP Server listening on port 502
Feedback handler started
PV Generator started
Simulator started successfully
\`\`\`

If you see `Client connected: ::ffff:192.168.178.xxx` followed immediately by `Client error ... read ECONNRESET`, it means the EDMM-20 is connecting but the server is responding incorrectly or closing the connection.

## Common Issues & Solutions

### Issue 1: Port 502 Permission Denied (EACCES)

**Problem**: Port 502 requires administrator privileges on Windows.

**Solution**:
1. Run PowerShell as Administrator
2. Or use port 5020 instead (modify `backend/src/server.js`)

### Issue 2: Port 502 Already in Use (EADDRINUSE)

**Problem**: Another application is using port 502.

**Solution**:
\`\`\`powershell
# Find process using port 502
Get-NetTCPConnection -LocalPort 502 | Select-Object OwningProcess
Get-Process -Id <ProcessID>

# Kill the process
Stop-Process -Id <ProcessID> -Force
\`\`\`

### Issue 3: Firewall Blocking Port 502

**Problem**: Windows Firewall blocks incoming connections on port 502.

**Solution**:
\`\`\`powershell
# Add firewall rule (run as Administrator)
New-NetFirewallRule -DisplayName "Modbus TCP" -Direction Inbound -LocalPort 502 -Protocol TCP -Action Allow
\`\`\`

### Issue 4: EDMM-20 Shows "Connection Reset" Error

**Problem**: Modbus server closes connection immediately.

**Possible Causes**:
1. Simulator not started (click START button first)
2. Wrong Unit ID (must be 1)
3. SunSpec registers not initialized properly

**Solution**:
1. Ensure simulator is started (status shows "Running")
2. Verify Unit ID is set to 1 in EDMM-20
3. Check backend logs for errors

### Issue 5: EDMM-20 Doesn't Recognize as SunSpec Device

**Problem**: EDMM-20 connects but doesn't identify the device.

**Solution**:
1. Verify SunSpec ID register (40001-40002) contains correct value
2. Use test script to verify: `node test-modbus-client.js`
3. Check that Modbus Profile in EDMM-20 is set to "SunSpec"

## EDMM-20 Configuration

When adding the device in the EDMM-20 web interface:

| Field | Value |
|-------|-------|
| **Schnittstelle** (Interface) | Ethernet Modbus TCP |
| **Modbus-Profil** (Modbus Profile) | SunSpec |
| **IP-Adresse** (IP Address) | 192.168.178.24 (your simulator IP) |
| **Port** | 502 |
| **Unit ID** | 1 |
| **Gerätename** (Device Name) | Fronius Symo GEN24 10.0 |

## Expected SunSpec Registers

The simulator should respond with these values:

| Register | Name | Value | Description |
|----------|------|-------|-------------|
| 40001-40002 | SID | 0x53756e53 ("SunS") | SunSpec ID |
| 40003 | ID | 1 | Common Model ID |
| 40004 | L | 8 | Model Length |
| 40005-40020 | Mn | "Fronius" | Manufacturer |
| 40021-40036 | Md | "Symo GEN24 10.0" | Device Model |
| 40070 | ID | 103 | Inverter Model ID |

## Troubleshooting Checklist

- [ ] Simulator backend is running (check terminal)
- [ ] Simulator is STARTED (click START button or use API)
- [ ] Port 502 is accessible (use Test-NetConnection)
- [ ] Firewall allows port 502
- [ ] EDMM-20 is on same network (192.168.178.x)
- [ ] EDMM-20 Modbus Profile is set to "SunSpec"
- [ ] Unit ID is set to 1
- [ ] Test script confirms Modbus communication works

## Support

If the EDMM-20 still cannot find the device:

1. **Capture Modbus traffic** using Wireshark:
   - Filter: `tcp.port == 502`
   - Look for connection attempts from EDMM-20
   - Check if SunSpec ID is being read

2. **Check backend logs** for connection attempts:
   - Look for "Client connected" messages
   - Check for any error messages

3. **Verify SunSpec compliance**:
   - Run test script: `node test-modbus-client.js`
   - Confirm register 40001-40002 returns SunSpec ID

4. **Try manual Modbus client**:
   - Use QModMaster or similar tool
   - Connect to 192.168.178.24:502
   - Read registers 40001-40002
   - Should return: 0x0000, 0x5375 (or decimal: 0, 21365)

---

**Important**: Always ensure the simulator is **STARTED** (not just initialized) before the EDMM-20 scans for devices!


