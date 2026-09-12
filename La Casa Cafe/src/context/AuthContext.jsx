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

  const login = (r, pin) => {
    if (pins[r] === String(pin)) {
      sessionStorage.setItem(ROLE_KEY, r);
      setRole(r);
      return true;
    }
    return false;
  };

  const logout = () => {
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
