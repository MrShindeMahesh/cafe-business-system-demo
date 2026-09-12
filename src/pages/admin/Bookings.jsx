import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Users, Phone, Clock } from 'lucide-react';
import { useData } from '../../context/DataContext';

// Bookings — table-reservation calendar (Admin + Reception).
// Month grid: click a day to see its bookings and add a new reservation.
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateStamp = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Bookings() {
  const { bookings, addBooking, cancelBooking } = useData();
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(dateStamp(today));
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const monthYear = `${month.toLocaleString('en-IN', { month: 'long' })} ${month.getFullYear()}`;

  // Calendar grid cells (leading blanks + one per day)
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [month]);

  const bookingsByDay = useMemo(() => {
    const map = {};
    for (const b of bookings) (map[b.bookingDate] = map[b.bookingDate] || []).push(b);
    return map;
  }, [bookings]);

  const dayBookings = (bookingsByDay[selectedDay] || []).slice().sort((a, b) => String(a.bookingTime).localeCompare(String(b.bookingTime)));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) { alert('Enter the guest name.'); return; }
    setSaving(true);
    await addBooking({ name: name.trim(), phone: phone.trim(), bookingDate: selectedDay, bookingTime: time, guests: Number(guests) || 2, note: note.trim() });
    setName(''); setPhone(''); setTime(''); setGuests(2); setNote('');
    setSaving(false);
    setShowForm(false);
  };

  const fmtDay = (stamp) => new Date(stamp + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Bookings</h2>
          <p className="admin-page-sub">Table reservations — click a day to view or add a booking.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Calendar */}
        <div className="card" style={{ flex: '1 1 380px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button className="action-icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
            <h3 style={{ fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '.5rem' }}><CalendarIcon size={17} /> {monthYear}</h3>
            <button className="action-icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            {DAY_NAMES.map((d) => <div key={d} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`b${i}`} />;
              const stamp = dateStamp(new Date(month.getFullYear(), month.getMonth(), day));
              const list = bookingsByDay[stamp] || [];
              const isToday = stamp === dateStamp(today);
              const isSelected = stamp === selectedDay;
              return (
                <button
                  key={stamp}
                  onClick={() => { setSelectedDay(stamp); setShowForm(false); }}
                  style={{
                    position: 'relative', padding: '8px 2px', minHeight: '46px', paddingBottom: '2px', paddingLeft: '6px',
                    borderRadius: '8px', border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: isSelected || list.length ? 'var(--color-bg)' : 'var(--color-surface)',
                    cursor: 'pointer', fontWeight: isToday || isSelected ? 800 : 500, fontSize: '.8rem',
                    color: 'var(--color-text)', textAlign: 'left',
                  }}
                >
                  {day}{isToday && <span style={{ position: 'absolute', top: '2px', right: '4px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
                  {list.length > 0 && (
                    <div style={{ display: 'flex', gap: '2px', marginTop: '3px', flexWrap: 'wrap' }}>
                      {list.slice(0, 3).map((b, bi) => (
                        <span key={bi} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
                      ))}
                      {list.length > 3 && <span style={{ fontSize: '.6rem', fontWeight: 800 }}>+{list.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day panel */}
        <div className="card" style={{ flex: '1 1 340px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem' }}>{fmtDay(selectedDay)}</h3>
            {!showForm && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><Plus size={14} /> Add Booking</button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <input type="text" required placeholder="Guest name *" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
                <input type="tel" maxLength="10" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} style={{ width: '110px', padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ flex: 1, padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
                <input type="number" min="1" max="30" value={guests} onChange={(e) => setGuests(e.target.value)} title="Guests" style={{ width: '90px', padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
              </div>
              <input type="text" placeholder="Note (e.g. window table, birthday)" value={note} onChange={(e) => setNote(e.target.value)} style={{ padding: '.5rem .6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving…' : 'Save Booking'}</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}><X size={16} /></button>
              </div>
            </form>
          )}

          {dayBookings.length ? dayBookings.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '.75rem', marginBottom: '.6rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{b.name}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--color-text-muted)', display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginTop: '2px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Clock size={11} /> {b.bookingTime || 'Time TBD'}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Users size={11} /> {b.guests}</span>
                  {b.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Phone size={11} /> {b.phone}</span>}
                </div>
                {b.note && <div style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{b.note}</div>}
              </div>
              <button
                className="action-icon-btn"
                title="Cancel booking"
                onClick={() => { if (window.confirm(`Cancel the booking for ${b.name}?`)) cancelBooking(b.id); }}
              >
                <X size={16} color="var(--color-danger)" />
              </button>
            </div>
          )) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem', textAlign: 'center', padding: '1.5rem 0' }}>
              No bookings for this day yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
