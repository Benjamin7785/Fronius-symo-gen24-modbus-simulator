# EDMM-20 Scan Range Configuration

## Current Situation

- **Physical Fronius**: 192.168.178.24 ✅ FOUND
- **Simulator**: 192.168.178.155 ❌ NOT FOUND

## Most Likely Cause

The EDMM-20 scan range is probably set to something like:
- `192.168.178.1` - `192.168.178.50`
- or `192.168.178.1` - `192.168.178.100`

This would include .24 (found) but exclude .155 (not found).

## Solution

### Option A: Expand EDMM-20 Scan Range (Recommended)

**Configure the scan range in EDMM-20 to include .155:**

Set range to:
- **Start**: `192.168.178.1`
- **End**: `192.168.178.200` (or `192.168.178.254`)

This will include both devices:
- ✅ Physical inverter at .24
- ✅ Simulator at .155

### Option B: Change Simulator IP to Match Physical Inverter Range

If you can't expand the scan range, we can change the simulator to use an IP closer to .24:

For example: `192.168.178.25` or `192.168.178.30`

⚠️ **Note**: This requires changing your PC's network configuration or using a different port.

---

## Action Steps

1. **In EDMM-20**, go to the scan range settings
2. **Note the current range** (write it down)
3. **Expand the range** to include .155:
   - Example: `192.168.178.1` to `192.168.178.200`
4. **Run the scan again**

The simulator should now be discovered!

---

## Questions

1. **What is the current scan range set in EDMM-20?**
   - Start IP: ?
   - End IP: ?

2. **Can you expand it to include .155?**

3. **If not, would you prefer to:**
   - Use a different IP for the simulator (e.g., .25)?
   - Or find another solution?



