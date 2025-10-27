// src/components/WatchlistCard.jsx
import React, { useEffect, useRef } from 'react';
import { useTweenedNumber } from '../utils/numberTween';

export default function WatchlistCard({ symbol, quote = {}, onTrade, onRemove }) {
  const price = Number(quote.price || 0);
  const change = Number(quote.changePct || 0);
  const tween = useTweenedNumber(price, 280);
  const lastTs = useRef(0);
  const pulseRef = useRef(null);

  useEffect(() => {
    if (!quote.ts) return;
    if (quote.ts !== lastTs.current) {
      lastTs.current = quote.ts;
      try {
        const el = pulseRef.current;
        if (!el) return;
        el.classList.remove('pulse');
        // force reflow
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight;
        el.classList.add('pulse');
        setTimeout(() => el.classList.remove('pulse'), 320);
      } catch {}
    }
  }, [quote.ts]);

  return (
    <div className="card hover-lift" style={{ position: 'relative' }}>
      <style>{`
        .pulse { box-shadow: 0 0 0 0 rgba(94,234,212,.35); animation: pl 320ms ease-out; }
        @keyframes pl { 0%{ box-shadow: 0 0 0 0 rgba(94,234,212,.35);} 100%{ box-shadow: 0 0 0 10px rgba(94,234,212,0);} }
      `}</style>
      <div ref={pulseRef} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div className="avatar" style={{ width: 44, height: 44 }}>{symbol?.[0]}</div>
          <div>
            <div className="muted" style={{ fontWeight: 800 }}>{symbol}</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>${tween.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            <div className={change >= 0 ? 'pos' : 'neg'} style={{ fontSize: 13 }}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn primary" onClick={() => onTrade?.(symbol)}>Trade</button>
          <button className="btn danger" onClick={() => onRemove?.(symbol)}>Remove</button>
        </div>
      </div>
    </div>
  );
}

