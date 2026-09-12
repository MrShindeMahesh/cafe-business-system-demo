import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '../../context/DataContext';

// Reusable UPI QR popup — anyone (admin / reception / waiter) can show it to a
// customer to pay by scanning. Supports multiple QRs (one per bank/app) uploaded
// in Settings; the customer picks (or staff picks) which one to scan.
export default function UpiQrModal({ table, onClose }) {
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
    <div className="modal-overlay" style={{ zIndex: 1100, alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <div
        className="card animate-scale-up"
        style={{ width: '100%', maxWidth: '380px', padding: '2rem', background: 'var(--color-surface)', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>Scan &amp; Pay (UPI)</h3>
          <button className="action-icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {qrList.length ? (
          <>
            {qrList.length > 1 && (
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '.75rem' }}>
                {qrList.map((q) => (
                  <button
                    key={q.id}
                    className="btn btn-outline btn-sm"
                    onClick={() => setQrId(q.id)}
                    style={String(q.id) === String(selectedQr?.id) ? { borderColor: 'var(--color-primary)', color: 'var(--color-primary)', fontWeight: 700 } : {}}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
            <img
              src={selectedQr.path}
              alt={`UPI QR — ${selectedQr.label || 'Pay'}`}
              style={{ width: '220px', height: '220px', objectFit: 'contain', background: '#fff', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '10px', margin: '0 auto' }}
            />
            <p style={{ fontSize: '.82rem', color: 'var(--color-text-muted)', marginTop: '1rem', lineHeight: 1.5 }}>
              {table?.number ? `Table #${table.number} · ` : ''}
              {selectedQr.label ? `Paying via ${selectedQr.label} · ` : ''}
              Scan with any UPI app to pay for your order.
            </p>
          </>
        ) : (
          <div style={{ padding: '1.5rem 0' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>
              No UPI QR uploaded yet.
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.78rem', marginTop: '.5rem' }}>
              Ask the Admin to add it in <b>Settings → UPI Payment</b>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}