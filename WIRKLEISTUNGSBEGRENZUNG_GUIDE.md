# Wirkleistungsbegrenzung (Active Power Limitation) - EDMM-20 Integration

## Overview
"Wirkleistungsbegrenzung" is the active power limitation feature that allows the EDMM-20 to control the inverter's power output as a percentage of maximum power (WMax).

## Key Registers

### Control Registers (EDMM-20 → Inverter)

| Register | Name | Type | Description | Range |
|----------|------|------|-------------|-------|
| **40233** | WMaxLimPct | RW | Power output limit (% of WMax) | 0-100% |
| **40234** | WMaxLimPct_WinTms | RW | Time window for power limit change | 0-300 seconds |
| **40235** | WMaxLimPct_RvrtTms | RW | Timeout period for power limit | 0-28800 seconds |
| **40236** | WMaxLimPct_RmpTms | RW | Ramp time for setpoint change | 0-65534 seconds |
| **40237** | WMaxLim_Ena | RW | Enable/disable throttle control | 0=Disabled, 1=Enabled |

### Feedback Registers (Inverter → EDMM-20)

| Register | Name | Type | Description |
|----------|------|------|-------------|
| **40233** | WMaxLimPct | RW | **Current power limit** - EDMM-20 reads this! |
| **40251** | WMaxLimPct_SF | R | Scale factor (always -2 = 0.01) |

## How It Works

### 1. EDMM-20 Sends Command
The EDMM-20 writes to register **40233** to set a power limitation:
- Example: Write `10000` (with SF=-2) = 100.00% = No limitation
- Example: Write `7000` (with SF=-2) = 70.00% = Limit to 70% of WMax
- Example: Write `5000` (with SF=-2) = 50.00% = Limit to 50% of WMax

### 2. Inverter Responds
The inverter:
- Applies the power limitation
- Updates register **40233** to reflect the **actual current limitation**
- EDMM-20 reads **40233** to display the current "Wirkleistungsbegrenzung"

### 3. EDMM-20 UI Display
When EDMM-20 reads register 40233:
- Value `10000` (100%) → Shows "100% Wirkleistungsbegrenzung" or no limitation
- Value `7000` (70%) → Shows "70% Wirkleistungsbegrenzung"
- Value `5000` (50%) → Shows "50% Wirkleistungsbegrenzung"

## Implementation in Simulator

### Current Status
- **40233 (WMaxLimPct)**: Currently `0` (not initialized)
- **40237 (WMaxLim_Ena)**: Currently `0` (Disabled)
- **40251 (WMaxLimPct_SF)**: Set to `-2` (0.01 scale)

### What Needs to Be Done

1. **Initialize WMaxLimPct to 100%**
   - Set register 40233 = `10000` (100.00% with SF=-2)
   - This tells EDMM-20 "no power limitation active"

2. **Implement Feedback Mechanism**
   - When EDMM-20 writes to 40233, the simulator should:
     - Apply the power limitation to actual power output
     - Keep 40233 updated with the current limit
     - Update actual power (register 40084) accordingly

3. **Enable the Feature** (Optional)
   - Set register 40237 (WMaxLim_Ena) = `1` (Enabled)
   - This allows EDMM-20 to control power limitation

## Example Scenario

### Scenario: EDMM-20 Limits Power to 70%

1. **Initial State**:
   - WMax = 10000W (10kW inverter)
   - WMaxLimPct = 10000 (100%)
   - Actual Power = 5000W

2. **EDMM-20 Sends Command**:
   - Writes `7000` to register 40233
   - Meaning: "Limit power to 70% of WMax"

3. **Simulator Response**:
   - Calculates: 10000W × 70% = 7000W max
   - If current power > 7000W, reduce to 7000W
   - Update register 40233 = `7000` (feedback)
   - Update register 40084 (W) with limited power

4. **EDMM-20 Reads Back**:
   - Reads register 40233 → Gets `7000`
   - Displays: "70% Wirkleistungsbegrenzung"

## Testing with Register Browser

### To Set Power Limitation Manually:

1. **Open Web UI** → Register Browser
2. **Click "Writable" tab**
3. **Find register 40233 (WMaxLimPct)**
4. **Click Edit**
5. **Enter value**:
   - `10000` = 100% (no limitation)
   - `7000` = 70% limitation
   - `5000` = 50% limitation
6. **Click Save**
7. **Check EDMM-20** - should show the percentage

### To Enable/Disable Feature:

1. **Find register 40237 (WMaxLim_Ena)**
2. **Click Edit**
3. **Select from dropdown**:
   - `0: Disabled`
   - `1: Enabled`
4. **Click Save**

## Related Registers

- **40152 (WMax)**: Maximum power rating (e.g., 10000W for 10kW inverter)
- **40084 (W)**: Actual AC power output (should respect WMaxLimPct)
- **40233 (WMaxLimPct)**: Power limitation percentage (0-100%)

## Notes

- **Scale Factor**: WMaxLimPct uses SF=-2, so value `10000` = 100.00%
- **Bidirectional**: Register 40233 is both command (write) and feedback (read)
- **Real-time**: EDMM-20 continuously reads 40233 to display current limitation
- **Priority**: Power limitation takes precedence over user slider setting

