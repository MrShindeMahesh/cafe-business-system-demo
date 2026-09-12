import React, { useState } from 'react';
import { QrCode, Smartphone } from 'lucide-react';
import { useData } from '../../context/DataContext';

// Standalone "Show QR" quick-access page — waiter + reception + admin.
// For pay-only customers (no order / no table needed): show the QR, collect
// the payment, done. Supports multiple uploaded QRs (one per bank/app).
export default function UpiQuick() {
  const { settings } = useData();

  const qrList = (() => {
    try {
      const parsed = JSON.parse(settings?.upiQrs || '[]');
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* legacy single-QR below */ }
    return settings?.upiQr ? [{ id: '1', label: 'UPI', path: settings.upiQr }] : [];
  })();
  const [qrId, setQrId] = useState(null);
  const selectedQr = qrList.find(q => String(q.id) === String(qrId)) || qrList[0] || null;

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Show QR — Quick Pay</h2>
          <p className="admin-page-sub">
            For walk-in / pay-only customers. No order or table needed — show the QR, collect payment, done.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
        {qrList.length ? (
          <>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.25rem' }}>
              {qrList.map((q) => (
                <button
                  key={q.id}
                  className="btn btn-outline"
                  onClick={() => setQrId(q.id)}
                  style={String(q.id) === String(selectedQr?.id) ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)', fontWeight: 700 } : {}}
                >
                  <Smartphone size={16} /> {q.label}
                </button>
              ))}
            </div>
            <img
              src={selectedQr.path}
              alt={`UPI QR — ${selectedQr.label || 'Pay'}`}
              style={{ width: '300px', height: '300px', objectFit: 'contain', background: '#fff', border: '2px solid var(--color-border)', borderRadius: '16px', padding: '14px', margin: '0 auto' }}
            />
            <p style={{ fontSize: '.9rem', fontWeight: 700, marginTop: '1.25rem' }}>
              {selectedQr.label ? `Paying via ${selectedQr.label}` : 'Scan & Pay (UPI)'}
            </p>
            <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginTop: '.4rem', lineHeight: 1.6 }}>
              Ask the customer to open any UPI app (GPay / PhonePe / Paytm) and scan.<br />
              Payment mode in the bill is then marked as <b>UPI</b>.
            </p>
          </>
        ) : (
          <div style={{ padding: '2rem 0' }}>
            <QrCode size={40} style={{ margin: '0 auto .75rem', display: 'block', color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.95rem' }}>No UPI QR uploaded yet.</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.8rem', marginTop: '.5rem' }}>
              Admin can add QRs in <b>Settings → UPI Payment QRs</b>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}