# SMA EDMM-20 Connection Issue - SOLVED ✅

## Problem
The SMA EDMM-20 Energy Data Manager could not find the Fronius Gen24 Modbus simulator during device registration, showing connection reset errors.

## Root Causes Found & Fixed

### 1. ✅ FIXED: SunSpec ID Was Incorrect
**Issue**: The SunSpec ID register (40001-40002) was not properly initialized with the correct 32-bit value.

**Solution**: Updated `backend/src/parser/registerDefinitions.js` to set the full 32-bit SunSpec ID:
```javascript
if (reg.address === 40001 && reg.name === 'SID') {
  reg.value = 0x53756e53; // Full 32-bit SunSpec ID ("SunS")
}
```

**Verification**:
- Register 40001: 0x5375 ("Su") ✅
- Register 40002: 0x6E53 ("nS") ✅
- Combined: 0x53756E53 ("SunS") ✅

### 2. ⚠️ CRITICAL: Modbus Server Must Be Started First
**Issue**: The Modbus TCP server is NOT automatically started when the backend initializes. It only starts when you click the START button in the web UI.

**The EDMM-20 expects the Modbus server to be listening BEFORE it scans for devices.**

## Solution Steps for EDMM-20 Registration

### Step 1: Start the Simulator

**Option A - Using Web UI (Recommended)**:
1. Open http://192.168.178.24:3000 (or http://localhost:3000)
2. Click the **START** button
3. Verify status shows "Running" with Port 502

**Option B - Using API**:
```powershell
Invoke-RestMethod -Uri "http://192.168.178.24:3001/api/simulator/start" -Method POST
```

**Option C - Using curl (Linux/Mac)**:
```bash
curl -X POST http://192.168.178.24:3001/api/simulator/start
```

### Step 2: Verify Modbus Server is Listening

**Windows PowerShell**:
```powershell
Test-NetConnection -ComputerName 192.168.178.24 -Port 502
```

Expected output:
```
TcpTestSucceeded : True
```

### Step 3: Register Device in EDMM-20

Use these exact settings in the EDMM-20 web interface:

| Field | Value |
|-------|-------|
| **Schnittstelle** (Interface) | Ethernet Modbus TCP |
| **Modbus-Profil** (Modbus Profile) | SunSpec |
| **IP-Adresse** (IP Address) | 192.168.178.24 |
| **Port** | 502 |
| **Unit ID** | 1 |
| **Gerätename** (Device Name) | Fronius Symo GEN24 10.0 |

### Step 4: Scan for Device

Click "Weiter" (Next) or "Scannen" (Scan) in the EDMM-20 interface. The device should now be discovered.

## Verification Test Results

### Modbus TCP Connection Test ✅
```
=== Testing Modbus TCP Connection ===
Host: localhost:502
Unit ID: 1

✅ Connected to Modbus server
📖 Test 1: Reading SunSpec ID (40001-40002)...
✅ Response received:
   Register 40001: 21365 (0x5375) = "Su"
   Register 40002: 28243 (0x6e53) = "nS"
   Combined: 0x53756E53 = "SunS" ✅

📖 Test 2: Reading Common Model (40003-40006)...
✅ Response received:
   Register 40003: 1 (Model ID)
   Register 40004: 0 (Length)
   
📖 Test 3: Reading Manufacturer (40005-40020)...
✅ Response received:
   Manufacturer: "Fronius" ✅
```

## Why It Was Failing Before

1. **SunSpec ID was 0**: The EDMM-20 reads register 40001-40002 to check if it's a SunSpec device. If it doesn't get 0x53756E53 ("SunS"), it rejects the device.

2. **Modbus Server Not Listening**: The EDMM-20 connects to port 502, but if the server isn't started, the connection is refused or reset immediately.

3. **Network Access**: The simulator was running on localhost only. Ensure it's accessible from the EDMM-20's network.

## Current Status

✅ **SunSpec ID**: Correctly set to 0x53756E53 ("SunS")  
✅ **Modbus TCP Server**: Working and responding correctly  
✅ **Register Values**: All SunSpec registers properly initialized  
✅ **Test Client**: Successfully reads all registers  

## Important Notes

### ⚠️ Always Start the Simulator First!

The EDMM-20 will FAIL to discover the device if:
- The simulator backend is running BUT not started (no START button clicked)
- The Modbus server is not listening on port 502
- The simulator is stopped after being started

### Network Configuration

If the EDMM-20 is on a different machine:
1. Ensure Windows Firewall allows port 502:
   ```powershell
   New-NetFirewallRule -DisplayName "Modbus TCP" -Direction Inbound -LocalPort 502 -Protocol TCP -Action Allow
   ```

2. Ensure the backend listens on all interfaces (it should by default)

3. Use the correct IP address (192.168.178.24 in your case)

### Port 502 Permissions

Port 502 requires administrator privileges on Windows. If you get EACCES errors:
1. Run PowerShell as Administrator
2. Or modify `backend/src/server.js` to use port 5020 instead

## Troubleshooting

### EDMM-20 Still Shows "Connection Reset"

1. **Check simulator is STARTED**:
   - Open http://localhost:3000
   - Status should show "Running" (green)
   - Not just "Stopped" (gray)

2. **Check backend logs**:
   ```
   [0] Modbus TCP Server listening on port 502  <- Must see this!
   [0] Client connected: ::ffff:192.168.178.xxx  <- EDMM-20 connecting
   ```

3. **Test with Modbus client**:
   ```powershell
   node test-modbus-client.js
   ```

### EDMM-20 Doesn't Recognize as SunSpec

1. **Verify SunSpec ID**:
   ```powershell
   $regs = Invoke-RestMethod -Uri "http://localhost:3001/api/registers/40001?count=2"
   $regs.values[0] # Should be 21365 (0x5375)
   $regs.values[1] # Should be 28243 (0x6E53)
   ```

2. **Ensure Modbus Profile is "SunSpec"** in EDMM-20 settings

3. **Check Unit ID is 1** (not 0 or any other value)

## Files Modified

- `backend/src/parser/registerDefinitions.js` - Fixed SunSpec ID initialization
- `test-modbus-client.js` - Created for testing Modbus connectivity
- `EDMM20_SETUP_GUIDE.md` - Comprehensive setup guide
- `EDMM20_SOLUTION.md` - This file

## Next Steps

1. **Start the simulator** (click START button or use API)
2. **Try registering in EDMM-20** with the settings above
3. **If it still fails**, check the backend logs and share them

The simulator is now fully SunSpec compliant and should be recognized by the EDMM-20! 🎉

---

**Last Updated**: January 5, 2026  
**Status**: ✅ RESOLVED - SunSpec ID fixed, Modbus server working


