import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Settings() {
  const handleReset = () => {
    if (window.confirm('Are you sure? This will clear all orders and restore the original demo data.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <p className="settings-sub">Manage your café preferences and demo settings.</p>
      </div>

      <div className="danger-zone-card">
        <div style={{ display:'flex', gap:'1rem' }}>
          <AlertTriangle size={24} className="danger-zone-icon"/>
          <div>
            <div className="danger-zone-title">Reset Demo Data</div>
            <p className="danger-zone-desc">
              This will clear all current orders, bills, and custom menu changes. The application
              will be restored to its initial pristine demo state — perfect for showing to a new café owner.
            </p>
            <button className="btn btn-outline-danger btn-sm" onClick={handleReset}>
              <RotateCcw size={16}/> Reset Demo Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
