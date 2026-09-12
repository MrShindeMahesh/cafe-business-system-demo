import React, { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function Customers() {
    const { customers, setCustomers } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // Safely filter customers (prevents crashes if name or phone is undefined)
    const filteredCustomers = customers.filter(c =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone || '').includes(searchQuery)
    );

    const handleAddCustomer = () => {
        const name = newName.trim();
        const phone = newPhone.trim().replace(/\D/g, '');
        if (!name || !phone) { alert('Enter both a name and a 10-digit phone number.'); return; }
        if (phone.length !== 10) { alert('Phone must be 10 digits.'); return; }
        if (customers.some((c) => c.phone === phone)) { alert('A customer with this phone already exists.'); return; }
        const customer = {
            id: 'c' + Date.now(),
            name,
            phone,
            orders: 0,
            totalSpent: 0,
            lastVisit: '',
        };
        setCustomers([customer, ...customers]);
        setNewName(''); setNewPhone(''); setShowAdd(false);
        alert(`Customer "${name}" added!`);
    };

    // Helper to mask phone numbers
    const maskPhone = (phone) => {
        if (!phone || phone.length < 4) return 'N/A';
        return `******${phone.slice(-4)}`;
    };

    return (
        <div className="animate-fade-in">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Customers</h2>
                    <p className="admin-page-sub">View customer history and loyalty metrics.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="input-with-icon" style={{ width: '260px' }}>
                        <span className="input-icon"><Search size={16} /></span>
                        <input
                            type="text"
                            placeholder="Search name or phone..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                        <UserPlus size={16} /> Add Customer
                    </button>
                </div>
            </div>

            {showAdd && (
                <div className="modal-overlay" style={{ zIndex: 1100, alignItems: 'center' }} onClick={() => setShowAdd(false)}>
                    <div className="card animate-scale-up" style={{ width: '100%', maxWidth: '400px', padding: '2rem', background: 'var(--color-surface)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>Add Customer</h3>
                            <button className="action-icon-btn" onClick={() => setShowAdd(false)}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.4rem' }}>Name</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Customer name" />
                            </div>
                            <div>
                                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.4rem' }}>Phone</label>
                                <input type="tel" maxLength="10" value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile number" />
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddCustomer}>
                                <UserPlus size={16} /> Save Customer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Phone Number</th>
                            <th>Total Orders</th>
                            <th>Total Spent</th>
                            <th>Last Visit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(cust => (
                                <tr key={cust.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem' }}>
                                            <div className="admin-avatar" style={{ width: '36px', height: '36px', fontSize: '.875rem' }}>
                                                {(cust.name || 'G').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="menu-item-name">{cust.name || 'Guest User'}</div>
                                        </div>
                                    </td>

                                    {/* MASKED PHONE NUMBER APPLIED HERE */}
                                    <td style={{ color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>
                                        {maskPhone(cust.phone)}
                                    </td>

                                    <td>
                                        <span className="badge badge-accent">{cust.orders} Orders</span>
                                    </td>
                                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                        ₹{cust.totalSpent.toLocaleString()}
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
                                        {cust.lastVisit ? new Date(cust.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                                    No customers found matching "{searchQuery}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}