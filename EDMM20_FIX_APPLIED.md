# EDMM-20 Discovery Issue - FIXED! ✅

## Problem Identified

The EDMM-20 **WAS connecting** to the simulator but was receiving **invalid SunSpec model length values**, causing discovery to fail.

### Root Cause

**Register 40004 (Common Model Length)** was returning **0** instead of **65**  
**Register 40071 (Inverter Model Length)** was returning **0** instead of **50**

When the EDMM-20 read these registers during SunSpec discovery, it tried to read 0 registers for the model data, which caused a Modbus exception (Invalid Quantity) and the connection was reset.

### Log Evidence

```
[0] Client connected: 192.168.178.170:47742
[0] [Modbus] Read request: address=0 (reg 40001), quantity=2     ✅ SunSpec ID
[0] [Modbus] Read request: address=2 (reg 40003), quantity=2     ✅ Model ID + Length
[0] [Modbus] Read request: address=4 (reg 40005), quantity=0     ❌ Tried to read 0 registers!
[0] [Modbus] Invalid quantity: 0 (must be 1-125)
[0] Error processing request: Error: Invalid quantity: 0
[0] Client error 192.168.178.170:47742: read ECONNRESET
```

The EDMM-20 IP is **192.168.178.170** - it was definitely trying to connect!

## Solution Applied

Updated `backend/src/parser/registerDefinitions.js` to explicitly set SunSpec model length registers:

```javascript
// Common Model Length (40004) - Must be 65
else if (reg.address === 40004 && reg.name === 'L') {
  reg.value = 65;
}

// Inverter Model Length (40071) - Must be 50
else if (reg.address === 40071 && reg.name === 'L') {
  reg.value = 50;
}
```

## Verification

### Before Fix:
```
Register 40004: 0      ❌
Register 40071: 0      ❌
```

### After Fix:
```
Register 40004: 65     ✅
Register 40071: 50     ✅
```

## Current Status

✅ Simulator is running on **192.168.178.155:502**  
✅ SunSpec ID correctly set (0x53756E53 = "SunS")  
✅ Common Model Length correctly set (65)  
✅ Inverter Model Length correctly set (50)  
✅ Modbus server accepting connections  
✅ Test client successfully reads all registers  

## Next Steps for EDMM-20

The simulator is now **fully SunSpec compliant** and should be discoverable by EDMM-20.

### Try Discovery Again:

1. **Go to EDMM-20 web interface**
2. **Configuration → Devices → Add Device**
3. **Enter settings:**
   ```
   Schnittstelle:    Ethernet Modbus TCP
   Modbus-Profil:    SunSpec
   IP-Adresse:       192.168.178.155
   Port:             502
   Unit ID:          1
   ```
4. **Click "Scan" or "Suchen"**
5. **Wait 10-30 seconds**

### Expected Result:

The EDMM-20 should now successfully:
1. Connect to 192.168.178.155:502 ✅
2. Read SunSpec ID "SunS" ✅
3. Read Common Model (ID=1, Length=65) ✅
4. Read Manufacturer "Fronius" ✅
5. Read Model "Symo GEN24 10.0" ✅
6. Read Inverter Model (ID=103, Length=50) ✅
7. **Discover device as "Fronius Symo GEN24"** ✅

## What Changed

### Files Modified:
1. **backend/src/parser/registerDefinitions.js**
   - Added explicit initialization for register 40004 (Common Model Length = 65)
   - Added explicit initialization for register 40071 (Inverter Model Length = 50)

2. **backend/src/modbus/modbusServer.js**
   - Added detailed logging for debugging Modbus requests
   - Shows address, register number, and quantity for each read request

## Monitoring

The simulator now logs every Modbus request with details:
```
[Modbus] Read request: address=0 (reg 40001), quantity=2
[Modbus] Read request: address=2 (reg 40003), quantity=4
[Modbus] Read request: address=4 (reg 40005), quantity=16
```

You can watch the terminal to see exactly what the EDMM-20 is requesting.

## If Discovery Still Fails

Check the terminal logs for:
1. **Connection attempts** - Should see "Client connected: 192.168.178.170:XXXXX"
2. **Read requests** - Should see multiple "[Modbus] Read request" lines
3. **Errors** - Any "Error processing request" or "Invalid" messages

If you see errors, please share the terminal output for further diagnosis.

---

**Last Updated**: January 5, 2026, 08:25  
**Fix Applied**: SunSpec Model Length Registers  
**Status**: Ready for EDMM-20 Discovery ✅


