import React, { useState } from 'react';
import { AlertTriangle, Save, Briefcase, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function Settings() {
  const { settings, updateSettings } = useData();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleClearData = () => {
    if (window.confirm("WARNING: This will permanently delete all local overrides. Are you sure?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    alert("Settings updated successfully!");
  };

  const posFeatures = [
    "Cloud Billing", "Inventory Module", "Menu Management",
    "90+ Reports", "Food Aggregators Integrations", "In-built CRM",
    "Unlimited Users & Terminals", "Purchase Manager", "Dynamic Reports"
  ];

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
                <input
                  type="text"
                  value={localSettings.cafeName}
                  onChange={(e) => setLocalSettings({ ...localSettings, cafeName: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>GST Tax Rate (%)</label>
                <input
                  type="number"
                  value={localSettings.taxRate}
                  onChange={(e) => setLocalSettings({ ...localSettings, taxRate: Number(e.target.value) })}
                />
              </div>

              <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1rem' }} onClick={handleSave}>
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>

          <div className="danger-zone-card">
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={24} className="danger-zone-icon" />
              <div>
                <h3 className="danger-zone-title" style={{ fontSize: '1rem' }}>Factory Reset</h3>
                <p className="danger-zone-desc" style={{ fontSize: '.8125rem' }}>Wipe local storage and revert to demo state.</p>
                <button className="btn btn-outline-danger btn-sm" onClick={handleClearData}>
                  Reset Data
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 350px' }}>
          <div className="card" style={{ padding: '2rem', background: 'var(--color-primary)', color: 'var(--color-surface)', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
              <Briefcase size={24} color="var(--color-highlight)" />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--color-surface)' }}>AFTERHOURS</h3>
            </div>
            <p style={{ color: 'var(--color-highlight)', fontSize: '.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '1.5rem' }}>
              Complete Business Solution
            </p>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
              <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.25rem' }}>Lead Developer & Support</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '.25rem' }}>Mahesh Shinde</p>
              <p style={{ fontSize: '.9375rem', color: 'var(--color-highlight)' }}>+91 9561796296</p>
            </div>

            <h4 style={{ fontSize: '.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Basic Features Included:
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {posFeatures.map((feature, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', fontSize: '.875rem', color: 'rgba(255,255,255,0.85)' }}>
                  <CheckCircle2 size={16} color="var(--color-success)" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}