# SMA EDMM-20 Setup Guide for Fronius Gen24 Simulator
## Network: 192.168.178.XXX

---

## ✅ Current Status

**Simulator is RUNNING and ACCESSIBLE on your network!**

- **IP Address**: `192.168.178.155`
- **Modbus Port**: `502`
- **Device ID**: `1`
- **SunSpec ID**: Correctly configured (0x53756E53 = "SunS")

---

## 📋 EDMM-20 Configuration Steps

### 1. Access EDMM-20 Web Interface

Open your browser and navigate to your EDMM-20's IP address (typically something like `http://192.168.178.XXX`).

### 2. Add New Device

Navigate to: **Configuration** → **Devices** → **Add Device**

### 3. Device Settings

Enter the following settings **EXACTLY**:

```
┌─────────────────────────────────────────────────┐
│ Device Configuration                            │
├─────────────────────────────────────────────────┤
│ Schnittstelle:    Ethernet Modbus TCP           │
│ Modbus-Profil:    SunSpec                       │
│ IP-Adresse:       192.168.178.155               │ ← YOUR SIMULATOR IP
│ Port:             502                           │
│ Unit ID:          1                             │
│ Gerätename:       Fronius Symo GEN24 10.0       │
│ Hersteller:       Fronius                       │
└─────────────────────────────────────────────────┘
```

### 4. Scan for Device

After entering the settings:
1. Click **"Scan"** or **"Suchen"** button
2. Wait **10-30 seconds** for the scan to complete
3. The EDMM-20 should discover the device as:
   - **Fronius** (Manufacturer)
   - **Symo GEN24** (Model)
   - **SunSpec Compatible**

### 5. Verify Connection

Once discovered, you should see:
- ✅ Device status: **Online/Connected**
- ✅ Communication: **Active**
- ✅ Data points being read (Power, Voltage, Current, etc.)

---

## 🔧 Troubleshooting

### Problem: EDMM-20 Can't Find Device

#### Solution 1: Check Simulator is Started
```powershell
# Open PowerShell in project directory
Invoke-RestMethod -Uri "http://localhost:3001/api/simulator/status"
```

**Expected output:**
```
running     : True
modbus      : @{isRunning=True; port=502; ...}
```

If `running` is `False`, open Web UI and click **START** button:
- **Web UI**: http://localhost:3000 or http://192.168.178.155:3000

#### Solution 2: Verify Network Connectivity

From EDMM-20 or another device on your network:
```bash
# Test if port 502 is reachable
telnet 192.168.178.155 502
# or
nc -zv 192.168.178.155 502
```

From your PC:
```powershell
Test-NetConnection -ComputerName 192.168.178.155 -Port 502
```

**Expected:** `TcpTestSucceeded : True`

#### Solution 3: Windows Firewall

If the network test fails, you may need to allow port 502 through Windows Firewall:

**Option A: Using PowerShell (Run as Administrator)**
```powershell
New-NetFirewallRule -DisplayName "Modbus TCP Port 502" `
                    -Direction Inbound `
                    -LocalPort 502 `
                    -Protocol TCP `
                    -Action Allow `
                    -Profile Any
```

**Option B: Using Windows Firewall GUI**
1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → Next
4. Select **TCP**, enter port **502** → Next
5. Select **Allow the connection** → Next
6. Check all profiles (Domain, Private, Public) → Next
7. Name: "Modbus TCP Port 502" → Finish

#### Solution 4: Check IP Address

Verify your PC's IP hasn't changed:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.178.*"}
```

If the IP is different, restart the simulator:
1. Stop: Press `Ctrl+C` in the terminal running `npm run dev`
2. Start: Run `npm run dev` again
3. The simulator will detect the new IP automatically

#### Solution 5: EDMM-20 Network Settings

Ensure EDMM-20 is on the same network:
- EDMM-20 IP should be `192.168.178.XXX`
- Subnet mask: `255.255.255.0`
- Gateway: `192.168.178.1` (typically)

#### Solution 6: Try Multiple Scans

Sometimes the first scan fails. Try:
1. Scan 2-3 times
2. Wait 30 seconds between scans
3. Restart EDMM-20 if necessary

---

## 🧪 Testing Modbus Connection

### From Your PC

Run the included test script:
```powershell
# Test on network IP
$env:MODBUS_HOST='192.168.178.155'
node test-modbus-client.js
```

**Expected output:**
```
✅ Connected to Modbus server
✅ Response received: Register 40001: 21365 (0x5375)
✅ Response received: Register 40002: 28243 (0x6e53)
✅ All tests completed successfully!
```

### From Another Device (e.g., Raspberry Pi, Linux)

```bash
# Install modbus tools
sudo apt-get install libmodbus-dev

# Test read
modbus_client -a 1 -t 4 -r 40001 -c 2 192.168.178.155
```

---

## 📊 Expected Data from Simulator

Once connected, EDMM-20 should read:

### Device Information
- **Manufacturer**: Fronius
- **Model**: Symo GEN24 10.0 Plus
- **Serial Number**: 12345678
- **Firmware**: 1.0.0

### Real-time Data (when simulation is running)
- **AC Power**: 0-10000 W (adjustable via Web UI slider)
- **AC Voltage**: ~230V per phase
- **AC Current**: Calculated from power
- **Frequency**: ~50 Hz
- **Power Factor**: ~0.95-1.0
- **DC Power**: ~103% of AC power (with losses)
- **DC Voltage**: ~400-600V per string
- **Operating State**: 4 (MPPT/Running) when power > 0
- **Total Energy**: Accumulates over time

---

## 🎛️ Controlling the Simulator

### Web UI
Open: http://192.168.178.155:3000

**Controls:**
- **START/STOP**: Enable/disable Modbus server
- **Power Slider**: Set PV generation (0-10000W)
- **Register Browser**: View all Modbus registers in real-time

### REST API
```powershell
# Start simulator
Invoke-RestMethod -Uri "http://192.168.178.155:3001/api/simulator/start" -Method POST

# Set power to 5000W
Invoke-RestMethod -Uri "http://192.168.178.155:3001/api/simulator/power" `
                  -Method PUT `
                  -ContentType "application/json" `
                  -Body '{"power": 5000}'

# Get status
Invoke-RestMethod -Uri "http://192.168.178.155:3001/api/simulator/status"
```

---

## 🔍 Diagnostic Commands

### Check if Simulator is Running
```powershell
Get-Process -Name node | Where-Object {$_.CommandLine -like "*server.js*"}
```

### Check Listening Ports
```powershell
netstat -an | Select-String ":502" | Select-String "LISTEN"
netstat -an | Select-String ":3001" | Select-String "LISTEN"
```

### View Simulator Logs
The terminal running `npm run dev` shows all activity:
- Client connections
- Modbus requests
- Register reads/writes
- Errors

---

## 📞 Support Information

### Simulator Details
- **Project**: Fronius Gen24 Modbus TCP Simulator
- **Protocol**: Modbus TCP (SunSpec)
- **Base Address**: 40001 (Modbus addressing)
- **Register Count**: 239 registers
- **Supported Function Codes**: 0x03 (Read), 0x06 (Write Single), 0x10 (Write Multiple)

### Key Register Addresses
| Address | Name | Description | Access |
|---------|------|-------------|--------|
| 40001-40002 | SID | SunSpec ID ("SunS") | Read |
| 40005-40020 | Mn | Manufacturer | Read |
| 40021-40036 | Md | Model | Read |
| 40072 | A | AC Current (SF) | Read |
| 40074-40076 | PhVphA/B/C | AC Voltage | Read |
| 40084 | W | AC Power (SF) | Read |
| 40094 | Hz | Frequency (SF) | Read |
| 40108 | St | Operating State | Read |
| 40123 | DCA_1 | DC Current String 1 | Read |
| 40124 | DCV_1 | DC Voltage String 1 | Read |
| 40125 | DCW_1 | DC Power String 1 | Read |

---

## ✅ Success Checklist

Before contacting EDMM-20:
- [ ] Simulator backend is running (`npm run dev`)
- [ ] Clicked **START** button in Web UI
- [ ] Modbus server shows `isRunning: True`
- [ ] IP address is `192.168.178.155`
- [ ] Port 502 is accessible (test with `Test-NetConnection`)
- [ ] Firewall allows port 502
- [ ] EDMM-20 is on same network (192.168.178.XXX)
- [ ] Test script succeeds: `node test-modbus-client.js`

---

## 🎯 Quick Start Command

```powershell
# One command to verify everything
Write-Host "`n=== Fronius Simulator Status ===`n" -ForegroundColor Cyan
$status = Invoke-RestMethod -Uri "http://localhost:3001/api/simulator/status"
Write-Host "Simulator Running: $($status.running)" -ForegroundColor $(if($status.running){'Green'}else{'Red'})
Write-Host "Modbus Running: $($status.modbus.isRunning)" -ForegroundColor $(if($status.modbus.isRunning){'Green'}else{'Red'})
Write-Host "IP Address: 192.168.178.155" -ForegroundColor Green
Write-Host "Port: $($status.modbus.port)" -ForegroundColor Green
Write-Host "Device ID: $($status.modbus.deviceId)" -ForegroundColor Green
Write-Host "`nUse this in EDMM-20:" -ForegroundColor Yellow
Write-Host "  IP: 192.168.178.155" -ForegroundColor White
Write-Host "  Port: 502" -ForegroundColor White
Write-Host "  Unit ID: 1`n" -ForegroundColor White
```

---

**Last Updated**: January 5, 2026  
**Simulator Version**: 1.0.0  
**Network**: 192.168.178.XXX


