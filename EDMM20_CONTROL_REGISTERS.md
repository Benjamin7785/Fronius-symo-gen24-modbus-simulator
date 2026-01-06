# EDMM-20 Control Registers - Troubleshooting Guide

## Problem
EDMM-20 still shows "Warte auf EVU" (Waiting for Utility) despite:
- ✅ Grid voltage present (~230V)
- ✅ Grid frequency present (~50Hz)
- ✅ Connection status = 1 (Connected)
- ✅ Operating state = 4/8 (MPPT/Standby)

## Potential Root Cause
The EDMM-20 might be waiting for the inverter to enable its control functions. Several "enable" registers are currently set to 0 (Disabled).

## Critical Control Registers to Check

### 1. Connection Control (40232 - Conn)
- **Current Value**: 1 (Connected) ✅
- **Description**: Grid connection control
- **Values**: 0 = Disconnected, 1 = Connected
- **Status**: CORRECT

### 2. Power Limit Enable (40237 - WMaxLim_Ena)
- **Current Value**: 0 (Disabled) ⚠️
- **Description**: Throttle enable/disable control
- **Values**: 0 = Disabled, 1 = Enabled
- **Action**: Try setting to 1 (Enabled)

### 3. Power Factor Enable (40242 - OutPFSet_Ena)
- **Current Value**: Unknown
- **Description**: Fixed power factor enable/disable
- **Values**: 0 = Disabled, 1 = Enabled
- **Action**: Check and possibly enable

### 4. VAr Control Enable (40250 - VArPct_Ena)
- **Current Value**: Unknown
- **Description**: Percent limit VAr enable/disable
- **Values**: 0 = Disabled, 1 = Enabled
- **Action**: Check and possibly enable

## How to Test Using Register Browser

1. **Open Web UI**: http://localhost:3000
2. **Go to "Register Browser" section**
3. **Click "Writable" tab** - shows only writable registers
4. **Find register 40237 (WMaxLim_Ena)**
5. **Click Edit button** (pencil icon)
6. **Use dropdown to select**: "1: Enabled"
7. **Click Save**
8. **Check EDMM-20** - see if status changes

## Other Registers to Verify

### Grid Parameters (Read-Only, but verify values)
- **40086 (Hz)**: Should be ~5000 (50.00 Hz with scale factor -2)
- **40080 (PhVphA)**: Should be ~23000 (230V with scale factor -2)

### Operating State (Read-Only)
- **40108 (St)**: 
  - 1 = OFF
  - 2 = SLEEPING
  - 3 = STARTING
  - 4 = MPPT (Normal operation)
  - 5 = THROTTLED
  - 8 = STANDBY

## New Feature: Dropdown for Enum Registers

The Register Browser now shows:
- **Dropdown/Select** for registers with predefined values (enums)
- **Text Field** for numeric ranges
- **Range display** showing valid values

### Example Registers with Dropdowns:
- 40232 (Conn): 0=Disconnected, 1=Connected
- 40237 (WMaxLim_Ena): 0=Disabled, 1=Enabled
- 40242 (OutPFSet_Ena): 0=Disabled, 1=Enabled
- 40250 (VArPct_Ena): 0=Disabled, 1=Enabled

## Recommended Testing Sequence

1. **Enable WMaxLim_Ena** (40237) → Set to 1
2. **Check EDMM-20** → Still waiting?
3. **Enable OutPFSet_Ena** (40242) → Set to 1
4. **Check EDMM-20** → Still waiting?
5. **Enable VArPct_Ena** (40250) → Set to 1
6. **Check EDMM-20** → Observe changes

## Technical Notes

### Why These Registers Matter
EDMM-20 is an energy manager that needs to control the inverter. It might be checking:
- Can it throttle power? (WMaxLim_Ena)
- Can it control power factor? (OutPFSet_Ena)
- Can it control reactive power? (VArPct_Ena)

If all these are disabled, EDMM-20 might consider the inverter "not ready for grid operation" and show "Warte auf EVU".

### SunSpec Compliance
Real Fronius inverters might initialize these enables based on:
- Grid code settings
- Country-specific requirements
- Commissioning status

The simulator defaults all to 0 (disabled), which might not match EDMM-20's expectations.

