import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Coffee, ArrowRight, ShieldCheck, ChevronLeft } from 'lucide-react';

export default function CustomerLogin() {
    const [searchParams] = useSearchParams();
    const tableNumber = searchParams.get('table') || '1';
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');

    const handleSendOTP = (e) => {
        e.preventDefault();
        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit number.');
            return;
        }
        setError('');
        // In production, this triggers the SMS API (Twilio/Msg91)
        setStep(2);
    };

    const handleVerifyOTP = (e) => {
        e.preventDefault();
        // Hardcoded for demo purposes
        if (otp === '1234') {
            sessionStorage.setItem('guest_name', name);
            sessionStorage.setItem('guest_phone', phone);
            navigate(`/order?table=${tableNumber}`);
        } else {
            setError('Invalid OTP. For demo, use 1234');
        }
    };

    return (
        <div className="customer-app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', padding: '1.5rem', backgroundImage: 'linear-gradient(to bottom, rgba(23,20,18,0.7), rgba(23,20,18,0.9)), url("https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200")', backgroundSize: 'cover', backgroundPosition: 'center' }}>

            <div className="card animate-scale-up" style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto', width: '100%', background: 'rgba(255,253,249,0.95)', backdropFilter: 'blur(10px)' }}>

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', background: 'var(--color-surface-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}>
                        <Coffee size={28} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', color: 'var(--color-primary)' }}>Afterhours POS</h2>
                    <div style={{ display: 'inline-block', background: 'rgba(198,139,89,0.15)', color: 'var(--color-secondary)', padding: '0.25rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '.75rem', fontWeight: 700, marginTop: '0.75rem', letterSpacing: '0.05em' }}>
                        TABLE {tableNumber.padStart(2, '0')}
                    </div>
                </div>

                {error && <div style={{ color: 'var(--color-danger)', fontSize: '.875rem', textAlign: 'center', marginBottom: '1rem', fontWeight: 600 }}>{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
                        <div>
                            <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>Your Name</label>
                            <input required type="text" placeholder="e.g., Rahul Kumar" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem' }}>Phone Number</label>
                            <input required type="tel" placeholder="e.g., 9876543210" value={phone} onChange={e => setPhone(e.target.value)} pattern="[0-9]{10}" />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', height: '52px' }}>
                            Send OTP <ArrowRight size={18} />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">
                        <div style={{ textAlign: 'center', fontSize: '.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            We sent a code to <br /><strong style={{ color: 'var(--color-primary)' }}>+91 {phone}</strong>
                        </div>
                        <div>
                            <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem', textAlign: 'center' }}>Enter 4-Digit OTP</label>
                            <input required type="text" placeholder="1 2 3 4" value={otp} onChange={e => setOtp(e.target.value)} maxLength="4" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontWeight: 700 }} />
                            <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '.5rem' }}>Demo hint: type 1234</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button type="button" className="btn btn-outline" style={{ width: '48px', height: '52px', padding: 0 }} onClick={() => setStep(1)}>
                                <ChevronLeft size={20} />
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '52px' }}>
                                Verify & Order <ShieldCheck size={18} />
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}