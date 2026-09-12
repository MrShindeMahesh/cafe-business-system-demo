# La Casa POS — Deployment Guide

## What You Have

A complete, production-ready café POS system that runs on a single Windows 10 PC.

## System Requirements

- Windows 10 (64-bit)
- Node.js LTS (v18 or v20) — [Download here](https://nodejs.org)
- 4GB RAM minimum
- 500MB free disk space
- A thermal receipt printer (optional, for printing bills)

---

## Step-by-Step Deployment

### Step 1: Install Node.js (one-time)

1. Download Node.js LTS from https://nodejs.org
2. Run the installer → click "Next" through all screens → Finish
3. Restart the PC (recommended)
4. Verify installation:
   - Open Command Prompt (search "cmd" in Start menu)
   - Type: `node -v`
   - Should show: `v18.x.x` or `v20.x.x`
   - Type: `npm -v`
   - Should show: `9.x.x` or higher

### Step 2: Copy the Project

1. Copy the entire `Cafe` folder to the target PC
2. Recommended location: `C:\Cafe` (short path, no spaces issues)

### Step 3: Install Dependencies (one-time)

1. Open Command Prompt as Administrator:
   - Search "cmd" in Start menu → right-click → "Run as administrator"
2. Navigate to the project:
   ```
   cd C:\Cafe
   ```
3. Install all dependencies:
   ```
   npm install
   ```
   This takes 2-5 minutes. A `node_modules` folder will appear.

### Step 4: First Launch (test it works)

1. In the same Command Prompt:
   ```
   npm start
   ```
2. Wait for "Server running on port 4000"
3. Open a browser and go to: `http://localhost:4000`
4. The staff login screen should appear
5. Test each role PIN:
   - Admin: `1111`
   - Reception: `2222`
   - Waiter: `3333`
   - Kitchen: `4444`
6. Press `Ctrl+C` in Command Prompt to stop

### Step 5: Create Desktop Shortcut

1. In File Explorer, navigate to `C:\Cafe`
2. Find `Start La Casa.vbs`
3. Right-click → "Send to" → "Desktop (create shortcut)"
4. On Desktop, right-click the shortcut → "Rename" → type: `La Casa POS`
5. (Optional) Change icon:
   - Right-click shortcut → "Properties" → "Change Icon"
   - Browse to `C:\Cafe\public\icon.png` (if you have one)

### Step 6: Customize (Admin Login)

1. Double-click `La Casa POS` shortcut on Desktop
2. Open browser to `http://localhost:4000`
3. Login as Admin (`1111`)
4. Go to **Settings** and change:
   - Contact number
   - Address
   - Upload logo (appears on dashboard + receipts)
   - Change all 4 staff PINs (recommended)
   - Tax rate (if applicable)

### Step 7: Connect Thermal Printer (optional)

1. Plug the thermal printer via USB
2. Install the printer driver (comes with printer or download from manufacturer)
3. In Windows: Settings → Printers & Scanners → add the printer
4. Test: Generate a Bill → Print Bill → select the thermal printer
5. For auto-print (no dialog): see "Auto-Print" section below

### Step 8: Multi-Device Setup (phones/tablets)

If you want customers to order from their phones:

1. Find the PC's IP address:
   - Open Command Prompt → type `ipconfig`
   - Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.1.37`)
2. On any phone/tablet on the **same WiFi**, open browser and go to:
   ```
   http://192.168.1.37:4000/order
   ```
3. The customer ordering page appears
4. To create QR codes for each table:
   - Go to `http://192.168.1.37:4000/order?table=01`
   - Use a free QR generator (e.g., qr-code-generator.com)
   - Paste the URL → download QR image
   - Print and tape to table

---

## Daily Usage

| Action | How |
|---|---|
| Start POS | Double-click `La Casa POS` desktop shortcut |
| Stop POS | Click the Command Prompt window → press `Ctrl+C` → close window |
| Backup data | Copy `C:\Cafe\server\cafe.db` to a USB drive |
| Restore data | Replace `C:\Cafe\server\cafe.db` with your backup file → restart POS |

---

## Auto-Print Receipts (No Dialog)

To skip the print dialog every time:

1. Create a new text file: `C:\Cafe\launch-silent.bat`
2. Add this content:
   ```
   @echo off
   cd /d C:\Cafe
   npx vite build
   node server/server.js --kiosk-printing
   ```
3. Use this as your startup shortcut instead

Alternatively, use Chrome's kiosk printing flag:
1. Right-click `La Casa POS` shortcut → Properties
2. In "Target", append: `--kiosk-printing`
3. This makes Chrome print directly without showing a dialog

---

## Auto-Start on Windows Boot

To start the POS automatically when Windows starts:

1. Press `Win + R` → type `shell:startup` → press Enter
2. A folder opens (this runs on every Windows startup)
3. Copy the `La Casa POS` shortcut from Desktop into this folder
4. Now the POS starts automatically when the PC turns on

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "npm is not recognized" | Node.js not installed or not in PATH — reinstall Node.js and restart PC |
| "Port 4000 already in use" | Another app is using the port — close other apps or change port in `server/server.js` |
| "Cannot connect from phone" | Make sure phone and PC are on same WiFi. Check Windows Firewall — allow Node.js through firewall |
| "Printer not showing" | Install printer driver. In Windows: Settings → Printers → Add printer |
| "Data lost after restart" | Data is in `cafe.db` — make sure you're using the same `Cafe` folder every time |
| "QR code doesn't work" | Make sure the QR link points to the PC's IP address, not `localhost` |

---

## Windows Firewall Fix (if phones can't connect)

1. Open "Windows Security" → "Firewall & network protection"
2. Click "Allow an app through firewall"
3. Click "Change settings" → "Allow another app"
4. Browse to: `C:\Cafe\node_modules\.bin\node.exe` (or your Node.js install path)
5. Check both "Private" and "Public" → OK
6. Restart the POS

---

## That's It!

The POS is now running. For any issues:
- Check the Command Prompt window for error messages
- Make sure `cafe.db` is being created in `C:\Cafe\server\`
- Default PINs: Admin `1111`, Reception `2222`, Waiter `3333`, Kitchen `4444`
