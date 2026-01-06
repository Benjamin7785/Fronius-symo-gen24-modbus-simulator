# EDMM-20 Connection Diagnostic
# Analyzes what the EDMM-20 is doing

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  EDMM-20 Connection Analysis" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Get simulator status
$status = Invoke-RestMethod -Uri "http://localhost:3001/api/simulator/status"

Write-Host "Simulator Status:" -ForegroundColor Green
Write-Host "  Running:        $($status.running)" -ForegroundColor White
Write-Host "  Modbus Active:  $($status.modbus.isRunning)" -ForegroundColor White
Write-Host "  Client Count:   $($status.modbus.clientCount)" -ForegroundColor White

if ($status.modbus.clientCount -gt 0) {
    Write-Host "`n✅ EDMM-20 IS CONNECTED!" -ForegroundColor Green
    Write-Host "   The EDMM-20 has an active Modbus connection." -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  No active Modbus clients" -ForegroundColor Yellow
    Write-Host "   EDMM-20 may not be scanning or connection dropped." -ForegroundColor Cyan
}

# Check what register 40132 contains (the one being polled repeatedly)
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Register 40132 (Being Polled):" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$reg = Invoke-RestMethod -Uri "http://localhost:3001/api/registers/40132"
Write-Host "  Name:        $($reg.name)" -ForegroundColor White
Write-Host "  Description: $($reg.description)" -ForegroundColor White
Write-Host "  Value:       $($reg.value)" -ForegroundColor White
Write-Host "  Type:        $($reg.type)" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Possible Issues:" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. EDMM-20 might have DISCOVERED the device successfully" -ForegroundColor Green
Write-Host "   but is now stuck polling register 40132." -ForegroundColor White
Write-Host "`n2. Check EDMM-20 interface:" -ForegroundColor Yellow
Write-Host "   - Does it show 'Fronius' in the device list?" -ForegroundColor White
Write-Host "   - Is the device status 'Online' or 'Offline'?" -ForegroundColor White
Write-Host "   - Are there any error messages?" -ForegroundColor White

Write-Host "`n3. The repeated polling of register 40132 suggests:" -ForegroundColor Yellow
Write-Host "   - Device was found during scan" -ForegroundColor Green
Write-Host "   - EDMM-20 is now trying to read live data" -ForegroundColor Green
Write-Host "   - But may be waiting for a specific value" -ForegroundColor Yellow

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Recommendation:" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Please check your EDMM-20 web interface:" -ForegroundColor Cyan
Write-Host "  1. Go to Device List or Configuration" -ForegroundColor White
Write-Host "  2. Look for 'Fronius' or 'Symo GEN24'" -ForegroundColor White
Write-Host "  3. Check device status" -ForegroundColor White
Write-Host "  4. Take a screenshot if possible`n" -ForegroundColor White

Write-Host "If device appears but shows 'Offline' or 'Error':" -ForegroundColor Yellow
Write-Host "  - Check EDMM-20 logs for specific error messages" -ForegroundColor White
Write-Host "  - The device may be discovered but not fully initialized" -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan


