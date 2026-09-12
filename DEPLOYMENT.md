# La Casa POS — Deployment Guide

## What You Have

A complete, production-ready café POS system that runs on a single Windows 10 PC.

## System Requirements

- Windows 10 (64-bit)
- **Node.js v22.5 or higher** — [Download here](https://nodejs.org) (use the LTS version)
- 4GB RAM minimum
- 500MB free disk space
- A thermal receipt printer (optional, for printing bills)

> ⚠️ **Important:** You need Node.js **v22.5+** because the database uses the built-in `node:sqlite` module. Older versions won't work.

---

## Step-by-Step Deployment

### Step 1: Install Node.js (one-time)

1. Download Node.js LTS from https://nodejs.org
2. Run the installer → click "Next" through all screens → Finish
3. Restart the PC (recommended)
4. Verify installation:
   - Open Command Prompt (search "cmd" in Start menu)
   - Type: `node -v`
   - Should show: `v22.x.x` or higher
   - Type: `npm -v`
   - Should show: `10.x.x` or higher

### Step 2: Copy the Project

1. Copy the entire `La Casa Cafe` folder to the target PC
2. Recommended location: `C:\La Casa Cafe`

### Step 3: Install Dependencies (one-time)

1. Open Command Prompt:
   - Search "cmd" in Start menu → open it
2. Navigate to the project:
   ```
   cd "C:\La Casa Cafe"
   ```
3. Install all dependencies:
   ```
   npm install
   ```
   This takes 2-5 minutes. A `node_modules` folder will appear.

### Step 4: Launch the App

**Option A — Easy way (recommended):**
- Double-click `Start La Casa.vbs` (silent, no black window)

**Option B — Manual way:**
1. Open Command Prompt in the folder
2. Run: `node server/server.js`
3. Wait for "Server running on port 4000"

4. Open a browser and go to: `http://localhost:4000`
5. The staff login screen should appear
6. Test each role PIN:
   - Admin: `1111`
   - Reception: `2222`
   - Waiter: `3333`
   - Kitchen: `4444`
7. Press `Ctrl+C` in Command Prompt to stop

### Step 5: Create Desktop Shortcut

1. In File Explorer, navigate to `C:\La Casa Cafe`
2. Find `Start La Casa.vbs`
3. Right-click → "Send to" → "Desktop (create shortcut)"
4. On Desktop, right-click the shortcut → "Rename" → type: `La Casa POS`

### Step 6: Customize (Admin Login)

1. Launch the app
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
| Stop POS | Close the terminal window (or press `Ctrl+C`) |
| Backup data | Copy `C:\La Casa Cafe\server\cafe.db` to a USB drive |
| Restore data | Replace `C:\La Casa Cafe\server\cafe.db` with your backup file → restart POS |

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
| "node:sqlite not found" or "DatabaseSync is not a constructor" | Node.js version is too old — need v22.5+. Run `node -v` to check. |
| "Port 4000 already in use" | Another app is using the port — close other apps or change port in `server/server.js` |
| "Cannot connect from phone" | Make sure phone and PC are on same WiFi. Check Windows Firewall — allow Node.js through firewall |
| "Printer not showing" | Install printer driver. In Windows: Settings → Printers → Add printer |
| "Data lost after restart" | Data is in `cafe.db` — make sure you're using the same folder every time |
| "QR code doesn't work" | Make sure the QR link points to the PC's IP address, not `localhost` |

---

## Windows Firewall Fix (if phones can't connect)

1. Open "Windows Security" → "Firewall & network protection"
2. Click "Allow an app through firewall"
3. Click "Change settings" → "Allow another app"
4. Browse to your Node.js install path (e.g., `C:\Program Files\nodejs\node.exe`)
5. Check both "Private" and "Public" → OK
6. Restart the POS

---

## That's It!

The POS is now running. For any issues:
- Check the Command Prompt window for error messages
- Make sure `cafe.db` is in `C:\La Casa Cafe\server\`
- Default PINs: Admin `1111`, Reception `2222`, Waiter `3333`, Kitchen `4444`
