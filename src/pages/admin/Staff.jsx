import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';

export default function Staff() {
  const { orders, attendance, staff, addStaff, deleteStaff, addManualAttendance, deleteAttendance } = useData();
  const [preset, setPreset] = useState('today');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('waiter');
  const [newPhone, setNewPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [mName, setMName] = useState('');
  const [mDate, setMDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [mIn, setMIn] = useState('10:00');
  const [mOut, setMOut] = useState('');

  const getRange = (key) => {
    const now = new Date();
    if (key === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (key === '7d') return new Date(now.getTime() - 7 * 86400000);
    if (key === '30d') return new Date(now.getTime() - 30 * 86400000);
    return null;
  };
  const range = getRange(preset);
  const inRange = (d) => d && (!range || new Date(d) >= range);

  const agg = useMemo(() => {
    const map = {};
    orders.filter((o) => o.status !== 'CANCELLED' && inRange(o.createdAt)).forEach((o) => {
      const s = o.staffName || 'Unassigned';
      map[s] = map[s] || { name: s, orders: 0, revenue: 0, items: 0 };
      map[s].orders += 1;
      map[s].revenue += o.total || 0;
      map[s].items += (o.items || []).reduce((x, i) => x + (i.quantity || 1), 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [orders, preset]);

  const hrs = (rec) => {
    if (!rec.checkIn || !rec.checkOut) return '\u2014';
    const ms = new Date(rec.checkOut) - new Date(rec.checkIn);
    if (ms < 0) return '\u2014';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };
  const recentAttendance = [...(attendance || [])].sort((a, b) => String(b.date + (b.checkIn || '')).localeCompare(String(a.date + (a.checkIn || '')))).slice(0, 15);
  const roster = [...(staff || [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const totalType = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) { alert('Enter staff name.'); return; }
    if (roster.some((s) => s.name.toLowerCase() === name.toLowerCase())) { alert('This staff member already exists.'); return; }
    setBusy(true);
    try {
      await addStaff({ name, role: newRole, phone: newPhone.trim() });
      setNewName(''); setNewPhone(''); setNewRole('waiter');
    } finally { setBusy(false); }
  };

  const handleManual = async (e) => {
    e.preventDefault();
    const name = mName.trim();
    if (!name || !mDate) { alert('Pick staff name and date.'); return; }
    const toISO = (t) => (t ? new Date(`${mDate}T${t}:00`).toISOString() : null);
    setBusy(true);
    try {
      const rosterMatch = roster.find((s) => s.name.toLowerCase() === name.toLowerCase());
      await addManualAttendance({ staffName: name, role: rosterMatch ? rosterMatch.role : '', date: mDate, checkIn: toISO(mIn), checkOut: toISO(mOut) });
      setMName(''); setMOut('');
    } finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Staff Management</h2>
          <p className="admin-page-sub">Roster, performance, and attendance in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: '.25rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '.25rem' }}>
          {['today', '7d', '30d'].map((k) => (
            <button key={k} className="btn btn-sm" onClick={() => setPreset(k)}
              style={{ background: preset === k ? 'var(--color-primary)' : 'transparent', color: preset === k ? '#fff' : 'var(--color-text)', border: 'none', padding: '.4rem .75rem', borderRadius: '4px', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer' }}>
              {totalType[k]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: '.25rem', color: 'var(--color-primary)' }}>Staff Roster ({roster.length})</h3>
          <p style={{ fontSize: '.78rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Add waiters / reception once. Names appear in manual attendance.</p>
          <form onSubmit={handleAddStaff} style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name e.g. Ravi" style={{ flex: '1 1 120px', padding: '.5rem .6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ padding: '.5rem .6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <option value="waiter">Captain</option>
              <option value="reception">Reception</option>
              <option value="kitchen">Kitchen</option>
              <option value="admin">Admin</option>
            </select>
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone (optional)" style={{ flex: '1 1 110px', padding: '.5rem .6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
            <button className="btn btn-primary btn-sm" disabled={busy} type="submit">{busy ? 'Saving...' : 'Add Staff'}</button>
          </form>
          {roster.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.85rem' }}>No staff added yet. Add your first team member above.</p>
          ) : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th></th></tr></thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.role}</td>
                    <td>{s.phone || '-'}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => { if (window.confirm(`Remove ${s.name}?`)) deleteStaff(s.id); }}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: '.25rem', color: 'var(--color-primary)' }}>Manual Attendance</h3>
          <p style={{ fontSize: '.78rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Admin fills this when someone forgets to clock in/out.</p>
          <form onSubmit={handleManual} style={{ display: 'grid', gap: '.6rem' }}>
            <input list="roster-names" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Staff name" style={{ padding: '.5rem .6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} />
            <datalist id="roster-names">{roster.map((s) => (<option key={s.id} value={s.name} />))}</datalist>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <label style={{ flex: 1, fontSize: '.75rem' }}>Date<br /><input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} style={{ width: '100%', padding: '.5rem .6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} /></label>
              <label style={{ flex: 1, fontSize: '.75rem' }}>In<br /><input type="time" value={mIn} onChange={(e) => setMIn(e.target.value)} style={{ width: '100%', padding: '.5rem .6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} /></label>
              <label style={{ flex: 1, fontSize: '.75rem' }}>Out (optional)<br /><input type="time" value={mOut} onChange={(e) => setMOut(e.target.value)} style={{ width: '100%', padding: '.5rem .6rem', borderRadius: '6px', border: '1px solid var(--color-border)' }} /></label>
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy} type="submit">{busy ? 'Saving...' : 'Save Attendance'}</button>
          </form>
        </div>
      </div>

      {agg.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '1.5rem' }}>
          No staff-tagged orders yet in this period. Orders taken by Reception or Captain logins are tagged automatically.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
          {agg.map((s, idx) => (
            <div key={s.name} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 700 }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                  {s.name}
                </span>
                <span className="badge badge-accent">#{idx + 1}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem', textAlign: 'center', marginBottom: '.5rem' }}>
                <div><div style={{ fontSize: '.68rem', color: 'var(--color-text-muted)' }}>Revenue</div><b>₹{s.revenue.toLocaleString()}</b></div>
                <div><div style={{ fontSize: '.68rem', color: 'var(--color-text-muted)' }}>Orders</div><b>{s.orders}</b></div>
                <div><div style={{ fontSize: '.68rem', color: 'var(--color-text-muted)' }}>Items</div><b>{s.items}</b></div>
              </div>
              {s.orders > 0 && (
                <div style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>
                  Avg ticket: <b>₹{Math.round(s.revenue / s.orders).toLocaleString()}</b>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', marginTop: '2rem', overflow: 'hidden' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
          Attendance Log
        </h3>
        {recentAttendance.length === 0 ? (
          <p className="text-muted" style={{ color: 'var(--color-text-muted)' }}>No attendance recorded yet. Captains / Reception see a Clock In prompt when they sign in.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Staff</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Worked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentAttendance.map((rec) => (
                <tr key={rec.id}>
                  <td>{rec.date}</td>
                  <td>{rec.staffName}</td>
                  <td>{rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td>{rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span className="badge badge-accent">On shift</span>}</td>
                  <td>{hrs(rec)}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => { if (window.confirm('Delete this attendance entry?')) deleteAttendance(rec.id); }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
