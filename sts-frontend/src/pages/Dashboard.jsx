// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

/**
 * EAZY BYTS Trade App — Structured Dashboard + Portfolio (Nested Nav) + Help
 *
 * What changed (high level):
 * 1) Clear order-wise structure: Layout → Sidebar → Header → Router-like main → Sections
 * 2) Portfolio gets its own in-page (nested) sidebar with sub-navigation:
 *    Overview (Pie), By Holding (per-symbol donut), Sectors (Pie), P&L (table)
 * 3) Lightweight SVG Pie/Donut charts (no libraries) with hover/selection
 * 4) Help section added in global nav + a floating “?” quick-help button
 * 5) Code trimmed where possible but not collapsed; existing features preserved
 */

export default function Dashboard() {
  const navigate = useNavigate();
  const authCtx = useAuth();
  const isAuthed = authCtx?.isAuthed;

  // ⛔ Redirect if unauthenticated
  useEffect(() => {
    if (typeof isAuthed !== 'undefined' && !isAuthed) {
      const t = setTimeout(() => navigate('/login', { replace: true }), 100);
      return () => clearTimeout(t);
    }
  }, [isAuthed, navigate]);

  // ────────────────────────────────────────────────────────────────────────────
  // UI State
  // ────────────────────────────────────────────────────────────────────────────
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Orders (kept minimal; used in stock modal demo)
  const [orderType, setOrderType] = useState('market');
  const [quantity, setQuantity] = useState(10);
  const [limitPrice, setLimitPrice] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Portfolio sub-navigation
  const [portfolioTab, setPortfolioTab] = useState('overview'); // overview | byHolding | sectors | pnl
  const [activeHolding, setActiveHolding] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Demo Data (Indices, Live Stocks)
  // ────────────────────────────────────────────────────────────────────────────
  const marketIndices = useMemo(() => [
    { name: 'NASDAQ', value: '15,450.75', change: '+2.50%', volume: '4,98M', positive: true },
    { name: 'NYSE', value: '38,120.30', change: '+1.80%', volume: '1.26B', positive: true },
    { name: 'S&P 500', value: '5,420.14', change: '+1.12%', volume: '3.21B', positive: true },
  ], []);

  const liveStocks = useMemo(() => [
    { symbol: 'AAPL', icon: '', price: '180.10', change: '+0.82%', positive: true, progress: 78, chartData: [40,65,55,70,80,75,85,82] },
    { symbol: 'TSLA', icon: 'T', price: '220.55', change: '-0.80%', positive: false, progress: 62, chartData: [30,45,35,50,60,65,70,72] },
    { symbol: 'TCS',  icon: 'T', price: '3,850.90', change: '+0.45%', positive: true, progress: 69, chartData: [50,60,55,45,40,42,43,44] },
  ], []);

  // Extra features cards
  const extraFeatures = useMemo(() => [
    { icon: '🧠', title: 'AI TRADING BOT', description: 'Automated intelligent trading' },
    { icon: '🌐', title: 'GLOBAL MARKET ACCESS', description: 'Trade worldwide markets' },
    { icon: '🛡️', title: 'ENHANCED SECURITY', description: 'Military‑grade encryption' },
  ], []);

  // ────────────────────────────────────────────────────────────────────────────
  // Portfolio Data + Derived Metrics
  // ────────────────────────────────────────────────────────────────────────────
  const holdings = useMemo(() => ([
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', qty: 12, avg: 150, price: 180 },
    { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Automobile', qty: 6, avg: 200, price: 220.5 },
    { symbol: 'TCS',  name: 'Tata Consultancy', sector: 'IT Services', qty: 10, avg: 3500, price: 3850 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', qty: 8, avg: 1400, price: 1525 },
  ]), []);

  const portfolioTotals = useMemo(() => {
    const items = holdings.map(h => ({
      ...h,
      cost: h.qty * h.avg,
      value: h.qty * h.price,
      pnl: (h.price - h.avg) * h.qty,
      pnlPct: ((h.price - h.avg) / h.avg) * 100,
    }));
    const totalCost = items.reduce((s,x) => s + x.cost, 0);
    const totalValue = items.reduce((s,x) => s + x.value, 0);
    const totalPnl = totalValue - totalCost;
    return { items, totalCost, totalValue, totalPnl, totalPnlPct: (totalPnl / totalCost) * 100 };
  }, [holdings]);

  const sectors = useMemo(() => {
    const m = new Map();
    portfolioTotals.items.forEach(h => {
      const prev = m.get(h.sector) || { label: h.sector, value: 0 };
      m.set(h.sector, { label: h.sector, value: prev.value + h.value });
    });
    return Array.from(m.values());
  }, [portfolioTotals.items]);

  // ────────────────────────────────────────────────────────────────────────────
  // Small Chart Helpers (SVG)
  // ────────────────────────────────────────────────────────────────────────────
  const linePoints = (data, width = 200, height = 60) => {
    if (!data?.length) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    return data.map((v, i) => {
      const x = i * (width / Math.max(data.length - 1, 1));
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
  };

  // Pie / Donut chart primitives
  const hueColor = (i) => `hsl(${(i * 67) % 360} 85% 60%)`; // repeatable distribution

  function Pie({ data, size = 220, inner = 0, label, selectedIndex = -1, onSliceHover }) {
    const total = Math.max(1e-6, data.reduce((s, d) => s + d.value, 0));
    const cx = size / 2, cy = size / 2, r = (size / 2) - 2, r0 = Math.max(0, inner);
    let a0 = -Math.PI/2; // start at top

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.45"/>
          </filter>
        </defs>
        {data.map((d, i) => {
          const a1 = a0 + (d.value / total) * Math.PI * 2;
          const large = (a1 - a0) > Math.PI ? 1 : 0;
          const x0 = cx + r * Math.cos(a0);
          const y0 = cy + r * Math.sin(a0);
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          const xi = cx + r0 * Math.cos(a1);
          const yi = cy + r0 * Math.sin(a1);
          const xj = cx + r0 * Math.cos(a0);
          const yj = cy + r0 * Math.sin(a0);
          const path = r0 > 0
            ? `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi} ${yi} A ${r0} ${r0} 0 ${large} 0 ${xj} ${yj} Z`
            : `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
          const mid = (a0 + a1) / 2;
          const lx = cx + (r0 ? (r + r0) / 2 : r * 0.6) * Math.cos(mid);
          const ly = cy + (r0 ? (r + r0) / 2 : r * 0.6) * Math.sin(mid);
          a0 = a1;
          const isSel = i === selectedIndex;
          return (
            <g key={i} onMouseEnter={() => onSliceHover?.(i)} onMouseLeave={() => onSliceHover?.(-1)}>
              <path d={path} fill={hueColor(i)} opacity={isSel ? 1 : 0.92} filter="url(#glow)"/>
              <text x={lx} y={ly} fontSize={11} textAnchor="middle" fill="#eaf6ff" style={{ pointerEvents: 'none' }}>
                {Math.round((d.value/total)*100)}%
              </text>
            </g>
          );
        })}
        {label && (
          <g>
            <circle cx={cx} cy={cy} r={Math.max(22, inner*0.9)} fill="rgba(255,255,255,0.06)"/>
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontWeight={800} fontSize={14} fill="#9ed9ff">
              {label}
            </text>
          </g>
        )}
      </svg>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────────────────
  const handlePlaceOrder = async (action) => {
    if (!quantity || quantity <= 0) return alert('Please enter a valid quantity.');
    if (orderType === 'limit' && (!limitPrice || Number(limitPrice) <= 0)) return alert('Please enter a valid limit price.');
    setLoadingOrder(true);
    try {
      await new Promise(r => setTimeout(r, 700));
      alert(`${action} order placed — { type: ${orderType}, qty: ${quantity}${orderType==='limit' ? `, price: ${limitPrice}`:''} }`);
      if (orderType === 'limit') setLimitPrice('');
    } catch (e) {
      console.error(e);
      alert('Order failed — check console');
    } finally {
      setLoadingOrder(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Layout + Styles
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        :root {
          --glass-bg: rgba(15, 25, 50, 0.45);
          --glass-border: rgba(255, 255, 255, 0.18);
          --glass-strong: rgba(10, 18, 38, 0.88);
          --muted: rgba(255, 255, 255, 0.75);
          --accent: #00d4ff;
          --accent-glow: rgba(0, 212, 255, 0.35);
          --success: #00ff88;
          --danger: #ff3366;
          --shadow: 0 8px 32px 0 rgba(0, 80, 150, 0.37);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; }
        body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; background: radial-gradient(1200px 600px at 20% 0%, #0b1430 0%, #0b0f25 45%, #091023 100%); color: #fff; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
        body::before { content: ''; position: fixed; inset: 0; background:
          radial-gradient(circle at 20% 50%, rgba(0, 150, 255, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(0, 212, 255, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(138, 43, 226, 0.05) 0%, transparent 50%);
          pointer-events: none; z-index: 0; }
        .shell { display: flex; min-height: 100vh; position: relative; z-index: 1; }
        .sidebar { width: 280px; position: fixed; inset: 0 auto 0 0; z-index: 50; display: flex; flex-direction: column; gap: 20px; padding: 28px 18px; background: var(--glass-bg); backdrop-filter: blur(20px) saturate(180%); border-right: 1px solid var(--glass-border); box-shadow: var(--shadow); transform: translateX(0); transition: transform .3s cubic-bezier(.4,0,.2,1); }
        .sidebar.mobileHidden { transform: translateX(-100%); }
        .logo { padding-bottom: 18px; border-bottom: 1px solid var(--glass-border); text-align: center; }
        .logoTitle { font-size: 26px; font-weight: 900; letter-spacing: 3px; background: linear-gradient(135deg, var(--accent) 0%, #00ff88 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 30px var(--accent-glow); }
        .logoSub { font-size: 10px; color: var(--muted); letter-spacing: 3px; margin-top: 5px; }
        .nav { display: flex; flex-direction: column; gap: 8px; flex: 1; margin-top: 16px; }
        .nav button { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius: 14px; background: transparent; border: none; color: rgba(255,255,255,.9); cursor:pointer; font-weight: 700; font-size: 15px; transition: all .2s; position: relative; overflow: hidden; }
        .nav button:hover { background: rgba(0, 212, 255, 0.08); transform: translateX(4px); }
        .nav button.active { background: linear-gradient(135deg, rgba(0, 212, 255, 0.22) 0%, rgba(138, 43, 226, 0.22) 100%); border-left: 4px solid var(--accent); }
        .userBox { display:flex; align-items:center; gap:12px; padding:12px; background: var(--glass-bg); border:1px solid var(--glass-border); border-radius: 14px; }
        .avatar { width:44px; height:44px; border-radius:999px; background: linear-gradient(135deg, var(--accent), #8a2be2); display:flex; align-items:center; justify-content:center; font-weight: 900; color:#000; }
        .main { margin-left: 280px; padding: 28px 34px; flex: 1; min-height: 100vh; overflow: auto; }
        @media (max-width: 900px) { .main { margin-left: 0; padding: 22px 18px; } .menuBtn { display: inline-flex !important; } .sidebar { width: 82%; } }
        .header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 22px; }
        .title { font-size: 34px; font-weight: 900; background: linear-gradient(135deg, #fff 0%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .menuBtn { display:none; background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--muted); font-size:22px; padding: 10px 14px; border-radius:10px; cursor: pointer; }
        .grid { display: grid; gap: 20px; }
        .indices { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-bottom: 18px; }
        .card { background: var(--glass-bg); backdrop-filter: blur(20px) saturate(180%); border: 1px solid var(--glass-border); border-radius: 18px; padding: 20px; box-shadow: var(--shadow); transition: all .3s; position: relative; overflow: hidden; }
        .card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0, 212, 255, 0.25); }
        .muted { color: var(--muted); }
        .pos { color: var(--success); font-weight: 800; }
        .neg { color: var(--danger); font-weight: 800; }
        .stocks { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
        .progress { width:100%; height:4px; background: rgba(255,255,255,.1); border-radius:2px; overflow: hidden; margin-top: 12px; }
        .progress > span { display:block; height:100%; background: linear-gradient(90deg, var(--success), var(--accent)); }

        /* Portfolio nested sidebar */
        .portfolioWrap { display: grid; grid-template-columns: 220px 1fr; gap: 20px; }
        @media (max-width: 1100px) { .portfolioWrap { grid-template-columns: 1fr; } }
        .pSide { position: sticky; top: 18px; align-self: start; display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 16px; border: 1px solid var(--glass-border); background: rgba(0,0,0,.25); }
        .pSide .h { font-size: 13px; letter-spacing: .12em; color: var(--muted); font-weight: 900; }
        .pBtn { text-align:left; background: transparent; border: 1px solid var(--glass-border); color: #e9f7ff; padding: 10px 12px; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .pBtn.active { background: rgba(0, 212, 255, 0.12); border-color: var(--accent); }

        /* Tables */
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.08); font-size: 14px; }
        th { color: #a7dfff; font-weight: 900; letter-spacing: .03em; background: rgba(0,212,255,.05); }

        /* Modal / Overlay */
        .overlay { position: fixed; inset: 0; background: rgba(0,10,30,.75); backdrop-filter: blur(8px); z-index: 100; display:flex; align-items:center; justify-content:center; animation: fadeIn .25s ease; }
        .modal { background: var(--glass-strong); border: 2px solid var(--glass-border); border-radius: 22px; padding: 26px 28px; max-width: 560px; width: 92%; box-shadow: 0 20px 60px rgba(0,0,0,.5); position: relative; }
        .close { position:absolute; top: 10px; right: 14px; background: none; border: none; color: #fff; font-size: 28px; cursor: pointer; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        /* Floating quick help */
        .floatHelp { position: fixed; bottom: 20px; right: 24px; z-index: 40; }
        .floatHelp button { width: 44px; height: 44px; border-radius: 999px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: #e8fbff; font-weight: 900; cursor: pointer; box-shadow: var(--shadow); }
      `}</style>

      <div className="shell">
        {/* ───────── Sidebar (Global) ───────── */}
        <aside className={`sidebar ${sidebarOpen ? '' : 'mobileHidden'}`} role="navigation">
          <div className="logo">
            <div className="logoTitle">EAZY BYTS</div>
            <div className="logoSub">TRADE APP</div>
          </div>

          <nav className="nav">
            {[
              { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
              { id: 'portfolio', icon: '💼', label: 'Portfolio' },
              { id: 'orders', icon: '📋', label: 'Orders' },
              { id: 'analytics', icon: '📊', label: 'Analytics' },
              { id: 'watch', icon: '👀', label: 'Watchlist' },
              { id: 'help', icon: '❓', label: 'Help' },
              { id: 'settings', icon: '⚙️', label: 'Settings' },
            ].map(m => (
              <button key={m.id} className={selectedMenu === m.id ? 'active' : ''} onClick={() => { setSelectedMenu(m.id); setSidebarOpen(false); }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </nav>

          <div className="userBox">
            <div className="avatar">U</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Trading Pro</div>
              <div className="muted" style={{ fontSize: 12 }}>Premium Member</div>
            </div>
          </div>
        </aside>

        {/* ───────── Main Content ───────── */}
        <main className="main">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button className="menuBtn" onClick={() => setSidebarOpen(s => !s)}>☰</button>
              <div>
                <div className="title">{selectedMenu === 'portfolio' ? 'Portfolio' : 'Trading Dashboard'}</div>
                <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                  {selectedMenu === 'portfolio' ? 'Overview, drill‑downs, sectors and P&L — all in one place' : 'Real‑time market insights & AI‑powered analytics'}
                </div>
              </div>
            </div>
            <div>
              <button className="pBtn" onClick={() => setShowAIModal(true)}>🧠 AI</button>
              <span style={{ display: 'inline-block', width: 8 }} />
              <button className="pBtn" onClick={() => setShowHelp(true)}>❓ Help</button>
            </div>
          </div>

          {/* Router-like switch */}
          {selectedMenu === 'dashboard' && (
            <>
              {/* Market Indices */}
              <section className="grid indices">
                {marketIndices.map((idx, i) => (
                  <div key={idx.name} className="card" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: `all .4s ease ${i * .07}s` }}>
                    <div className="muted" style={{ fontWeight: 900, letterSpacing: '.08em' }}>{idx.name}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>
                      <span className={idx.positive ? 'pos' : 'neg'}>{idx.change}</span> / {idx.value}
                    </div>
                    <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>Volume: <b>{idx.volume}</b></div>
                  </div>
                ))}
              </section>

              {/* Live Stocks */}
              <section className="grid stocks">
                {liveStocks.map((s, i) => (
                  <div key={s.symbol} className="card" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: `all .4s ease ${(i + 2) * .07}s` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={{ width: 44, height: 44 }}>{s.icon}</div>
                      <div>
                        <div className="muted" style={{ fontWeight: 800 }}>{s.symbol}</div>
                        <div style={{ fontSize: 22, fontWeight: 900 }}>{s.price} USD</div>
                        <div className={s.positive ? 'pos' : 'neg'} style={{ fontSize: 13 }}>{s.change}</div>
                      </div>
                    </div>
                    <div className="progress"><span style={{ width: `${s.progress}%` }} /></div>
                    <svg style={{ marginTop: 12, width: '100%', height: 60 }} viewBox="0 0 200 60" preserveAspectRatio="none">
                      <polyline fill="none" stroke={s.positive ? '#00ff88' : '#ff3366'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints(s.chartData, 200, 60)} />
                    </svg>
                  </div>
                ))}
              </section>

              {/* Extras */}
              <section className="card" style={{ marginTop: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12, letterSpacing: '.06em' }}>EXTRA FEATURES</div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
                  {extraFeatures.map((f, i) => (
                    <button key={f.title} className="pBtn" onClick={() => setShowAIModal(true)} style={{ textAlign: 'center', padding: 18 }}>
                      <div style={{ fontSize: 44, filter: 'drop-shadow(0 4px 12px rgba(0,212,255,.35))' }}>{f.icon}</div>
                      <div style={{ color: 'var(--accent)', fontWeight: 900, marginTop: 6 }}>{f.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{f.description}</div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {selectedMenu === 'portfolio' && (
            <section className="portfolioWrap">
              {/* Nested Sidebar (in‑page) */}
              <div className="pSide card">
                <div className="h">PORTFOLIO NAV</div>
                {[
                  { id: 'overview', label: 'Overview (Pie)' },
                  { id: 'byHolding', label: 'By Holding (Donut)' },
                  { id: 'sectors', label: 'Sectors (Pie)' },
                  { id: 'pnl', label: 'P&L (Table)' },
                ].map(t => (
                  <button key={t.id} className={`pBtn ${portfolioTab === t.id ? 'active' : ''}`} onClick={() => setPortfolioTab(t.id)}>{t.label}</button>
                ))}

                <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '12px 0' }} />
                <div className="h">ACTIONS</div>
                <button className="pBtn" onClick={() => setShowHelp(true)}>How to read charts</button>
              </div>

              {/* Right Pane */}
              <div>
                {portfolioTab === 'overview' && (
                  <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>Overall Allocation</div>
                        <div className="muted" style={{ fontSize: 13 }}>Total Value: <b>${portfolioTotals.totalValue.toLocaleString()}</b> • P&L: <b className={portfolioTotals.totalPnl >= 0 ? 'pos' : 'neg'}>{portfolioTotals.totalPnl >= 0 ? '+' : ''}{portfolioTotals.totalPnl.toFixed(2)} ({portfolioTotals.totalPnlPct.toFixed(2)}%)</b></div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 18, marginTop: 16 }}>
                      <Pie
                        data={portfolioTotals.items.map((h) => ({ label: h.symbol, value: h.value }))}
                        size={240}
                        inner={70}
                        label={'Value'}
                      />

                      <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Legend</div>
                        {portfolioTotals.items.map((h, i) => (
                          <div key={h.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,.07)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 12, height: 12, borderRadius: 3, background: hueColor(i), display: 'inline-block' }} />
                              <b>{h.symbol}</b>
                              <span className="muted" style={{ fontSize: 13 }}>{h.name}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div>${h.value.toLocaleString()}</div>
                              <div className={h.pnl >= 0 ? 'pos' : 'neg'} style={{ fontSize: 12 }}>{h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)} ({h.pnlPct.toFixed(2)}%)</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {portfolioTab === 'byHolding' && (
                  <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18 }}>
                      <div className="card" style={{ padding: 0 }}>
                        <table>
                          <thead>
                            <tr><th>Symbol</th><th>Qty</th><th>Value</th></tr>
                          </thead>
                          <tbody>
                            {portfolioTotals.items.map(h => (
                              <tr key={h.symbol} style={{ cursor: 'pointer', background: activeHolding?.symbol === h.symbol ? 'rgba(0,212,255,.08)' : 'transparent' }} onClick={() => setActiveHolding(h)}>
                                <td><b>{h.symbol}</b></td>
                                <td>{h.qty}</td>
                                <td>${h.value.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) 1fr', gap: 18, alignItems: 'center' }}>
                        {activeHolding ? (
                          <>
                            <Pie
                              data={[{ label: 'Cost', value: activeHolding.cost }, { label: 'PnL', value: Math.max(0, activeHolding.pnl) }]}
                              size={260}
                              inner={70}
                              label={activeHolding.symbol}
                            />
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 900 }}>{activeHolding.name}</div>
                              <div className="muted" style={{ marginTop: 4 }}>Sector: <b>{activeHolding.sector}</b></div>
                              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                <div className="card" style={{ padding: 12 }}>
                                  <div className="muted" style={{ fontSize: 12 }}>Avg / Price</div>
                                  <div><b>${activeHolding.avg}</b> → <b>${activeHolding.price}</b></div>
                                </div>
                                <div className="card" style={{ padding: 12 }}>
                                  <div className="muted" style={{ fontSize: 12 }}>Cost / Value</div>
                                  <div><b>${activeHolding.cost.toLocaleString()}</b> → <b>${activeHolding.value.toLocaleString()}</b></div>
                                </div>
                                <div className="card" style={{ padding: 12 }}>
                                  <div className="muted" style={{ fontSize: 12 }}>PnL</div>
                                  <div className={activeHolding.pnl >= 0 ? 'pos' : 'neg'}><b>{activeHolding.pnl >= 0 ? '+' : ''}{activeHolding.pnl.toFixed(2)}</b> ({activeHolding.pnlPct.toFixed(2)}%)</div>
                                </div>
                                <div className="card" style={{ padding: 12 }}>
                                  <div className="muted" style={{ fontSize: 12 }}>Quantity</div>
                                  <div><b>{activeHolding.qty}</b> shares</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                                <button className="pBtn" onClick={() => handlePlaceOrder('Buy')}>BUY</button>
                                <button className="pBtn" onClick={() => handlePlaceOrder('Sell')}>SELL</button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="muted">Select a holding from the table to see its donut (Cost vs Profit)</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {portfolioTab === 'sectors' && (
                  <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Sector Allocation</div>
                    <div className="muted" style={{ marginBottom: 12 }}>Compare distribution by sector</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 18 }}>
                      <Pie data={sectors} size={240} inner={60} label={'Sectors'} />
                      <div className="card" style={{ padding: 16 }}>
                        {sectors.map((s, i) => (
                          <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,.07)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 12, height: 12, borderRadius: 3, background: hueColor(i), display: 'inline-block' }} />
                              <b>{s.label}</b>
                            </div>
                            <div>${Math.round(s.value).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {portfolioTab === 'pnl' && (
                  <div className="card" style={{ padding: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Name</th>
                          <th>Qty</th>
                          <th>Avg</th>
                          <th>Price</th>
                          <th>Cost</th>
                          <th>Value</th>
                          <th>PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioTotals.items.map(h => (
                          <tr key={h.symbol}>
                            <td><b>{h.symbol}</b></td>
                            <td className="muted">{h.name}</td>
                            <td>{h.qty}</td>
                            <td>${h.avg}</td>
                            <td>${h.price}</td>
                            <td>${h.cost.toLocaleString()}</td>
                            <td>${h.value.toLocaleString()}</td>
                            <td className={h.pnl >= 0 ? 'pos' : 'neg'}>{h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)} ({h.pnlPct.toFixed(2)}%)</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'right', fontWeight: 900 }}>TOTAL</td>
                          <td><b>${portfolioTotals.totalCost.toLocaleString()}</b></td>
                          <td><b>${portfolioTotals.totalValue.toLocaleString()}</b></td>
                          <td className={portfolioTotals.totalPnl >= 0 ? 'pos' : 'neg'}><b>{portfolioTotals.totalPnl >= 0 ? '+' : ''}{portfolioTotals.totalPnl.toFixed(2)}</b> ({portfolioTotals.totalPnlPct.toFixed(2)}%)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {selectedMenu === 'help' && (
            <section className="card" style={{ padding: 22 }}>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Help & Shortcuts</div>
              <div className="muted" style={{ marginBottom: 12 }}>Quick guide for navigation and charts</div>
              <ol style={{ lineHeight: 1.9, marginLeft: 18 }}>
                <li>Open <b>Portfolio</b> → Use the left nested nav to switch: Overview / By Holding / Sectors / P&L.</li>
                <li>In <b>Overview</b>, the donut shows value share by symbol. Hover to see slice %.</li>
                <li>In <b>By Holding</b>, click a row to view a donut of <i>Cost vs Profit</i> and quick trade buttons.</li>
                <li><b>Sectors</b> summarizes allocation across sectors.</li>
                <li><b>P&L</b> shows a table with totals at the bottom.</li>
              </ol>
            </section>
          )}

          {/* Micro footer */}
          <div className="muted" style={{ marginTop: 18, textAlign: 'center', fontSize: 12 }}>EAZY BYTS TRADE APP • Structured UI • Nested Portfolio Nav • SVG Charts</div>
        </main>
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div className="overlay" onClick={() => setShowAIModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowAIModal(false)}>&times;</button>
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10, color: 'var(--accent)' }}>🧠 Trade Assistant</div>
            <div className="muted" style={{ lineHeight: 1.7 }}>
              Predictive market trends, automated portfolio optimization, and real‑time risk signals.
            </div>
          </div>
        </div>
      )}

      {/* Help Overlay (Quick) */}
      {showHelp && (
        <div className="overlay" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowHelp(false)}>&times;</button>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>How to use the Portfolio</div>
            <ul style={{ lineHeight: 1.9, marginLeft: 18 }}>
              <li>Use the <b>Portfolio Nav</b> on the left to switch between tabs.</li>
              <li><b>Overview</b>: Donut shows allocation by symbol. The legend lists value & PnL.</li>
              <li><b>By Holding</b>: Select a row → see Donut (Cost vs Profit), quick <b>BUY/SELL</b>.</li>
              <li><b>Sectors</b>: Distribution of value by sector.</li>
              <li><b>P&L</b>: Full table with totals.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Floating Quick Help Button */}
      <div className="floatHelp">
        <button onClick={() => setShowHelp(true)}>?</button>
      </div>
    </>
  );
}
