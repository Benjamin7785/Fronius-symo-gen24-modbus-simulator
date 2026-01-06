# Quick Reference Card

## 🚀 Starting the Simulator

```powershell
cd C:\Users\Wagne\OneDrive\Programmierungen\WR_Sim
npm run dev
```

---

## 📍 Your Network Addresses

**Look for these in the startup message:**

```
HTTP API Server:
  ➜ Network: http://YOUR_LOCAL_IP:3001

Web UI:
  ➜ Network: http://YOUR_LOCAL_IP:3000

Modbus TCP Server:
  ➜ Network:   YOUR_LOCAL_IP:502
```

---

## 🎛️ SMA EDMM-20 Settings

| Setting | Value |
|---------|-------|
| Interface | Ethernet Modbus TCP |
| Modbus Profile | **SunSpec** |
| IP Address | **YOUR_LOCAL_IP** (from startup) |
| Port | **502** (default) |
| Unit ID | **1** |
| Device Name | Fronius Symo GEN24 10.0 |

---

## ⚡ Critical Steps

1. **Start simulator**: `npm run dev`
2. **Get your IP**: Look at "Network:" in startup message
3. **Open Web UI**: `http://localhost:3000`
4. **Click START button** ← **MUST DO THIS!**
5. **Wait 2 seconds** for Modbus server to start
6. **Register in EDMM-20** using your IP and port 502

---

## 🔧 Custom Port Configuration

Create `backend/.env`:

```env
MODBUS_PORT=5020    # Use different port
MODBUS_DEVICE_ID=1  # Device ID
```

---

## ✅ Quick Tests

### Test if Modbus port is accessible:
```powershell
Test-NetConnection -ComputerName YOUR_LOCAL_IP -Port 502
```

### Test Modbus communication:
```powershell
node test-modbus-client.js
```

### Check simulator status:
```powershell
Invoke-RestMethod -Uri http://localhost:3001/health
```

---

## 🔥 Firewall Rules (If Needed)

```powershell
# Allow Modbus TCP
New-NetFirewallRule -DisplayName "Modbus TCP" -Direction Inbound -LocalPort 502 -Protocol TCP -Action Allow

# Allow Web UI
New-NetFirewallRule -DisplayName "Fronius Simulator UI" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| EDMM-20 can't find device | Click START button in Web UI first! |
| Port 502 access denied | Run PowerShell as Admin OR use port 5020 |
| Can't access from network | Check firewall, ensure using correct IP |
| Wrong IP shown | Use the IP from simulator startup, not 192.168.x.x |

---

## 📞 Support Files

- `CONFIG_GUIDE.md` - Full configuration options
- `EDMM20_SOLUTION.md` - EDMM-20 troubleshooting
- `NETWORK_SETUP_COMPLETE.md` - Network setup details
- `TEST_RESULTS.md` - Test documentation

---

**Remember**: Always **START** the simulator (click START button) before scanning in EDMM-20!


