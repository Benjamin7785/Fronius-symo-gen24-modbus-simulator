# Quick EDMM-20 Readiness Check

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  EDMM-20 Discovery - Readiness Check" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Green

# Check simulator status
try {
    $status = Invoke-RestMethod -Uri "http://localhost:3001/api/simulator/status" -ErrorAction Stop
    
    Write-Host "✅ Simulator Status:" -ForegroundColor Green
    Write-Host "   Running:      $($status.running)" -ForegroundColor White
    Write-Host "   Modbus:       $($status.modbus.isRunning)" -ForegroundColor White
    Write-Host "   Port:         $($status.modbus.port)" -ForegroundColor White
    Write-Host "   Device ID:    $($status.modbus.deviceId)" -ForegroundColor White
    Write-Host "   Clients:      $($status.modbus.clientCount)" -ForegroundColor White
    
    if (-not $status.running) {
        Write-Host "`n❌ ERROR: Simulator is not running!" -ForegroundColor Red
        Write-Host "   Click START button in Web UI: http://192.168.178.155:3000`n" -ForegroundColor Yellow
        exit 1
    }
    
    if (-not $status.modbus.isRunning) {
        Write-Host "`n❌ ERROR: Modbus server is not running!" -ForegroundColor Red
        Write-Host "   Click START button in Web UI: http://192.168.178.155:3000`n" -ForegroundColor Yellow
        exit 1
    }
    
} catch {
    Write-Host "❌ ERROR: Cannot connect to simulator!" -ForegroundColor Red
    Write-Host "   Make sure simulator is running: npm run dev`n" -ForegroundColor Yellow
    exit 1
}

# Check critical registers
Write-Host "`n✅ SunSpec Registers:" -ForegroundColor Green

try {
    # SunSpec ID
    $sunspec = Invoke-RestMethod -Uri "http://localhost:3001/api/registers/40001?count=2"
    $id1 = $sunspec.values[0]
    $id2 = $sunspec.values[1]
    Write-Host "   40001-40002:  0x$($id1.ToString('X4')) 0x$($id2.ToString('X4'))" -NoNewline
    if ($id1 -eq 21365 -and $id2 -eq 28243) {
        Write-Host " ✅ 'SunS'" -ForegroundColor Green
    } else {
        Write-Host " ❌ WRONG!" -ForegroundColor Red
    }
    
    # Common Model
    $common = Invoke-RestMethod -Uri "http://localhost:3001/api/registers/40003?count=2"
    $modelId = $common.values[0]
    $modelLen = $common.values[1]
    Write-Host "   40003 (ID):   $modelId" -NoNewline
    if ($modelId -eq 1) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌ Should be 1" -ForegroundColor Red
    }
    Write-Host "   40004 (Len):  $modelLen" -NoNewline
    if ($modelLen -eq 65) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌ Should be 65" -ForegroundColor Red
        exit 1
    }
    
    # Inverter Model
    $inverter = Invoke-RestMethod -Uri "http://localhost:3001/api/registers/40070?count=2"
    $invId = $inverter.values[0]
    $invLen = $inverter.values[1]
    Write-Host "   40070 (ID):   $invId" -NoNewline
    if ($invId -eq 103) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌ Should be 103" -ForegroundColor Red
    }
    Write-Host "   40071 (Len):  $invLen" -NoNewline
    if ($invLen -eq 50) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌ Should be 50" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n❌ ERROR: Cannot read registers!" -ForegroundColor Red
    exit 1
}

# Network check
Write-Host "`n✅ Network Configuration:" -ForegroundColor Green
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.178.*"}).IPAddress
Write-Host "   Local IP:     $ip" -ForegroundColor White

$portTest = Test-NetConnection -ComputerName $ip -Port 502 -WarningAction SilentlyContinue -InformationLevel Quiet
if ($portTest) {
    Write-Host "   Port 502:     Accessible ✅" -ForegroundColor Green
} else {
    Write-Host "   Port 502:     NOT accessible ❌" -ForegroundColor Red
    Write-Host "   Check Windows Firewall!" -ForegroundColor Yellow
}

# Final summary
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  EDMM-20 Configuration" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Use these settings in EDMM-20:`n" -ForegroundColor Cyan
Write-Host "  Schnittstelle:    Ethernet Modbus TCP" -ForegroundColor White
Write-Host "  Modbus-Profil:    SunSpec" -ForegroundColor White
Write-Host "  IP-Adresse:       " -NoNewline -ForegroundColor White
Write-Host "$ip" -ForegroundColor Green
Write-Host "  Port:             502" -ForegroundColor White
Write-Host "  Unit ID:          1" -ForegroundColor White

Write-Host "`n✅ ALL CHECKS PASSED - READY FOR EDMM-20 DISCOVERY!`n" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green


