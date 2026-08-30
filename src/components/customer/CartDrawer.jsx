import React, { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, ShieldCheck, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';

export default function CartDrawer({ isOpen, onClose, cart, removeFromCart, tableNumber, onClearCart }) {
  const navigate = useNavigate();
  const { addOrder } = useData();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(sessionStorage.getItem('guest_name') || '');
      setPhone(sessionStorage.getItem('guest_phone') || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((s, i) => s + i.calculatedPrice, 0);
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

  const handleClose = () => {
    setStep(0);
    setError('');
    setOtp('');
    onClose();
  };

  const handleSendOTP = (e) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit number.');
      return;
    }
    setError('');
    setStep(2);
  };

  // ADDED ASYNC HERE
  const handleVerifyAndOrder = async (e) => {
    e.preventDefault();

    if (otp === '1234') {
      sessionStorage.setItem('guest_name', name);
      sessionStorage.setItem('guest_phone', phone);

      const items = cart.map(item => {
        const c = [];
        Object.values(item.customizations.variants || {}).forEach(v => v?.name && c.push(v.name));
        Object.values(item.customizations.addons || {}).forEach(a => a?.name && c.push(a.name));
        return { ...item, customizationString: c.join(', '), instructions: item.customizations.instructions };
      });

      // ADDED AWAIT HERE
      const order = await addOrder({
        tableId: tableNumber,
        items,
        subtotal,
        tax: gst,
        total,
        customerName: name,
        customerPhone: phone
      });

      onClearCart();
      handleClose();
      navigate(`/track/${order.id}?table=${tableNumber}`);
    } else {
      setError('Invalid OTP. For demo, use 1234');
    }
  };

  return (
    <>
      <div className="drawer-overlay" onClick={handleClose} />
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          {step > 0 ? (
            <button className="drawer-close-btn" onClick={() => { setStep(step - 1); setError(''); }}><ChevronLeft size={18} /></button>
          ) : (
            <h2>Your Order</h2>
          )}
          {step === 1 && <h2 style={{ flex: 1, textAlign: 'center' }}>Details</h2>}
          {step === 2 && <h2 style={{ flex: 1, textAlign: 'center' }}>Verification</h2>}
          <button className="drawer-close-btn" onClick={handleClose}><X size={18} /></button>
        </div>

        {/* Step 0: Cart */}
        {step === 0 && (
          <>
            <div className="drawer-body">
              {cart.length === 0 ? (
                <div className="cart-empty">
                  <div className="cart-empty-icon"><Trash2 size={22} style={{ color: 'var(--color-text-muted)', opacity: .5 }} /></div>
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={item.cartItemId || idx} className="cart-item">
                    <div className="cart-item-header">
                      <span className="cart-item-name">{item.quantity} × {item.name}</span>
                      <span className="cart-item-price">₹{item.calculatedPrice}</span>
                    </div>
                    {(Object.values(item.customizations.variants || {}).some(v => v?.name) ||
                      Object.values(item.customizations.addons || {}).some(a => a?.name)) && (
                        <p className="cart-item-customization">
                          {[
                            ...Object.values(item.customizations.variants || {}).map(v => v?.name),
                            ...Object.values(item.customizations.addons || {}).map(a => a?.name)
                          ].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    {item.customizations.instructions && (
                      <p className="cart-item-note">"{item.customizations.instructions}"</p>
                    )}
                    <button className="cart-item-remove" onClick={() => removeFromCart(item.cartItemId)}>
                      <Trash2 size={13} /> Remove item
                    </button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="drawer-footer">
                <div className="drawer-total-row"><span>Subtotal</span><span>₹{subtotal}</span></div>
                <div className="drawer-total-row"><span>Taxes (5%)</span><span>₹{gst}</span></div>
                <div className="drawer-grand-total"><span>Total</span><span>₹{total}</span></div>
                {(name && phone) ? (
                  <button className="btn btn-primary w-full btn-lg" style={{ width: '100%' }} onClick={() => setStep(2)}>
                    Place Order ₹{total}
                  </button>
                ) : (
                  <button className="btn btn-primary w-full btn-lg" style={{ width: '100%' }} onClick={() => setStep(1)}>
                    Proceed to Checkout
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 1: Info Collection */}
        {step === 1 && (
          <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--color-primary)', textAlign: 'center', marginBottom: '1.5rem' }}>Who is ordering?</h3>
            {error && <div style={{ color: 'var(--color-danger)', fontSize: '.875rem', textAlign: 'center', marginBottom: '1rem', fontWeight: 600 }}>{error}</div>}
            <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--color-primary)', textAlign: 'center', marginBottom: '0.5rem' }}>Verify Mobile</h3>
            <div style={{ textAlign: 'center', fontSize: '.875rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
              We sent a code to <br /><strong style={{ color: 'var(--color-primary)' }}>+91 {phone}</strong>
            </div>
            {error && <div style={{ color: 'var(--color-danger)', fontSize: '.875rem', textAlign: 'center', marginBottom: '1rem', fontWeight: 600 }}>{error}</div>}
            <form onSubmit={handleVerifyAndOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '.5rem', textAlign: 'center' }}>Enter 4-Digit OTP</label>
                <input required type="tel" placeholder="1 2 3 4" value={otp} onChange={e => setOtp(e.target.value)} maxLength="4" style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5em', fontWeight: 700, padding: '1rem' }} />
                <p style={{ fontSize: '.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '.75rem' }}>Demo hint: type 1234</p>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', height: '52px' }}>
                Verify & Place Order <ShieldCheck size={18} style={{ marginLeft: '.5rem' }} />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}