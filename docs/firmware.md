# Nobs Autopilot — Firmware & USB Configuration

This guide turns an **Arduino Micro (ATmega32U4)** into a dedicated game controller for
Microsoft Flight Simulator. The device is flashed with a unique hardware identity
(VID `0x2341`, PID `0x0657`) and the product name **"Nobs Autopilot"**.

Once flashed, the device is 100 % plug-and-play for all end users.

---

## Step 1 — Patch Arduino's boards.txt (developer machine only)

To bake the correct name and USB identity into the compiled firmware, Arduino's internal
board definition must be updated before building.

1. **Close Arduino IDE completely.**

2. Open File Explorer and paste the following path into the address bar:
   ```
   %LOCALAPPDATA%\Arduino15\packages\arduino\hardware\avr\
   ```

3. Open the version folder that appears there (e.g. `1.8.6`).

4. Open `boards.txt` with Notepad.

5. Search for `micro.name` (around line 290) and replace the Micro block with:
   ```
   micro.name=Nobs Autopilot
   micro.build.vid=0x2341
   micro.build.pid=0x0657
   micro.build.usb_product="Nobs Autopilot"
   ```

6. Save the file and reopen Arduino IDE.

> **Note:** This change affects only your local Arduino installation. It does not modify the
> sketch or any files in the project repository. End users who receive the flashed device
> do not need to perform this step.

---

## Step 2 — Flash the firmware

Build and upload the sketch normally via Arduino IDE with the **Arduino Micro** board selected.
The patched `boards.txt` ensures the compiled binary embeds the custom VID/PID and product name.

---

## Result

After flashing, the device announces itself to the OS and browser as:

```
Nobs Autopilot (Vendor: 2341 Product: 0657)
```

The React app filters gamepads by these values (`DEVICE_VID = '2341'`, `DEVICE_PID = '0657'`
in `src/panel/panel.ts`), so the correct controller is selected automatically even when
other game controllers are connected.
