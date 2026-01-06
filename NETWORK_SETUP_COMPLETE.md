# ✅ Network Setup Complete!

## Your Simulator Network Configuration

The Fronius Gen24 Modbus Simulator is now configured to be accessible from any device on your local network.

### 🌐 Network Addresses

Based on your current startup:

**HTTP API Server:**
- Local: `http://localhost:3001`
- Network: `http://10.245.183.18:3001` ← **Your local IP**

**Web UI:**
- Local: `http://localhost:3000`
- Network: `http://10.245.183.18:3000` ← **Access from other devices**

**Modbus TCP Server:**
- Host: `0.0.0.0` (listening on all network interfaces)
- Port: `502` (configurable)
- Device ID: `1` (configurable)
- Network: `10.245.183.18:502` ← **For EDMM-20**

> **Note**: Your actual local IP is shown when the simulator starts. The IP `10.245.183.18` is an example - use the IP displayed in your terminal.

---

## 🔧 Configurable Settings

You can now customize the Modbus port and device ID using environment variables!

### Create `backend/.env` file:

```env
# HTTP Server
PORT=3001
HOST=0.0.0.0

# Modbus TCP Server
MODBUS_PORT=502        # Change this to any port (e.g., 5020 if 502 needs admin rights)
MODBUS_DEVICE_ID=1     # Change this to match your EDMM-20 configuration

# Development
NODE_ENV=development
```

### Example: Using Port 5020 (No Admin Required)

```env
MODBUS_PORT=5020
MODBUS_DEVICE_ID=1
```

Then configure EDMM-20 to use port 5020 instead of 502.

---

## 📱 SMA EDMM-20 Configuration

Use these settings when registering the simulator in your EDMM-20:

### Device Registration Settings:

| Field | Value |
|-------|-------|
| **Schnittstelle** | Ethernet Modbus TCP |
| **Modbus-Profil** | SunSpec |
| **IP-Adresse** | `10.245.183.18` ← **YOUR LOCAL IP** |
| **Port** | `502` (or your custom port from .env) |
| **Unit ID** | `1` (or your custom device ID from .env) |
| **Gerätename** | Fronius Symo GEN24 10.0 |

> **Important**: Replace `10.245.183.18` with the IP address shown in your simulator startup message!

---

## 🚀 Quick Start Guide

### 1. Start the Simulator
```powershell
npm run dev
```

### 2. Note Your Local IP
Look for this in the startup message:
```
Modbus TCP Server:
  ➜ Network:   10.245.183.18:502
               ^^^^^^^^^^^^^^^^
               Use this IP for EDMM-20!
```

### 3. Start the Modbus Server
- Open Web UI: `http://localhost:3000` (or your network IP from another device)
- **Click the START button** ← **CRITICAL STEP!**
- Verify status shows "Running" (green)

### 4. Register in EDMM-20
- Use your local network IP (shown in step 2)
- Port: 502 (or your custom port)
- Unit ID: 1 (or your custom device ID)
- Click scan/register

---

## 🔥 Firewall Configuration

If accessing from another device, ensure Windows Firewall allows connections:

### Allow Modbus TCP (Port 502)
```powershell
New-NetFirewallRule -DisplayName "Modbus TCP" -Direction Inbound -LocalPort 502 -Protocol TCP -Action Allow
```

### Allow Web UI (Port 3000)
```powershell
New-NetFirewallRule -DisplayName "Fronius Simulator UI" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Allow HTTP API (Port 3001)
```powershell
New-NetFirewallRule -DisplayName "Fronius Simulator API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

---

## ✅ Verification Tests

### Test 1: Check if Port 502 is Accessible

**From the same machine:**
```powershell
Test-NetConnection -ComputerName localhost -Port 502
```

**From another device (e.g., EDMM-20):**
```powershell
Test-NetConnection -ComputerName 10.245.183.18 -Port 502
```

Expected: `TcpTestSucceeded : True`

### Test 2: Test Modbus Connection

**Run the test script:**
```powershell
node test-modbus-client.js
```

Expected output:
```
✅ Connected to Modbus server
📖 Test 1: Reading SunSpec ID (40001-40002)...
✅ Response received:
   Register 40001: 21365 (0x5375) = "Su"
   Register 40002: 28243 (0x6e53) = "nS"
```

### Test 3: Access Web UI from Network

From another device on your network, open a browser and go to:
```
http://10.245.183.18:3000
```

You should see the Fronius simulator interface.

---

## 🔍 Troubleshooting

### EDMM-20 Cannot Connect

**Check 1: Is the simulator started?**
- Status should show "Running" (green) in Web UI
- Backend logs should show: `Modbus TCP Server listening on port 502`

**Check 2: Is the IP correct?**
- Use the IP shown in the simulator startup message
- NOT `192.168.178.24` unless that's your actual IP

**Check 3: Is port 502 accessible?**
```powershell
Test-NetConnection -ComputerName YOUR_IP -Port 502
```

**Check 4: Firewall?**
- Add firewall rule (see above)
- Or temporarily disable Windows Firewall for testing

### Port 502 Requires Admin Rights

**Option 1: Run as Administrator**
- Right-click PowerShell
- Select "Run as Administrator"
- Run `npm run dev`

**Option 2: Use a Different Port**
Create `backend/.env`:
```env
MODBUS_PORT=5020
```

Then configure EDMM-20 to use port 5020.

---

## 📝 Summary of Changes

✅ **Server now listens on all network interfaces** (0.0.0.0)  
✅ **Local network IP is displayed on startup**  
✅ **Modbus port is configurable** via environment variable  
✅ **Device ID is configurable** via environment variable  
✅ **Network URLs shown** for easy access from other devices  

---

## 📚 Additional Resources

- `CONFIG_GUIDE.md` - Complete configuration options
- `EDMM20_SOLUTION.md` - EDMM-20 specific troubleshooting
- `EDMM20_SETUP_GUIDE.md` - Detailed EDMM-20 setup instructions
- `test-modbus-client.js` - Test script for Modbus connectivity

---

**Your simulator is now fully configured for network access! 🎉**

Access it from any device on your network using the IP address shown in the startup message.


