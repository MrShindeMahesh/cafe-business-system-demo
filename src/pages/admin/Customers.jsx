import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function Customers() {
    const { customers } = useData();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter customers based on search input (name or phone)
    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

    return (
        <div className="animate-fade-in">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Customers</h2>
                    <p className="admin-page-sub">View customer history and loyalty metrics.</p>
                </div>
                <div className="input-with-icon" style={{ width: '260px' }}>
                    <span className="input-icon"><Search size={16} /></span>
                    <input
                        type="text"
                        placeholder="Search name or phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

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
                                                {cust.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="menu-item-name">{cust.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>{cust.phone}</td>
                                    <td>
                                        <span className="badge badge-accent">{cust.orders} Orders</span>
                                    </td>
                                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                        ₹{cust.totalSpent.toLocaleString()}
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
                                        {new Date(cust.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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