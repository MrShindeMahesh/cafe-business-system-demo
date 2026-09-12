import React from 'react';
import { useData } from '../../context/DataContext';

export default function TodaysOrders() {
    const { orders } = useData();

    // Get today's date string in YYYY-MM-DD format based on local time
    const today = new Date().toLocaleDateString('en-CA');

    // Filter orders matching today's date
    const todaysOrders = orders.filter(ord => {
        if (!ord.createdAt) return false;
        const orderDate = new Date(ord.createdAt).toLocaleDateString('en-CA');
        return orderDate === today;
    });

    return (
        <div className="animate-fade-in">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Today's Orders</h2>
                    <p className="admin-page-sub">Live log of all tickets generated on {new Date().toLocaleDateString()}</p>
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
                        {todaysOrders.length > 0 ? (
                            todaysOrders.map(ord => (
                                <tr key={ord.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>#{ord.id}</td>
                                    <td>Table {String(ord.tableId).padStart(2, '0')}</td>
                                    <td>{ord.customerName || 'Guest'}</td>
                                    <td>{ord.items.map(i => `${i.quantity} × ${i.name}`).join(', ')}</td>
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
                                    No orders have been placed today yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}