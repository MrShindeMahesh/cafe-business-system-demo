import React from 'react';
import { useData } from '../../context/DataContext';

export default function OrderHistory() {
    const { orders } = useData();

    return (
        <div className="animate-fade-in">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Order History</h2>
                    <p className="admin-page-sub">Complete archive of past and served tickets.</p>
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Table</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length > 0 ? (
                            orders.map(ord => (
                                <tr key={ord.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>#{ord.id}</td>
                                    <td>Table {String(ord.tableId).padStart(2, '0')}</td>
                                    <td>{ord.customerName || 'Guest'}</td>
                                    <td>
                                        {ord.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                                    </td>
                                    <td style={{ fontWeight: 700 }}>₹{ord.total}</td>
                                    <td>
                                        <span className={`badge ${ord.status === 'SERVED' ? 'badge-success' : 'badge-warning'}`}>
                                            {ord.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
                                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                                    No order history found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}