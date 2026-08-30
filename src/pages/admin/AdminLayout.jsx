import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Coffee, LayoutDashboard, UtensilsCrossed, Grid, Settings as SettingsIcon, LogOut, PieChart, Users, ShoppingCart, Package } from 'lucide-react';
import { useData } from '../../context/DataContext';
import './Admin.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { settings } = useData();

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
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Coffee size={20} /></div>
          <span className="sidebar-logo-text">{settings?.cafeName || 'Brew & Bite'}</span>
        </div>
        <p className="sidebar-section-label">Menu</p>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
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
          <span className="admin-header-title">Café Dashboard</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="demo-badge">
              <span className="demo-dot animate-pulse"></span>
              Demo Mode
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
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