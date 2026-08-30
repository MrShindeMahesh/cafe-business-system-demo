import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Coffee, LayoutDashboard, UtensilsCrossed, Grid, Settings as SettingsIcon, LogOut, PieChart, Users, ShoppingCart, Package, Menu, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import './Admin.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { settings } = useData();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Live Orders', end: true },
    { path: '/admin/todays-orders', icon: <ShoppingCart size={18} />, label: "Today's Orders" },
    { path: '/admin/tables', icon: <Grid size={18} />, label: 'Tables' },
    { path: '/admin/menu', icon: <UtensilsCrossed size={18} />, label: 'Menu' },
    { path: '/admin/inventory', icon: <Package size={18} />, label: 'Inventory' },
    { path: '/admin/customers', icon: <Users size={18} />, label: 'Customers' },
    { path: '/admin/analytics', icon: <PieChart size={18} />, label: 'Analytics' },
    { path: '/admin/settings', icon: <SettingsIcon size={18} />, label: 'Settings' },
  ];

  return (
    <div className="admin-layout animate-fade-in">
      {/* Mobile Backdrop */}
      {isMobileOpen && <div className="admin-sidebar-overlay" onClick={() => setIsMobileOpen(false)} />}

      <aside className={`admin-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Coffee size={20} /></div>
          <span className="sidebar-logo-text">{settings?.cafeName || 'Brew & Bite'}</span>
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
          <button className="sidebar-exit-btn" onClick={() => navigate('/')}>
            <LogOut size={18} /> Exit Demo
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Mobile Hamburger Toggle */}
            <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <span className="admin-header-title">Café Dashboard</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="demo-badge">
              <span className="demo-dot animate-pulse"></span>
              Demo Mode
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '1rem' }}>
              <div style={{ textAlign: 'right', display: window.innerWidth < 640 ? 'none' : 'block' }}>
                <div style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>Admin User</div>
                <div style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>Manager</div>
              </div>
              <div className="admin-avatar">B&B</div>
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