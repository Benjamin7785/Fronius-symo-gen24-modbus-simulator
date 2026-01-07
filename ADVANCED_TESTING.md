# Advanced Testing Mode - Manual Register Override Guide

## Overview

Version 1.3 introduces **Advanced Testing Mode**, allowing you to manually override any register value, including normally read-only registers that are auto-calculated by the simulator. This feature is designed for advanced testing scenarios where you need to:

- Test how the EDMM-20 responds to unexpected or out-of-range values
- Freeze specific register values while changing others
- Simulate device states that are difficult to reproduce naturally
- Test edge cases and error handling in connected devices

## Warning

⚠️ **Use with Caution**: This mode bypasses normal validation and physical consistency checks. Manually overridden values may:
- Cause the EDMM-20 to display errors or disconnect
- Result in physically impossible combinations (e.g., P > S, voltage out of grid range)
- Confuse monitoring systems that expect consistent electrical relationships

## How It Works

### Concept: Manual Override (Frozen Register)

When you manually override a register:
1. The value is immediately set to your specified value
2. The register is **frozen** from automatic updates
3. The simulator's auto-calculation engine skips this register
4. The value persists until you explicitly clear the override or restart the simulator

### What Gets Frozen

- **Via Web UI Force Write**: Only the specific register you manually set
- **Via EDMM-20 Modbus Write**: Any register the EDMM-20 writes to (including power limits, enable flags, etc.)

This means EDMM-20 control commands now "stick" instead of being overwritten by auto-calculation.

## Using Advanced Testing Mode

### Method 1: Web UI - Right-Click Context Menu

1. **Navigate to Register Browser**: Open the web UI at `http://localhost:3000`
2. **Find the Register**: Use search or browse to find the register you want to override
3. **Right-Click**: Right-click on the register row to open the context menu
4. **Select "Force Write Value... (Advanced)"**
5. **Enter Value**: 
   - A warning dialog appears explaining the register will be frozen
   - Enter your desired value (integer, no validation)
   - Click "Save"

**Visual Indicators**:
- Overridden registers have a **yellow/amber background**
- A lock icon (🔒) appears next to the register name
- A reset button (↻) appears in the Actions column

### Method 2: Web UI - Reset Individual Override

To resume auto-calculation for a specific register:
1. **Locate the overridden register** (look for yellow background and lock icon)
2. **Click the Reset button** (↻) in the Actions column
3. The register immediately resumes normal auto-calculation

### Method 3: Web UI - Reset All Overrides

When multiple registers are overridden:
1. A **yellow warning banner** appears at the top of Simulator Control
2. Shows count: "3 registers manually overridden (frozen from auto-calculation)"
3. Click **"Reset All Overrides"** button
4. Confirm the dialog
5. All registers resume normal auto-calculation

### Method 4: EDMM-20 Modbus Writes

**New Behavior in v1.3**: When EDMM-20 writes to any register via Modbus:
- The value is set AND the register is frozen
- Allows testing scenarios where EDMM-20 control commands persist
- Example: Setting power limit via 40233 now stays at that value instead of being overwritten

**To clear**: Use the Web UI reset buttons or API endpoints.

## Common Testing Scenarios

### Scenario 1: Test EDMM-20 Response to Over-Voltage

**Goal**: See how EDMM-20 handles voltage above grid limits.

**Steps**:
1. Start simulator and set power to 5000W
2. Right-click on register `40080` (PhVphA - AC Voltage Phase A)
3. Force write value: `2800` (280V with SF=-1, way above 230V nominal)
4. Observe EDMM-20 display - may show warnings or errors

**Expected**: EDMM-20 may show grid voltage alarm.

### Scenario 2: Test State Machine with Frozen Operating State

**Goal**: Keep inverter state as "MPPT" while power drops to zero.

**Steps**:
1. Start simulator and set power to 5000W
2. Right-click on register `40072` (St - Operating State)
3. Force write value: `4` (MPPT/Running)
4. Move power slider to 0W
5. Observe: Operating state stays at "4" (MPPT) even though power is 0W

**Expected**: Tests if EDMM-20 properly handles state/power mismatches.

### Scenario 3: Test Power Triangle Inconsistency

**Goal**: Create P > S (Active Power > Apparent Power), which is physically impossible.

**Steps**:
1. Set power to 5000W (auto-calculates S=5050VA, P=5000W with PF=0.99)
2. Right-click on register `40088` (VA - Apparent Power)
3. Force write value: `3000` (3000VA, now less than 5000W!)
4. Observe EDMM-20 calculations and display

**Expected**: EDMM-20 may recalculate power factor or show errors.

### Scenario 4: Test DC/AC Power Mismatch

**Goal**: Set AC power higher than DC power (violates energy conservation).

**Steps**:
1. Set power to 5000W
2. Right-click on register `40102` (DCW - DC Power)
3. Force write value: `3000` (3000W DC, but 5000W AC!)
4. Observe if EDMM-20 detects impossible efficiency > 100%

**Expected**: Tests EDMM-20 validation of energy balance.

### Scenario 5: Test Zero Frequency

**Goal**: Simulate grid frequency failure.

**Steps**:
1. Start simulator with power output
2. Right-click on register `40086` (Hz - Grid Frequency)
3. Force write value: `0` (0Hz, grid failure)
4. Observe EDMM-20 response

**Expected**: EDMM-20 should show "Warte auf EVU" or similar grid error.

## API Endpoints

For automation and scripting:

### Force Write (Create Override)
```bash
curl -X PUT http://localhost:3001/api/registers/40080/override \
  -H "Content-Type: application/json" \
  -d '{"values": [2800]}'
```

### Clear Single Override
```bash
curl -X DELETE http://localhost:3001/api/registers/40080/override
```

### Clear All Overrides
```bash
curl -X DELETE http://localhost:3001/api/registers/overrides
```

### Get List of Overridden Registers
```bash
curl http://localhost:3001/api/registers/overrides
```

**Response**:
```json
{
  "overrides": [
    {
      "address": 40080,
      "name": "PhVphA",
      "value": 2800,
      "scaledValue": 280.0
    }
  ]
}
```

## Scale Factors and Overrides

**Important**: When force-writing values, you must provide the **raw integer value** that includes the scale factor.

Examples:
- **Voltage** (SF=-1, 0.1V resolution): To set 280V, write `2800`
- **Current** (SF=-2, 0.01A resolution): To set 50.5A, write `5050`
- **Power** (SF=0, 1W resolution): To set 5000W, write `5000`
- **Frequency** (SF=-2, 0.01Hz resolution): To set 50.00Hz, write `5000`

## Troubleshooting

### EDMM-20 Disconnects After Override

**Cause**: Value is out of acceptable range for EDMM-20.

**Solution**: 
- Check EDMM-20 documentation for acceptable ranges
- Reset the override to resume normal values
- Try a less extreme value

### Register Value Doesn't Change

**Cause**: May be writing to wrong register or value is already set.

**Solution**:
- Verify register address
- Check current value before overriding
- Watch for WebSocket updates confirming the change

### "Register not found" Error

**Cause**: Invalid register address.

**Solution**:
- Use addresses 40001-40400 (Modbus holding registers)
- Check Register Browser for valid addresses

### Can't Clear Override

**Cause**: WebSocket connection issue or server error.

**Solution**:
- Check browser console for errors
- Restart simulator to clear all overrides
- Use API endpoint directly with curl

## Best Practices

1. **Document Your Test**: Before overriding, note the original auto-calculated value
2. **One Variable at a Time**: Override one register to isolate effects
3. **Reset Between Tests**: Clear all overrides before starting a new test scenario
4. **Watch EDMM-20 Logs**: Monitor EDMM-20 behavior and log any errors
5. **Physical Consistency**: Remember power triangle: P² + Q² = S²
6. **Three-Phase Balance**: When testing phase values, consider symmetry

## Limitations

- **No validation**: You can set any value, even if it causes device errors
- **No auto-consistency**: Overriding voltage doesn't adjust current, etc.
- **Persists until cleared**: Overrides remain even when power slider changes
- **Scale factors manual**: You must calculate scaled values yourself
- **32-bit registers**: Overriding one half doesn't update the other (e.g., WH energy counter)

## Safety Notes

- **Test Environment Only**: This feature is for testing and development
- **Not for Production**: Don't use manual overrides in production monitoring
- **EDMM-20 Safety**: The EDMM-20 may implement safety disconnects if values are too extreme
- **Data Integrity**: Overridden values don't represent real inverter behavior

## Resetting the Simulator

If you get into an inconsistent state:

1. **Stop the Simulator**: Click "Stop" button
2. **Click "Reset All Overrides"**: Clears all frozen registers
3. **Start the Simulator**: Click "Start" button
4. All registers return to normal auto-calculated values

Alternatively, restart the entire Node.js process:
```batch
Stop.bat
Start.bat
```

## Version Information

- **Introduced**: v1.3
- **Affects**: All register addresses (40001-40400)
- **Compatibility**: EDMM-20, modpoll, and any Modbus TCP client

## Support

For issues or questions:
- Check GitHub repository issues
- Review VERSION.md for known limitations
- See QUICKSTART.md for basic simulator usage

---

**Remember**: With great power comes great responsibility. Manual overrides can create physically impossible states. Use them wisely for testing, not for learning how real inverters work!

