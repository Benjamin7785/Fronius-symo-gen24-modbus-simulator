# EDMM-20 Manual Device Entry Guide

## Problem

The EDMM-20 automatic scan finds your **physical Fronius inverter** but **NOT** the simulator at 192.168.178.155.

## Solution: Manual Device Entry

Most energy managers (including EDMM-20) allow **manual entry** of Modbus devices if automatic discovery doesn't work.

### Step-by-Step:

1. **Skip or Cancel the automatic scan** (if possible)

2. **Look for manual device entry option:**
   - "Manuell hinzufügen" (Add manually)
   - "Benutzerdefiniertes Gerät" (Custom device)
   - "IP-Adresse eingeben" (Enter IP address)
   - Or similar option in the device registration wizard

3. **Enter these details manually:**
   ```
   Schnittstelle:      Ethernet Modbus TCP
   Modbus-Profil:      SunSpec (or Generic/Allgemein)
   IP-Adresse:         192.168.178.155
   Port:               502
   Modbus-Adresse:     1 (Unit ID)
   Gerätename:         Gen24 SIM (or custom name)
   Hersteller:         Fronius (optional)
   ```

4. **Save and test connection**

### Questions for You:

1. **Can you see a "Manual entry" or "Add custom device" button** anywhere in the EDMM-20 interface?

2. **What happens after Step 3?** 
   - Does it let you skip the found devices and add manually?
   - Is there a "+" or "Add" button?

3. **In your EDMM-20 main menu**, is there a section like:
   - "Konfiguration" → "Geräte" → "Gerät hinzufügen"?
   - Or "Settings" → "Devices" → "Add Device"?

### Why Automatic Discovery Might Not Work:

Possible reasons EDMM-20 only finds the physical inverter:

1. **Different IP ranges**: Your physical inverter might be in a prioritized scan range
2. **mDNS/Discovery protocol**: Physical Fronius devices might broadcast presence on the network
3. **MAC address filtering**: EDMM-20 might look for specific hardware vendors
4. **SMA-specific protocol**: SMA devices might have proprietary discovery
5. **Network broadcast domain**: Discovery packets might not reach the simulator

### Alternative: Configure Simulator as "Generic Modbus Device"

If SunSpec auto-discovery doesn't work, try registering it as:
- **Generic Modbus TCP Device**
- Then manually map the registers

This bypasses brand-specific discovery but still allows data reading.

---

## Testing: Can EDMM-20 Connect Manually?

To verify the simulator works, we need to know if manual entry is possible in EDMM-20.

**Please check:**
- Screenshot the next steps after the device selection screen
- Look for any "Skip" or "Manual" options
- Check the main EDMM-20 menu for device management



