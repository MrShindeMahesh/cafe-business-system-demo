import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const ROLE_KEY = 'pos_role';
const PINS_KEY = 'pos_pins';

export const DEFAULT_PINS = { admin: '1111', reception: '2222', waiter: '3333', kitchen: '4444' };

const loadPins = () => {
  try {
    return JSON.parse(localStorage.getItem(PINS_KEY)) || DEFAULT_PINS;
  } catch {
    return DEFAULT_PINS;
  }
};

export const AuthProvider = ({ children }) => {
  // sessionStorage → refresh keeps you logged in, closing the tab logs out.
  const [role, setRole] = useState(() => sessionStorage.getItem(ROLE_KEY) || null);
  const [pins, setPins] = useState(loadPins);

  // Per-tab session id — lets the server count how many devices are logged in per role.
  const [sessionId] = useState(() => {
    let s = sessionStorage.getItem('pos_session');
    if (!s) {
      s = 's' + Date.now() + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('pos_session', s);
    }
    return s;
  });

  const leaveBeacon = () => {
    try {
      navigator.sendBeacon?.('/api/presence/leave', new Blob([JSON.stringify({ sessionId })], { type: 'application/json' }));
    } catch { /* best effort */ }
  };

  // Heartbeat — tells the server this tab is still signed in (every 15s).
  useEffect(() => {
    if (!role) return;
    const beat = () => fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, role }),
      keepalive: true,
    }).catch(() => {});
    beat();
    const iv = setInterval(beat, 15000);
    window.addEventListener('pagehide', leaveBeacon);
    return () => {
      clearInterval(iv);
      window.removeEventListener('pagehide', leaveBeacon);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, sessionId]);

  const login = (r, pin) => {
    if (pins[r] === String(pin)) {
      sessionStorage.setItem(ROLE_KEY, r);
      setRole(r);
      return true;
    }
    return false;
  };

  const logout = () => {
    leaveBeacon();
    sessionStorage.removeItem(ROLE_KEY);
    setRole(null);
  };

  const updatePin = (r, newPin) => {
    setPins((prev) => {
      const next = { ...prev, [r]: String(newPin) };
      localStorage.setItem(PINS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetPins = () => {
    localStorage.setItem(PINS_KEY, JSON.stringify(DEFAULT_PINS));
    setPins(DEFAULT_PINS);
  };

  const isDefaultPins = JSON.stringify(pins) === JSON.stringify(DEFAULT_PINS);

  return (
    <AuthContext.Provider value={{ role, login, logout, updatePin, resetPins, pins, isDefaultPins }}>
      {children}
    </AuthContext.Provider>
  );
};
