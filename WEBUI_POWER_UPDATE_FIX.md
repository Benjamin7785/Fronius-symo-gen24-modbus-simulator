# Web UI Power Update Fix

## Problem
The Web UI "Current Power" value was not updating in real-time. It only showed a value after clicking Reset, but then stopped updating.

## Root Cause
The `handlePowerUpdate` function in `SimulatorControl.jsx` was only updating the `targetPower` state, but not the `status.power` object that contains `currentPower`, `totalEnergy`, and `efficiency`.

## Solution Applied

### 1. Fixed Power Update Handler
**File**: `frontend/src/components/SimulatorControl.jsx`

```javascript
const handlePowerUpdate = (data) => {
  console.log('Power update received:', data);
  
  // Update power values
  if (data.targetPower !== undefined) {
    setPowerValue(data.targetPower);
    setTargetPower(data.targetPower);
  }
  
  // Update status with new power data
  setStatus(prevStatus => {
    if (!prevStatus) return prevStatus;
    return {
      ...prevStatus,
      power: data
    };
  });
};
```

### 2. Added Real-Time Power Events
**File**: `backend/src/simulation/pvGenerator.js`

- Made `PVGenerator` extend `EventEmitter`
- Added `powerUpdated` event emission in the `update()` loop
- Events are emitted every second with current power status

### 3. Connected Events to WebSocket
**File**: `backend/src/simulation/simulator.js`

```javascript
this.pvGenerator.on('powerUpdated', (powerStatus) => {
  this.emit('powerChanged', powerStatus);
});
```

### 4. Enhanced Debugging
**File**: `frontend/src/services/websocket.js`

Added console logging for all WebSocket events:
- ✅ Connection status
- 📊 Status updates
- ⚡ Power updates
- 📝 Register changes

## How to Verify

1. Open Web UI: http://localhost:3000
2. Open Browser DevTools (F12) → Console tab
3. Click START button
4. Move the power slider
5. Watch the console for:
   - `⚡ Power update received:` messages every second
   - `Power update received:` in SimulatorControl
6. Watch the UI for "Current Power" updating smoothly

## Expected Behavior

- **Target Power**: Changes instantly when slider is moved
- **Current Power**: Smoothly ramps to target at 10% per second
- **Total Energy**: Accumulates over time (kWh)
- **Efficiency**: Shows constant 97%

## Technical Details

### Power Ramping
The simulator uses exponential smoothing with a factor of 0.1:
```
currentPower = currentPower + 0.1 * (targetPower - currentPower)
```

This means the power reaches ~63% of target in 10 seconds, ~95% in 30 seconds.

### WebSocket Flow
1. PVGenerator updates every 1 second
2. Emits `powerUpdated` event with power status
3. Simulator forwards as `powerChanged` event
4. WebSocket broadcasts to all connected clients
5. Frontend receives on `power` channel
6. Updates UI state

## Files Modified

- `frontend/src/components/SimulatorControl.jsx` - Fixed power update handler
- `frontend/src/services/websocket.js` - Added debugging logs
- `backend/src/simulation/pvGenerator.js` - Added EventEmitter and powerUpdated event
- `backend/src/simulation/simulator.js` - Connected PVGenerator events to WebSocket

