// src/components/NewsPanel.jsx
import React, { useEffect, useState } from 'react';

export default function NewsPanel({ defaultSymbol = 'AAPL' }) {
  const [q, setQ] = useState(defaultSymbol);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function load(sym) {
    setLoading(true); setErr('');
    try {
      const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
      const r = await fetch(`${API}/news?symbol=${encodeURIComponent(sym || '')}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setItems(await r.json());
    } catch (e) { setErr(String(e.message || e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(defaultSymbol); }, []);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
        <div style={{ fontWeight:900 }}>Live News</div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="inp" value={q} onChange={(e)=>setQ(e.target.value.toUpperCase())} placeholder="Symbol or topic (e.g., AAPL)" />
          <button className="btn" onClick={()=>load(q || defaultSymbol)}>Search</button>
        </div>
      </div>
      {loading && <div className="muted">loading…</div>}
      {err && <div className="neg">{err}</div>}
      <div style={{ display:'grid', gap:8 }}>
        {items.map((n,i)=>(
          <a key={i} className="card hover-lift" href={n.u} target="_blank" rel="noreferrer" style={{ padding:10, textDecoration:'none', color:'inherit' }}>
            <div style={{ fontWeight:800 }}>{n.t}</div>
            <div className="muted" style={{ fontSize:12 }}>{n.s}</div>
          </a>
        ))}
        {!items.length && !loading && <div className="muted">no headlines right now</div>}
      </div>
    </div>
  );
}

