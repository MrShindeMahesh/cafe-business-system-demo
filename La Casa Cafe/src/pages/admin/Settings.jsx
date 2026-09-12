import React, { useState, useEffect } from 'react';
import { AlertTriangle, Save, CheckCircle2, Database, FileDown, Upload, QrCode } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/roles';
import { downloadCsv, downloadJson, ordersCsvColumns, menuCsvColumns, inventoryCsvColumns, customersCsvColumns } from '../../lib/exportData';
import { clearLocalDb, backupAll, restoreAll } from '../../lib/localDb';

export default function Settings() {
  const { settings, updateSettings, orders, menu, inventory, customers } = useData();
  const { pins, updatePin, resetPins } = useAuth();
  const [pinDrafts, setPinDrafts] = useState({});
  const dateStamp = new Date().toISOString().slice(0, 10);
  const [localSettings, setLocalSettings] = useState(settings);

  const handleClearData = () => {
    if (window.confirm("WARNING: This will permanently delete ALL local data (orders, menu, inventory, customers) and reset to defaults. Are you sure?")) {
      clearLocalDb();
      window.location.reload();
    }
  };

  const handleExport = (kind, columns) => {
    const datasets = { orders, menu, inventory, customers };
    downloadCsv(`${kind}-${dateStamp}.csv`, datasets[kind] || [], columns);
  };

  const handleBackup = () => downloadJson(`cafe-backup-${dateStamp}.json`, backupAll());

  // ============================================
  // Phase 4 — server-side DB backup (auto daily + manual)
  // ============================================
  const [backups, setBackups] = useState([]);
  const [backupMsg, setBackupMsg] = useState('');

  const loadBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      if (res.ok) setBackups(await res.json());
    } catch { /* server backups only available when connected */ }
  };

  const handleServerBackup = async () => {
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setBackupMsg('✔ Backup created at ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        await loadBackups();
      } else {
        setBackupMsg('Backup failed: ' + (data.error || 'unknown'));
      }
    } catch (e) {
      setBackupMsg('Server backup failed: ' + e.message);
    }
    setTimeout(() => setBackupMsg(''), 6000);
  };

  useEffect(() => { loadBackups(); }, []);

  const handleRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        restoreAll(JSON.parse(reader.result));
        alert('Backup restored successfully! Reloading...');
        window.location.reload();
      } catch {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    updateSettings(localSettings);
    alert("Settings updated successfully!");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large — max 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      try {
        const res = await fetch('/api/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        });
        const data = await res.json();
        if (data.ok) {
          setLocalSettings((prev) => {
            const next = { ...prev, cafeLogo: data.path };
            updateSettings(next);
            return next;
          });
          alert('Logo uploaded permanently!');
        } else {
          alert('Upload failed: ' + (data.error || 'unknown'));
        }
      } catch (err) {
        alert('Upload failed: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = async () => {
    try {
      const res = await fetch('/api/logo', { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setLocalSettings((prev) => {
          const next = { ...prev, cafeLogo: '' };
          updateSettings(next);
          return next;
        });
      }
    } catch (err) {
      alert('Remove failed: ' + err.message);
    }
  };

  // ─── UPI QR codes (multiple — one per bank/app) ───
  const [upiQrLabel, setUpiQrLabel] = useState('');
  const qrList = (() => {
    try {
      const parsed = JSON.parse(localSettings.upiQrs || '[]');
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* legacy below */ }
    return localSettings.upiQr ? [{ id: '1', label: 'UPI', path: localSettings.upiQr }] : [];
  })();

  const handleUpiQrChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large — max 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upi-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result, label: upiQrLabel }),
        });
        const raw = await res.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
        if (data.ok) {
          const next = { ...localSettings, upiQr: data.qrs?.[0]?.path || data.path, upiQrs: JSON.stringify(data.qrs || qrList.concat(data.qr || [])) };
          setLocalSettings(next);
          updateSettings(next);
          setUpiQrLabel('');
          alert('UPI QR uploaded! Customers can scan it when paying by UPI.');
        } else if (!raw || res.status === 502 || res.status === 404) {
          alert('Cannot reach the café server (backend not running).\n\nStart it with:  npm start\nthen open the app on http://localhost:4000 and try again.');
        } else {
          alert('Upload failed: ' + (data.error || ('HTTP ' + res.status)));
        }
      } catch (err) {
        alert(err.message === 'Failed to fetch'
          ? 'Cannot reach the café server (backend not running).\n\nStart it with:  npm start\nthen open the app on http://localhost:4000 and try again.'
          : 'Upload failed: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveUpiQr = async (id = '') => {
    const msg = id
      ? `Remove the "${qrList.find(q => String(q.id) === String(id))?.label || id}" QR?`
      : 'Remove ALL uploaded UPI QRs?';
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch('/api/upi-qr' + (id ? `?id=${id}` : ''), { method: 'DELETE' });
      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
      if (data.ok) {
        const remaining = id ? qrList.filter(q => String(q.id) !== String(id)) : [];
        const next = { ...localSettings, upiQr: remaining[0]?.path || '', upiQrs: JSON.stringify(remaining) };
        setLocalSettings(next);
        updateSettings(next);
      } else if (!raw || res.status === 502 || res.status === 404) {
        alert('Cannot reach the café server (backend not running).\n\nStart it with:  npm start\nthen open the app on http://localhost:4000 and try again.');
      } else {
        alert('Remove failed: ' + (data.error || ('HTTP ' + res.status)));
      }
    } catch (err) {
      alert(err.message === 'Failed to fetch'
        ? 'Cannot reach the café server (backend not running).\n\nStart it with:  npm start\nthen open the app on http://localhost:4000 and try again.'
        : 'Remove failed: ' + err.message);
    }
  };



  return (
    <div className="animate-fade-in settings-page" style={{ maxWidth: '800px' }}>
      <div className="settings-header">
        <h2 className="settings-title">System Settings</h2>
        <p className="settings-sub">Manage your café configurations and POS software details.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>General Configurations</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>Café Name</label>
                <div style={{ padding: '.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.1rem' }}>☕ La Casa</div>
              </div>

              <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1rem' }} onClick={handleSave}>
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <Database size={18} /> Data Export & Backup
            </h3>
            <p style={{ fontSize: '.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Data lives only on this computer (browser local storage). Download CSV files to open directly in Excel, or take a full JSON backup.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => handleExport('orders', ordersCsvColumns)}><FileDown size={15} /> Orders CSV</button>
              <button className="btn btn-outline btn-sm" onClick={() => handleExport('menu', menuCsvColumns)}><FileDown size={15} /> Menu CSV</button>
              <button className="btn btn-outline btn-sm" onClick={() => handleExport('inventory', inventoryCsvColumns)}><FileDown size={15} /> Inventory CSV</button>
              <button className="btn btn-outline btn-sm" onClick={() => handleExport('customers', customersCsvColumns)}><FileDown size={15} /> Customers CSV</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              <button className="btn btn-outline btn-sm" onClick={handleBackup}><FileDown size={15} /> Backup All Data</button>
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={15} /> Restore Backup
                <input type="file" accept="application/json,.json" hidden onChange={handleRestore} />
              </label>
            </div>
            <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginTop: '1rem', lineHeight: 1.5, fontStyle: 'italic' }}>
              Tip: For a portable real database file we recommend <b>SQLite</b> (free, file-based).<br />
              Excel is <b>not</b> a live database — use the CSV/Excel export for reports instead.
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <Database size={18} /> Auto DB Backups
            </h3>
            <p style={{ fontSize: '.8125rem', color: 'var(--color-text-muted)', marginBottom: '.75rem' }}>
              The database is snapshotted automatically at server start and every 30 minutes. Last 7 daily backups are kept in <code>server/backups/</code>.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={handleServerBackup}>
                <Database size={15} /> Back Up Now
              </button>
              {backupMsg && <span style={{ fontSize: '.8rem', color: 'var(--color-primary)' }}>{backupMsg}</span>}
            </div>
            {backups.length > 0 && (
              <ul style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', margin: '0 0 .75rem', paddingLeft: '1rem', maxHeight: '110px', overflowY: 'auto' }}>
                {backups.map((b) => (
                  <li key={b.name} style={{ marginBottom: '.15rem' }}>
                    {b.name} — {b.sizeKB} KB · {new Date(b.modified).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </li>
                ))}
              </ul>
            )}
            <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Tip: also use "Backup All Data" above for a portable JSON copy, and keep an eye on the <code>backups</code> folder for the automatic daily copies.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Staff PINs
              <button className="btn btn-outline btn-sm" onClick={() => { if (window.confirm('Reset all PINs to defaults?')) { resetPins(); alert('PINs reset to defaults.'); } }}>
                Reset Defaults
              </button>
            </h3>
            <p style={{ fontSize: '.8125rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              4-digit PINs for the login screen. Admin has full access; Reception, Waiter and Kitchen see limited panels.
            </p>
            {Object.keys(ROLES).map((r) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{ flex: '0 0 110px', fontSize: '.8125rem', fontWeight: 700, textTransform: 'capitalize' }}>{ROLES[r].label}</label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  style={{ width: '110px', letterSpacing: '.3em', textAlign: 'center' }}
                  value={pinDrafts[r] ?? pins[r]}
                  onChange={(e) => setPinDrafts({ ...pinDrafts, [r]: e.target.value.replace(/\D/g, '') })}
                />
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!(pinDrafts[r] ?? '').match(/^\d{4}$/) || pinDrafts[r] === pins[r]}
                  onClick={() => { updatePin(r, pinDrafts[r]); setPinDrafts({ ...pinDrafts, [r]: '' }); alert(`${ROLES[r].label} PIN updated!`); }}
                >
                  <Save size={14} /> Set
                </button>
              </div>
            ))}
          </div>

          <div className="danger-zone-card">
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={24} className="danger-zone-icon" />
              <div>
                <h3 className="danger-zone-title" style={{ fontSize: '1rem' }}>Factory Reset</h3>
                <p className="danger-zone-desc" style={{ fontSize: '.8125rem' }}>Wipe local storage and revert to defaults.</p>
                <button className="btn btn-outline-danger btn-sm" onClick={handleClearData}>
                  Reset Data
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 350px' }}>
                    {/* ─── Café Branding ─── */}
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Café Branding</h3>

            {/* Logo preview + upload */}
            <div style={{ marginBottom: '1.5rem' }}>
              {localSettings.cafeLogo ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={localSettings.cafeLogo}
                    alt="Café Logo"
                    style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-border)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={handleRemoveLogo}
                  >
                    Remove Logo
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: '120px', height: '120px', margin: '0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-border)',
                    background: 'var(--color-bg)', color: 'var(--color-text-muted)', fontSize: '.75rem'
                  }}
                >
                  No Logo Set
                </div>
              )}
            </div>

            {/* Upload button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label
                htmlFor="logo-upload"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                  padding: '.75rem 1.5rem', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg)', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600,
                  transition: 'all .2s'
                }}
              >
                <Upload size={18} color="var(--color-primary)" />
                Upload Café Logo
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
              </label>
              <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>
                Supported: JPG, PNG, GIF — max 2MB. Will display on the login screen, bills, and reports.
              </p>
            </div>
          </div>

          {/* ─── UPI Payment QRs (multiple — one per bank/app) ─── */}
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
              <QrCode size={18} /> UPI Payment QRs
            </h3>
            <p style={{ fontSize: '.8125rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Upload one or more UPI QR codes (e.g. HDFC, PhonePe, Google Pay). Staff can pick which one to show
              on the bill / QR screen when payment mode is <b>UPI</b>. The chosen QR is printed at the bottom of the bill.
            </p>

            {/* Uploaded QR list */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {qrList.length ? qrList.map((q) => (
                <div key={q.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
                  <img
                    src={q.path}
                    alt={q.label || 'UPI QR'}
                    style={{ width: '120px', height: '120px', objectFit: 'contain', background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: '6px' }}
                  />
                  <span style={{ fontSize: '.78rem', fontWeight: 700 }}>{q.label || `QR ${q.id}`}</span>
                  <button type="button" className="btn btn-outline btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleRemoveUpiQr(q.id)}>
                    Remove
                  </button>
                </div>
              )) : (
                <div
                  style={{
                    width: '160px', height: '160px', margin: '0 auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-border)',
                    background: 'var(--color-bg)', color: 'var(--color-text-muted)', fontSize: '.75rem'
                  }}
                >
                  No QR Set
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginBottom: '.75rem' }}>
              <input
                type="text"
                placeholder="Label (e.g. HDFC / PhonePe)"
                value={upiQrLabel}
                onChange={(e) => setUpiQrLabel(e.target.value)}
                style={{ padding: '.5rem .75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '.85rem', width: '200px' }}
              />
              <label
                htmlFor="upi-qr-upload"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                  padding: '.75rem 1.5rem', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg)', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600,
                  transition: 'all .2s'
                }}
              >
                <Upload size={18} color="var(--color-primary)" />
                Add UPI QR
                <input id="upi-qr-upload" type="file" accept="image/*" onChange={handleUpiQrChange} style={{ display: 'none' }} />
              </label>
              {qrList.length > 1 && (
                <button type="button" className="btn btn-outline btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleRemoveUpiQr('')}>
                  Remove All
                </button>
              )}
            </div>
            <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginTop: '.75rem' }}>
              Best: PNG with a transparent/white background, square, max 2MB. Use the QR your bank/UPI app gives you.
            </p>
          </div>




        </div>
      </div>
    </div>
  );
}