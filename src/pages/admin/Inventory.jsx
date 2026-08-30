import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function Inventory() {
    const [inventory, setInventory] = useState([
        { id: 'inv1', name: 'Premium Coffee Beans', quantity: 12, unit: 'kg', status: 'In Stock' },
        { id: 'inv2', name: 'Whole Milk', quantity: 4, unit: 'Liters', status: 'Low Stock' },
        { id: 'inv3', name: 'Sugar Packets', quantity: 450, unit: 'pcs', status: 'In Stock' },
        { id: 'inv4', name: 'Paper Cups (Large)', quantity: 15, unit: 'pcs', status: 'Critical' },
        { id: 'inv5', name: 'Chocolate Syrup', quantity: 5, unit: 'Bottles', status: 'In Stock' }
    ]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Low Stock': return 'badge-warning';
            case 'Critical': return 'badge-danger';
            default: return 'badge-success';
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Inventory Control</h2>
                    <p className="admin-page-sub">Track raw materials and stock levels.</p>
                </div>
                <button className="btn btn-primary btn-sm">
                    <Plus size={16} /> Add Stock Item
                </button>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Quantity Left</th>
                            <th>Unit</th>
                            <th>Status Alert</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map(item => (
                            <tr key={item.id}>
                                <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.name}</td>
                                <td style={{ fontWeight: 700, fontSize: '1rem' }}>{item.quantity}</td>
                                <td style={{ color: 'var(--color-text-secondary)' }}>{item.unit}</td>
                                <td>
                                    <span className={`badge ${getStatusBadge(item.status)}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="action-icon-btn"><Edit2 size={15} /></button>
                                    <button className="action-icon-btn danger">
                                        <Trash2 size={15} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}