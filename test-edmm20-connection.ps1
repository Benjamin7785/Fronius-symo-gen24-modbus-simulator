# EDMM-20 Connection Test Script
# Tests all aspects of Modbus connectivity for EDMM-20 discovery

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "EDMM-20 Connection Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get local IP
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress

Write-Host "1. Network Configuration" -ForegroundColor Yellow
Write-Host "   Local IP: $localIP" -ForegroundColor Green
Write-Host "   Modbus Port: 502"
Write-Host "   Device ID: 1`n"

# Test 1: Check if simulator is running
Write-Host "2. Checking Simulator Status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:3001/api/simulator/status" -ErrorAction Stop
    if ($status.running) {
        Write-Host "   ✓ Simulator is RUNNING" -ForegroundColor Green
        Write-Host "   ✓ Modbus server listening on port $($status.modbus.port)" -ForegroundColor Green
        Write-Host "   ✓ Device ID: $($status.modbus.deviceId)" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Simulator is NOT running! Click START in Web UI!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ✗ Cannot connect to simulator API" -ForegroundColor Red
    Write-Host "   Make sure the simulator is running: npm run dev" -ForegroundColor Red
    exit 1
}

# Test 2: Check port accessibility
Write-Host "`n3. Testing Port 502 Accessibility..." -ForegroundColor Yellow
$portTest = Test-NetConnection -ComputerName localhost -Port 502 -WarningAction SilentlyContinue
if ($portTest.TcpTestSucceeded) {
    Write-Host "   ✓ Port 502 is accessible on localhost" -ForegroundColor Green
} else {
    Write-Host "   ✗ Port 502 is NOT accessible!" -ForegroundColor Red
    Write-Host "   Check if Modbus server started (click START button)" -ForegroundColor Red
}

# Test 3: Check firewall rules
Write-Host "`n4. Checking Firewall Rules..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Modbus TCP" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "   ✓ Firewall rule 'Modbus TCP' exists" -ForegroundColor Green
    if ($firewallRule.Enabled -eq $true) {
        Write-Host "   ✓ Firewall rule is ENABLED" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Firewall rule is DISABLED" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠ No firewall rule found for Modbus TCP" -ForegroundColor Yellow
    Write-Host "   Creating firewall rule..." -ForegroundColor Cyan
    try {
        New-NetFirewallRule -DisplayName "Modbus TCP" -Direction Inbound -LocalPort 502 -Protocol TCP -Action Allow -ErrorAction Stop
        Write-Host "   ✓ Firewall rule created!" -ForegroundColor Green
    } catch {
        Write-Host "   ✗ Failed to create firewall rule (need Administrator)" -ForegroundColor Red
        Write-Host "   Run this script as Administrator or manually allow port 502" -ForegroundColor Yellow
    }
}

# Test 4: Check SunSpec ID registers
Write-Host "`n5. Checking SunSpec ID..." -ForegroundColor Yellow
try {
    $reg1 = Invoke-RestMethod -Uri "http://localhost:3001/api/registers/40001?count=2" -ErrorAction Stop
    $val1 = $reg1.values[0]
    $val2 = $reg1.values[1]
    
    Write-Host "   Register 40001: $val1 (0x$($val1.ToString('X4')))" -ForegroundColor Cyan
    Write-Host "   Register 40002: $val2 (0x$($val2.ToString('X4')))" -ForegroundColor Cyan
    
    if ($val1 -eq 21365 -and $val2 -eq 28243) {
        Write-Host "   ✓ SunSpec ID is CORRECT: 0x53756E53 ('SunS')" -ForegroundColor Green
    } else {
        Write-Host "   ✗ SunSpec ID is INCORRECT!" -ForegroundColor Red
        Write-Host "   Expected: 0x5375 0x6E53, Got: 0x$($val1.ToString('X4')) 0x$($val2.ToString('X4'))" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Failed to read SunSpec ID" -ForegroundColor Red
}

# Test 5: Test Modbus connection with Node.js client
Write-Host "`n6. Testing Modbus TCP Communication..." -ForegroundColor Yellow
if (Test-Path "test-modbus-client.js") {
    Write-Host "   Running Modbus test client..." -ForegroundColor Cyan
    node test-modbus-client.js 2>&1 | Select-String -Pattern "Connected|Exception|Error" | ForEach-Object {
        if ($_ -match "Connected") {
            Write-Host "   ✓ $_" -ForegroundColor Green
        } elseif ($_ -match "Exception|Error") {
            Write-Host "   ✗ $_" -ForegroundColor Red
        } else {
            Write-Host "   $_" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "   ⚠ test-modbus-client.js not found, skipping Modbus test" -ForegroundColor Yellow
}

# Summary and recommendations
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "EDMM-20 Configuration Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Use these settings in your EDMM-20:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Schnittstelle:   Ethernet Modbus TCP" -ForegroundColor White
Write-Host "  Modbus-Profil:   SunSpec" -ForegroundColor White
Write-Host "  IP-Adresse:      $localIP" -ForegroundColor Green -NoNewline
Write-Host " ← USE THIS IP!" -ForegroundColor Red
Write-Host "  Port:            502" -ForegroundColor White
Write-Host "  Unit ID:         1" -ForegroundColor White
Write-Host "  Gerätename:      Fronius Symo GEN24 10.0" -ForegroundColor White
Write-Host ""

# Additional troubleshooting
Write-Host "If EDMM-20 still can't discover:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Ensure EDMM-20 is on the same network" -ForegroundColor Cyan
Write-Host "     - EDMM-20 IP should be 10.245.183.x" -ForegroundColor Cyan
Write-Host "     - Ping test: ping $localIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Wait 10-30 seconds after clicking START" -ForegroundColor Cyan
Write-Host "     - The Modbus server takes a moment to initialize" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Try scanning multiple times in EDMM-20" -ForegroundColor Cyan
Write-Host "     - Sometimes the first scan fails" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Check EDMM-20 logs for error messages" -ForegroundColor Cyan
Write-Host "     - Look for connection errors or timeout messages" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================`n" -ForegroundColor Cyan


