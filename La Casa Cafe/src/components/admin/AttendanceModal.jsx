import React, { useState } from 'react';
import { X, LogIn, LogOut, Clock, CheckCircle2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const STAFF_LABEL = { waiter: 'Waiter', reception: 'Reception' };

export default function AttendanceModal({ onClose }) {
  const { attendance, checkInAttendance, checkOutAttendance } = useData();
  const { role } = useAuth();
  const [busy, setBusy] = useState(false);

  const staffName = STAFF_LABEL[role] || 'Staff';
  const today = new Date().toLocaleDateString('en-CA');
  const active = attendance.find((a) => a.date === today && a.staffName === staffName && !a.checkOut);
  const todayRec = attendance.filter((a) => a.date === today && a.staffName === staffName);

  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  const doCheckIn = async () => {
    setBusy(true);
    await checkInAttendance({ staffName, role });
    setBusy(false);
  };

  const doCheckOut = async () => {
    if (!active) return;
    setBusy(true);
    try { await checkOutAttendance(active.id); } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200, alignItems: 'center', padding: '1rem' }} onClick={onClose}>
      <div
        className="card animate-scale-up"
        style={{ width: '100%', maxWidth: '360px', padding: '2rem', background: 'var(--color-surface)', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Clock size={18} /> Attendance
          </h3>
          <button className="action-icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <p style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: '.25rem' }}>{staffName}</p>
        <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {active ? (
          <>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.3)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.875rem', fontWeight: 600, color: 'var(--color-success)' }}>
                <CheckCircle2 size={16} /> Checked in at {fmtTime(active.checkIn)}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={doCheckOut}>
              <LogOut size={16} /> {busy ? 'Saving…' : 'Clock Out'}
            </button>
            <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginTop: '.75rem' }}>
              Tap Clock Out when your shift ends. You can reopen this anytime from the Attendance button.
            </p>
          </>
        ) : (
          <>
            {todayRec.length > 0 && (
              <p style={{ fontSize: '.78rem', color: 'var(--color-text-muted)', marginBottom: '.75rem' }}>
                Today: you checked out at {fmtTime(todayRec[0]?.checkOut)}. Tap Clock In again if you're back on shift.
              </p>
            )}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={doCheckIn}>
              <LogIn size={18} /> {busy ? 'Saving…' : 'Clock In'}
            </button>
            <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginTop: '.75rem' }}>
              Please clock in to start your shift — your check-in is recorded for the staff report.
            </p>
          </>
        )}
      </div>
    </div>
  );
}