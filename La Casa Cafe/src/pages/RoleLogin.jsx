import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, BellRing, User, ChefHat, Coffee, ArrowLeft, Delete } from 'lucide-react';
import { useAuth, DEFAULT_PINS } from '../context/AuthContext';
import { ROLES } from '../lib/roles';

const ROLE_ICONS = { admin: ShieldCheck, reception: BellRing, waiter: User, kitchen: ChefHat };

export default function RoleLogin() {
  const navigate = useNavigate();
  const { login, role, isDefaultPins } = useAuth();
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (role) navigate(ROLES[role].home, { replace: true });
  }, [role, navigate]);

  // Auto-submit once 4 digits are entered.
  useEffect(() => {
    if (selected && pin.length === 4) {
      if (login(selected, pin)) {
        navigate(ROLES[selected].home, { replace: true });
      } else {
        setError('Wrong PIN. Try again.');
        setPin('');
      }
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = (d) => {
    setError('');
    if (pin.length < 4) setPin(pin + d);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg, #121212)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--color-primary, #c58a3a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Coffee size={20} color="#fff" />
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading, serif)', fontSize: '1.6rem', color: 'var(--color-text, #fff)' }}>Staff Login</h1>
      </div>

      {!selected ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', width: '100%', maxWidth: '760px' }}>
          {Object.values(ROLES).map((r) => {
            const Icon = ROLE_ICONS[r.key];
            return (
              <button
                key={r.key}
                onClick={() => { setSelected(r.key); setPin(''); setError(''); }}
                style={{ background: 'var(--color-surface, #1e1e1e)', border: '1px solid var(--color-border, #333)', borderRadius: '16px', padding: '2rem 1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem', transition: 'transform .15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <Icon size={32} color="var(--color-primary, #c58a3a)" />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text, #fff)' }}>{r.label}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--color-text-muted, #888)' }}>{r.tagline}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface, #1e1e1e)', border: '1px solid var(--color-border, #333)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <button onClick={() => { setSelected(null); setPin(''); setError(''); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--color-text-muted, #888)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.8rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--color-text, #fff)', fontWeight: 700, fontSize: '1.1rem' }}>
            {React.createElement(ROLE_ICONS[selected], { size: 20, color: 'var(--color-primary, #c58a3a)' })}
            {ROLES[selected].label}
          </div>

          <div style={{ display: 'flex', gap: '.75rem' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: pin.length > i ? 'var(--color-primary, #c58a3a)' : 'var(--color-border, #333)' }} />
            ))}
          </div>

          {error && <div style={{ color: 'var(--color-danger, #e05252)', fontSize: '.8rem', fontWeight: 600 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.6rem', width: '100%' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} onClick={() => press(d)} style={keyStyle}>{d}</button>
            ))}
            <button onClick={() => setPin('')} style={keyStyle}>C</button>
            <button onClick={() => press('0')} style={keyStyle}>0</button>
            <button onClick={() => setPin(pin.slice(0, -1))} style={keyStyle}><Delete size={18} /></button>
          </div>

          {isDefaultPins && (
            <p style={{ fontSize: '.7rem', color: 'var(--color-text-muted, #888)', textAlign: 'center', lineHeight: 1.6 }}>
              Default PINs — Admin: {DEFAULT_PINS.admin} · Reception: {DEFAULT_PINS.reception}<br />
              Waiter: {DEFAULT_PINS.waiter} · Kitchen: {DEFAULT_PINS.kitchen} (change them in Settings)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const keyStyle = {
  height: '56px',
  borderRadius: '10px',
  border: '1px solid var(--color-border, #333)',
  background: 'var(--color-bg, #121212)',
  color: 'var(--color-text, #fff)',
  fontSize: '1.15rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
