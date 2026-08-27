import React, { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';

export default function ProductModal({ product, onClose, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedAddons, setSelectedAddons] = useState({});
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (product.variants) {
      const init = {};
      product.variants.forEach(v => { init[v.name] = v.options[0]; });
      setSelectedVariants(init);
    }
  }, [product]);

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const next = { ...prev };
      if (next[addon.name]) delete next[addon.name];
      else next[addon.name] = addon;
      return next;
    });
  };

  const calcTotal = () => {
    let t = product.price;
    Object.values(selectedVariants).forEach(o => { if (o?.price) t += o.price; });
    Object.values(selectedAddons).forEach(a => { if (a?.price) t += a.price; });
    return t * quantity;
  };

  const handleAdd = () => onAdd(product, quantity, { variants: selectedVariants, addons: selectedAddons, instructions }, calcTotal());

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ position:'relative' }}>
          <img src={product.image} alt={product.name} className="modal-img"/>
          <button className="modal-close" onClick={onClose}><X size={20}/></button>
        </div>

        <div className="modal-body">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.375rem' }}>
            <h2 className="modal-item-name">{product.name}</h2>
            <span className="modal-item-price">₹{product.price}</span>
          </div>
          <p className="modal-item-desc">{product.description}</p>

          {/* Variants */}
          {product.variants?.map(variant => (
            <div key={variant.name} style={{ marginBottom:'1.5rem' }}>
              <p className="modal-section-label">{variant.name}</p>
              {variant.options.map(opt => (
                <div
                  key={opt.name}
                  className={`option-row ${selectedVariants[variant.name]?.name === opt.name ? 'option-row-selected' : ''}`}
                  onClick={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: opt }))}
                >
                  <span style={{ fontWeight:500, color:'var(--color-primary)' }}>{opt.name}</span>
                  <span className="option-row-price">{opt.price > 0 ? `+₹${opt.price}` : ''}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Addons */}
          {product.addons?.length > 0 && (
            <div style={{ marginBottom:'1.5rem' }}>
              <p className="modal-section-label">Extras</p>
              {product.addons.map(addon => {
                const selected = !!selectedAddons[addon.name];
                return (
                  <div key={addon.name} className={`option-row ${selected ? 'option-row-selected' : ''}`} onClick={() => toggleAddon(addon)}>
                    <div style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
                      <span className={`checkbox-square ${selected ? 'checkbox-square-checked' : ''}`}>
                        {selected && <span className="checkbox-check">✓</span>}
                      </span>
                      <span style={{ fontWeight:500, color: selected ? 'var(--color-primary)' : 'var(--color-text)' }}>{addon.name}</span>
                    </div>
                    <span className="option-row-price">+₹{addon.price}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Instructions */}
          <div style={{ marginBottom:'1.5rem' }}>
            <p className="modal-section-label">Special Instructions</p>
            <textarea rows="2" placeholder="e.g. Less sugar, extra spicy…" value={instructions} onChange={e => setInstructions(e.target.value)}/>
          </div>

          {/* Footer */}
          <div className="modal-add-row">
            <div className="qty-selector">
              <button className="qty-selector-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18}/></button>
              <span className="qty-selector-value">{quantity}</span>
              <button className="qty-selector-btn" onClick={() => setQuantity(quantity + 1)}><Plus size={18}/></button>
            </div>
            <button className="btn btn-primary flex-1" style={{ flex:1 }} onClick={handleAdd}>
              Add to Cart · ₹{calcTotal()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
