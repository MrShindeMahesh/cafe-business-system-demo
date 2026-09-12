import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';

export default function FloatingCart({ itemCount, total, onClick }) {
  const [bounce, setBounce] = useState(false);
  useEffect(() => {
    if (itemCount > 0) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 350);
      return () => clearTimeout(t);
    }
  }, [itemCount]);

  return (
    <div className={`floating-cart animate-slide-up ${bounce ? 'animate-bounce-it' : ''}`}>
      <div className="floating-cart-inner" onClick={onClick}>
        <div style={{ display:'flex', alignItems:'center', gap:'.875rem' }}>
          <div className="cart-icon-wrap">
            <ShoppingBag size={20} color="var(--color-surface)"/>
            <span className="cart-badge">{itemCount}</span>
          </div>
          <span className="cart-label">{itemCount} Item{itemCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="cart-right">
          <span className="cart-total">₹{total}</span>
          <span className="cart-view-label">View Cart</span>
        </div>
      </div>
    </div>
  );
}
