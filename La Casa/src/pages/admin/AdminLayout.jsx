import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Coffee, LayoutDashboard, UtensilsCrossed, Grid, Settings as SettingsIcon, LogOut, PieChart, Users, ShoppingCart, Package, Menu, X, ChefHat, ClipboardPlus, History } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { canAccess } from '../../lib/roles';
import './Admin.css';

// Maps nav/route keys to sidebar items.
const NAV = [
  { key: 'index', path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Live Orders', end: true },
  { key: 'take-order', path: '/admin/take-order', icon: <ClipboardPlus size={18} />, label: 'Take Order' },
  { key: 'kitchen', path: '/admin/kitchen', icon: <ChefHat size={18} />, label: 'Kitchen Display' },
  { key: 'todays-orders', path: '/admin/todays-orders', icon: <ShoppingCart size={18} />, label: "Today's Orders" },
  { key: 'history', path: '/admin/history', icon: <History size={18} />, label: 'Order History' },
  { key: 'tables', path: '/admin/tables', icon: <Grid size={18} />, label: 'Tables' },
  { key: 'menu', path: '/admin/menu', icon: <UtensilsCrossed size={18} />, label: 'Menu' },
  { key: 'inventory', path: '/admin/inventory', icon: <Package size={18} />, label: 'Inventory' },
  { key: 'customers', path: '/admin/customers', icon: <Users size={18} />, label: 'Customers' },
  { key: 'analytics', path: '/admin/analytics', icon: <PieChart size={18} />, label: 'Analytics' },
  { key: 'settings', path: '/admin/settings', icon: <SettingsIcon size={18} />, label: 'Settings' },
];

const ROLE_SUBTITLES = { admin: 'Owner', reception: 'Front Desk', waiter: 'Floor Staff', kitchen: 'Kitchen' };

export default function AdminLayout() {
  const navigate = useNavigate();
  const { settings } = useData();
  const { role, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = NAV.filter((item) => canAccess(role, item.key));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = (role || '').slice(0, 2).toUpperCase();

  return (
    <div className="admin-layout animate-fade-in">
      {/* Mobile Backdrop */}
      {isMobileOpen && <div className="admin-sidebar-overlay" onClick={() => setIsMobileOpen(false)} />}

      <aside className={`admin-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-logo">
          {settings?.cafeLogo ? (
            <img src={settings.cafeLogo} alt={settings?.cafeName || 'Café'} className="sidebar-logo-img" />
          ) : (
            <div className="sidebar-logo-icon"><Coffee size={22} /></div>
          )}
          <span className="sidebar-logo-text">{settings?.cafeName || 'La Casa'}</span>
          <button className="mobile-close-btn" onClick={() => setIsMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <p className="sidebar-section-label">Menu</p>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-exit-btn" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(true)}>
              <Menu size={22} />
            </button>
            {settings?.cafeLogo && (
              <img src={settings.cafeLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} />
            )}
            <span className="admin-header-title">{settings?.cafeName || 'La Casa'} Dashboard</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="demo-badge">
              <span className="demo-dot animate-pulse"></span>
              Local Mode
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '1rem' }}>
              <div style={{ textAlign: 'right', display: window.innerWidth < 640 ? 'none' : 'block' }}>
                <div style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                  {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff'}
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>{ROLE_SUBTITLES[role] || ''}</div>
              </div>
              <div className="admin-avatar">{initials || 'BB'}</div>
            </div>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
