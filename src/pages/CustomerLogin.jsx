import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Coffee, ArrowRight } from 'lucide-react';

export default function CustomerLogin() {
    const [searchParams] = useSearchParams();
    const tableNumber = searchParams.get('table') || '1'; // Grabs table from URL
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleJoin = (e) => {
        e.preventDefault();

        // In a real app, you would save this to your database.
        // For this demo, we can save it to sessionStorage to remember who they are.
        sessionStorage.setItem('guest_name', name);
        sessionStorage.setItem('guest_phone', phone);

        // Redirect to the actual menu page for this table
        navigate(`/order?table=${tableNumber}`);
    };

    return (
        <div className="customer-app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', padding: '1.5rem', backgroundImage: 'linear-gradient(to bottom, rgba(23,20,18,0.7), rgba(23,20,18,0.9)), url("https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200")', backgroundSize: 'cover', backgroundPosition: 'center' }}>

            <div className="card animate-scale-up" style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto', width: '100%', background: 'rgba(255,253,249,0.95)', backdropFilter: 'blur(10px)' }}>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '56px', height: '56px', background: 'var(--color-surface-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                        <Coffee size={28} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', color: 'var(--color-primary)' }}>Brew & Bite</h2>
                    <div style={{ display: 'inline-block', background: 'rgba(198,139,89,0.15)', color: 'var(--color-secondary)', padding: '0.25rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '.75rem', fontWeight: 700, marginTop: '0.75rem', letterSpacing: '0.05em' }}>
                        TABLE {tableNumber.padStart(2, '0')}
                    </div>
                </div>

                <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>Your Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g., Rahul Kumar"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>Phone Number</label>
                        <input
                            required
                            type="tel"
                            placeholder="e.g., 9876543210"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            pattern="[0-9]{10}"
                            title="Please enter a valid 10-digit phone number"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', height: '52px' }}>
                        Open Menu <ArrowRight size={18} />
                    </button>
                </form>

            </div>
        </div>
    );
}