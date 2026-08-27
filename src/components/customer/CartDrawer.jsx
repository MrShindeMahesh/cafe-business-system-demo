import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';

export default function CartDrawer({ isOpen, onClose, cart, removeFromCart, tableNumber, onClearCart }) {
  const navigate = useNavigate();
  const { addOrder } = useData();

  if (!isOpen) return null;

  const subtotal = cart.reduce((s, i) => s + i.calculatedPrice, 0);
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

  const handleCheckout = () => {
    const items = cart.map(item => {
      const c = [];
      Object.values(item.customizations.variants || {}).forEach(v => v?.name && c.push(v.name));
      Object.values(item.customizations.addons || {}).forEach(a => a?.name && c.push(a.name));
      return { ...item, customizationString: c.join(', '), instructions: item.customizations.instructions };
    });
    const order = addOrder({ tableId: tableNumber, items, subtotal, tax: gst, total });
    onClearCart();
    navigate(`/track/${order.id}?table=${tableNumber}`);
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>Your Order</h2>
          <button className="drawer-close-btn" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon"><Trash2 size={22} style={{ color:'var(--color-text-muted)', opacity:.5 }}/></div>
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
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
                {item.customizations.instructions && (
                  <p className="cart-item-note">"{item.customizations.instructions}"</p>
                )}
                <button className="cart-item-remove" onClick={() => removeFromCart(item.cartItemId)}>
                  <Trash2 size={13}/> Remove item
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
            <button className="btn btn-primary w-full btn-lg" style={{ width:'100%' }} onClick={handleCheckout}>
              Place Order · ₹{total}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
