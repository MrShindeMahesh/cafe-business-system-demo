# Café POS — Deployment Guide

## Requirements
- **Node.js ≥ 22.5** (uses built-in `node:sqlite`). Check: `node -v`

## One-command deploy (fresh machine)
```bash
npm install
npm start          # builds the frontend, then serves app + API on port 4000
```
Open **http://localhost:4000** (set a different port with `PORT=5000 npm start`).

## Moving existing data to the new deployment
The live database is `server/cafe.db` (auto-seeded on first run). To carry your
existing data over:

1. **On the old machine:** Settings → *Auto DB Backups* → **⬇ Extract Data File**
   → downloads `cafe-backup-YYYY-MM-DD.db`
2. **On the new deployment:** Settings → **⬆ Restore Data File** → pick that file
   → a safety snapshot of current data is taken first, then all tables
   (menu, orders, payments, settings, staff, …) are replaced in one transaction.
   The page reloads with the restored data.

Manual equivalents (no UI):
```bash
# extract (also runs automatically at server start + every 30 min)
curl -X POST http://localhost:4000/api/backup
# download the file
curl -o data.db http://localhost:4000/api/backups/<cafe-backup-YYYY-MM-DD.db>/download
# restore
curl -X POST --data-binary @data.db -H "Content-Type: application/octet-stream" \
     http://localhost:4000/api/restore-db
```

## What runs where
| Piece | Where |
|---|---|
| Built frontend | `dist/` (served by the Express server) |
| API | same server, `/api/*` |
| Database | `server/cafe.db` (SQLite, WAL) |
| Auto backups | `server/backups/cafe-backup-*.db` (last 7 kept) |
| Print logs | `server/logs/print.log` (when no printer IP is configured) |
| Logo / QRs | `public/` uploads |

## Thermal printer
Set the printer IP + port in Settings (printer section). With no IP configured,
bills are logged to `server/logs/print.log` so nothing is lost while testing.

## Updating an existing install
Two zips are produced for this project:

| Zip | Contents | Use it for |
|---|---|---|
| `cafe-deploy-YYYY-MM-DD.zip` | full project (`Cafe/` folder: `src`, `dist`, `public`, `server`, launcher `.bat` files, `cafe.ico`, backup DBs) | a **fresh** machine — unzip, `npm install`, `npm start` |
| `cafe-app-update.zip` | only `dist/` + `server/server.js`, `server/db.js`, `server/print.js` | an **already deployed** cafe — drop it over the existing folder, then restart the server |

Never overwrite `server/cafe.db` when updating — that file is the live data.

## Bill numbers
- One number per **bill** (a table's several tickets share it), starting at 1 each day.
- Assigned once, the first time the bill is opened/printed, and stored on the tickets —
  reprints always show the same number.
- The daily counter lives in private settings rows `_billDay` / `_billSeq`
  (hidden from the API) so a bill printed after midnight continues today's sequence
  instead of reusing number 1. A ticket taken yesterday but billed today gets today's number.
- Padding/prefix come from Settings → Bill (e.g. padding 3 → `001`).
- A full order sync (the 5-second poll writes the whole list back) keeps the stored
  bill numbers, so reprints never lose them.

## Keeping it running (optional)
```bash
# pm2
npm i -g pm2
npm run build
pm2 start server/server.js --name cafe
pm2 save
```
