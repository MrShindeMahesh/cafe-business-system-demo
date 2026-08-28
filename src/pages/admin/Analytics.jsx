import React, { useState, useMemo } from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign, Calendar } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function Analytics() {
    const { orders, customers } = useData();

    // Date filter state (empty string means 'All Time')
    const [dateFilter, setDateFilter] = useState('');

    // 1. Filter orders based on the selected date
    const filteredOrders = useMemo(() => {
        if (!dateFilter) return orders;
        return orders.filter(order => order.createdAt.startsWith(dateFilter));
    }, [orders, dateFilter]);

    // 2. Calculate Top Level KPIs
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0;

    // 3. Aggregate Item Stats for the charts
    const itemStats = useMemo(() => {
        const stats = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                if (!stats[item.name]) {
                    stats[item.name] = { name: item.name, qty: 0, revenue: 0 };
                }
                stats[item.name].qty += item.quantity;
                stats[item.name].revenue += item.calculatedPrice;
            });
        });
        return Object.values(stats);
    }, [filteredOrders]);

    // Sort top 5 by Quantity and top 5 by Revenue
    const topByQty = [...itemStats].sort((a, b) => b.qty - a.qty).slice(0, 5);
    const topByRev = [...itemStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Find max values to scale the progress bars
    const maxQty = Math.max(...topByQty.map(i => i.qty), 1);
    const maxRev = Math.max(...topByRev.map(i => i.revenue), 1);

    return (
        <div className="animate-fade-in">
            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Analytics Overview</h2>
                    <p className="admin-page-sub">Track your café's performance and top-selling items.</p>
                </div>

                {/* Date Picker Filter */}
                <div className="input-with-icon" style={{ width: '220px' }}>
                    <span className="input-icon"><Calendar size={16} /></span>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-label"><DollarSign size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Revenue</div>
                    <div>
                        <span className="kpi-value">₹{totalRevenue.toLocaleString()}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label"><ShoppingBag size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Total Orders</div>
                    <div>
                        <span className="kpi-value">{totalOrders}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-label"><Users size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> All Time Customers</div>
                    <div>
                        <span className="kpi-value">{customers.length}</span>
                    </div>
                </div>

                <div className="kpi-card kpi-accent-border">
                    <div className="kpi-label">Avg. Order Value</div>
                    <span className="kpi-value">₹{averageOrderValue}</span>
                </div>
            </div>

            {/* Item Performance Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>

                {/* Top Items by Quantity */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                        Most Sold Dishes
                    </h3>
                    {topByQty.length === 0 ? <p className="text-muted">No sales for this date.</p> : topByQty.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', marginBottom: '.25rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                                <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{item.qty} items</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${(item.qty / maxQty) * 100}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Top Items by Revenue */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                        Maximum Revenue Generators
                    </h3>
                    {topByRev.length === 0 ? <p className="text-muted">No sales for this date.</p> : topByRev.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', marginBottom: '.25rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>₹{item.revenue.toLocaleString()}</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${(item.revenue / maxRev) * 100}%`, height: '100%', background: 'var(--color-success)', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}