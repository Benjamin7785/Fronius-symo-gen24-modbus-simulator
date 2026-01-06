# Voltage Scaling Fix - Version 1.1.1

## Problem

EDMM-20 was displaying AC voltages with incorrect scaling:
- **Phase voltage**: Showed **2.309,60 V** instead of **230,96 V** (10x too high!)
- **Line-to-line voltage**: Showed **4.000,30 V** instead of **400,03 V** (10x too high!)

Standard grid voltage in Europe: **230/400 V**

## Root Cause

Mismatch between scale factor definition and value storage:

**In [`backend/src/parser/registerDefinitions.js`](backend/src/parser/registerDefinitions.js):**
```javascript
// V_SF (40083) - AC Voltage scale factor
else if (reg.address === 40083 && reg.name === 'V_SF') {
  reg.value = convertToInt16(-1); // -1 means multiply by 0.1
}
```

**In [`backend/src/simulation/pvGenerator.js`](backend/src/simulation/pvGenerator.js) (OLD):**
```javascript
// Update AC Voltage (V) - SF=-2 (0.01 scale)  ❌ WRONG!
const voltageSF = -2;
const voltageScaleFactor = Math.pow(10, -voltageSF); // 100
```

### The Problem:
- V_SF register said: "Divide by 10" (SF = -1)
- But we stored: 230 V × 100 = 23000
- EDMM-20 calculated: 23000 ÷ 10 = **2300 V** ❌

## Solution

Changed voltage scale factor in [`backend/src/simulation/pvGenerator.js`](backend/src/simulation/pvGenerator.js) to match the V_SF register:

### Fix 1: updateRegisters() method

**Before:**
```javascript
// Update AC Voltage (V) - SF=-2 (0.01 scale)
const voltageSF = -2;
const voltageScaleFactor = Math.pow(10, -voltageSF);
```

**After:**
```javascript
// Update AC Voltage (V) - SF=-1 (0.1 scale) to match V_SF register
const voltageSF = -1;
const voltageScaleFactor = Math.pow(10, -voltageSF);
```

### Fix 2: updateGridParameters() method

**Before:**
```javascript
// Scale factor is -2 for voltage and frequency (0.01 scale)
const SF = -2;
const scaleFactor = Math.pow(10, -SF);
```

**After:**
```javascript
// Voltage scale factor is -1 (0.1 scale) to match V_SF register
const voltageSF = -1;
const voltageScaleFactor = Math.pow(10, -voltageSF);

// Frequency scale factor is -2 (0.01 scale)
const freqSF = -2;
const freqScaleFactor = Math.pow(10, -freqSF);
```

### Fix 3: Line-to-line voltages

Updated comment from SF=-2 to SF=-1:

```javascript
// Update line-to-line voltages (PPVphAB, PPVphBC, PPVphCA) - 40077-40079, SF=-1
```

## Results

### Register Values (After Fix)

| Register | Name | Raw Value | Calculation | Displayed Value |
|----------|------|-----------|-------------|-----------------|
| 40080 | PhVphA | 2300 | 2300 ÷ 10 | **230.0 V** ✅ |
| 40081 | PhVphB | 2300 | 2300 ÷ 10 | **230.0 V** ✅ |
| 40082 | PhVphC | 2300 | 2300 ÷ 10 | **230.0 V** ✅ |
| 40077 | PPVphAB | 3984 | 3984 ÷ 10 | **398.4 V** ✅ |
| 40078 | PPVphBC | 3984 | 3984 ÷ 10 | **398.4 V** ✅ |
| 40079 | PPVphCA | 3984 | 3984 ÷ 10 | **398.4 V** ✅ |

### EDMM-20 Display (After Fix)

- **Netzspannung Phase L1**: **230 V** ✅ (was 2309 V)
- **Netzspannung Phase L2**: **230 V** ✅ (was 2309 V)
- **Netzspannung Phase L3**: **230 V** ✅ (was 2309 V)
- **Netzspannung Phase L1 gegen L2**: **398 V** ✅ (was 4000 V)
- **Netzspannung Phase L2 gegen L3**: **398 V** ✅ (was 4000 V)
- **Netzspannung Phase L3 gegen L1**: **398 V** ✅ (was 4000 V)

### Physical Consistency Maintained

Line-to-line voltage relationship still correct:

```
V_LL = V_phase × √3
398.4 V ≈ 230 V × 1.732
```

## Files Modified

- [`backend/src/simulation/pvGenerator.js`](backend/src/simulation/pvGenerator.js)
  - Line 189-191: Changed voltageSF from -2 to -1 in `updateRegisters()`
  - Line 131-149: Changed voltageSF from -2 to -1 in `updateGridParameters()`
  - Line 216: Updated comment for line-to-line voltages

## Version History

- **Version 1.0** (Jan 6, 2026): Initial release
- **Version 1.1** (Jan 6, 2026): Complete inverter values (all AC/DC parameters)
- **Version 1.1.1** (Jan 6, 2026): Fixed voltage scaling (230/400V standard) ✅

## Testing

Verified at 2500W power setting:
- Phase voltages: **230 V** (within 228-232 V range) ✅
- Line voltages: **398 V** (within 395-405 V range) ✅
- Matches European standard: **230/400 V** ✅

All values now display correctly in EDMM-20!

---

**Voltage scaling is now correct and matches the 230/400 V European grid standard!** 🎉

