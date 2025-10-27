// src/components/TopMoversCard.jsx
import React, { useEffect, useMemo, useState } from 'react';

function Spark({ data = [], color = '#00ff88' }) {
  const w = 100, h = 32;
  if (!data.length) return <svg width={w} height={h} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = Math.max(1e-6, max - min);
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w;
    const y = h - ((v - min) / rng) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
}

export default function TopMoversCard({ quotes = {}, tf = '1D' }) {
  const [tab, setTab] = useState('GAINERS'); // GAINERS | LOSERS
  const [timeframe, setTf] = useState(tf);
  const [apiErr, setApiErr] = useState('');
  const symbols = Object.keys(quotes || {});

  const { gainers, losers } = useMemo(() => {
    const arr = symbols.map(s => ({
      symbol: s,
      changePct: Number(quotes[s]?.changePct || 0),
      series: quotes[s]?.spark || [],
    }));
    const gain = [...arr].sort((a,b) => (b.changePct) - (a.changePct)).slice(0, 5);
    const lose = [...arr].sort((a,b) => (a.changePct) - (b.changePct)).slice(0, 5);
    return { gainers: gain, losers: lose };
  }, [symbols.join(','), JSON.stringify(quotes)]);

  useEffect(() => {
    (async () => {
      try {
        setApiErr('');
        const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
        const r = await fetch(`${API}/movers?tf=${timeframe}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        // Optional: use server movers when available (structure assumed compatible)
        // Not strictly required; fall back to client compute when absent
      } catch (e) {
        setApiErr(String(e.message || e));
      }
    })();
  }, [timeframe]);

  const list = tab === 'GAINERS' ? gainers : losers;

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 900 }}>Top Movers</div>
        <div style={{ display:'flex', gap:8 }}>
          <div className="btn-group" role="tablist" aria-label="Movers tabs">
            <button className="btn" aria-selected={tab==='GAINERS'} onClick={()=>setTab('GAINERS')}>Gainers</button>
            <button className="btn" aria-selected={tab==='LOSERS'} onClick={()=>setTab('LOSERS')}>Losers</button>
          </div>
          <select className="inp" value={timeframe} onChange={(e)=>setTf(e.target.value)} aria-label="Timeframe">
            <option value="1D">1D</option>
            <option value="1W">1W</option>
          </select>
        </div>
      </div>
      {apiErr && <div className="muted" style={{ fontSize: 12 }}>offline mode</div>}
      <div style={{ display:'grid', gap:8 }}>
        {list.map((m) => (
          <div key={`${tab}-${m.symbol}`} className="card hover-lift" style={{ padding: 8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div className="avatar" style={{ width: 28, height: 28 }}>{m.symbol[0]}</div>
              <b>{m.symbol}</b>
            </div>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <Spark data={m.series || []} color={tab==='GAINERS' ? '#00ff88' : '#ff3366'} />
              <div className={m.changePct >= 0 ? 'pos' : 'neg'}>{m.changePct >= 0 ? '+' : ''}{m.changePct.toFixed(2)}%</div>
            </div>
          </div>
        ))}
        {!list.length && <div className="muted">No data</div>}
      </div>
    </div>
  );
}

