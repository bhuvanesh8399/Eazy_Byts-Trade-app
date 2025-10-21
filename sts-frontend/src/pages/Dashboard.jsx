import React, { useState, useMemo } from 'react';

/**
 * Dashboard.jsx - Single-file Dashboard for EAZY_BYTZ TRADE-APP
 * - Inline <style> for copy/paste
 * - Responsive: fixed sidebar on desktop, toggle on mobile
 * - Watchlist with inline SVG mini-charts, Live Quotes, Order panel, Portfolio charts
 * - Replace mock data with real API calls as needed
 */

export default function Dashboard() {
  // UI state
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [orderType, setOrderType] = useState('market'); // 'market' | 'limit'
  const [quantity, setQuantity] = useState(10);
  const [limitPrice, setLimitPrice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Mock data (replace with fetch calls)
  const watchlist = useMemo(() => [
    { symbol: 'AAPL', price: '175.14', change: 2.5, positive: true },
    { symbol: 'MSFT', price: '390.45', change: 1.8, positive: true },
    { symbol: 'GOOGL', price: '156.77', change: -0.5, positive: false },
    { symbol: 'TSLA', price: '181.62', change: -2.1, positive: false }
  ], []);

  const liveQuote = useMemo(() => ({
    price: '11,523.45',
    change: '-314.59',
    changePercent: '-2.66',
    positive: false
  }), []);

  const equity = useMemo(() => ({
    value: '11,523.45',
    change: '314.59',
    changePercent: '+2.66',
    positive: true
  }), []);

  const pnl = useMemo(() => ({
    value: '276.50',
    label: 'P&L',
    positive: true
  }), []);

  // Utility: generate simple chart points (returns scaled points string for polyline)
  const generatePolyline = (count = 8, min = 5, max = 25, width = 80, height = 30) => {
    const points = Array.from({ length: count }, (_, i) => {
      const y = min + Math.random() * (max - min);
      const x = (i * (width / Math.max(count - 1, 1)));
      // invert y for SVG coordinate system
      return `${x},${height - y}`;
    });
    return points.join(' ');
  };

  // Place order (mock) - show how to call backend later
  const handlePlaceOrder = async (action) => {
    // Basic validation
    if (!quantity || quantity <= 0) {
      return alert('Please enter a valid quantity.');
    }
    if (orderType === 'limit' && (!limitPrice || Number(limitPrice) <= 0)) {
      return alert('Please enter a valid limit price for limit orders.');
    }

    setLoadingOrder(true);
    try {
      // Replace this with real API call
      const orderData = {
        action,
        orderType,
        quantity,
        ...(orderType === 'limit' ? { limitPrice } : {})
      };
      console.log('Placing order', orderData);

      // fake network delay
      await new Promise((r) => setTimeout(r, 700));

      alert(`${action} order placed — ${JSON.stringify(orderData)}`);
      // clear limit price if placed
      if (orderType === 'limit') setLimitPrice('');
    } catch (e) {
      console.error(e);
      alert('Order failed — check console');
    } finally {
      setLoadingOrder(false);
    }
  };

  // Sidebar menu items
  const menuItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'portfolio', icon: '💼', label: 'Portfolio' },
    { id: 'orders', icon: '📋', label: 'Orders' },
    { id: 'watch', icon: '👀', label: 'Watchlist' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  return (
    <>
      <style>{`
        :root{
          --bg: #0a0e1a;
          --panel: rgba(15,23,42,0.6);
          --muted: rgba(255,255,255,0.65);
          --accent: #3b82f6;
          --success: #10b981;
          --danger: #ef4444;
        }
        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{margin:0;background:linear-gradient(180deg,#070815,#071026);color:#eaf6ff;font-family:Inter,system-ui,Segoe UI,Roboto,Arial}
        .dashboard-shell{display:flex;min-height:100vh;position:relative}
        /* sidebar */
        .sidebar{
          width:260px;
          position:fixed;
          left:0;top:0;bottom:0;
          padding:28px 16px;
          background:linear-gradient(180deg, rgba(12,18,36,0.9), rgba(10,14,26,0.85));
          border-right:1px solid rgba(255,255,255,0.03);
          display:flex;
          flex-direction:column;
          gap:18px;
          z-index:30;
          transition: transform 280ms ease;
        }
        .sidebar .logo{padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.03)}
        .logoTitle{font-size:20px;font-weight:700;letter-spacing:2px}
        .logoSub{font-size:11px;color:var(--muted);letter-spacing:2px}
        .nav{display:flex;flex-direction:column;gap:8px;margin-top:8px;flex:1}
        .nav button{display:flex;align-items:center;gap:12px;padding:12px;border-radius:8px;background:transparent;border:none;color:rgba(255,255,255,0.72);cursor:pointer;text-align:left;font-weight:600}
        .nav button:hover{background:rgba(59,130,246,0.06)}
        .nav button.active{background:rgba(59,130,246,0.14);color:#fff;border-left:3px solid var(--accent)}
        .userBox{display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:8px}
        .avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(90deg,var(--accent),#60a5fa);display:flex;align-items:center;justify-content:center;font-weight:700}
        /* mobile sidebar */
        .sidebar.mobileHidden{transform: translateX(-110%)} 

        /* main */
        .main{
          margin-left:260px;
          padding:28px;
          flex:1;
          min-height:100vh;
          overflow:auto;
        }

        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
        .title{font-size:26px;font-weight:700}
        .menuBtn{display:none;background:transparent;border:none;color:var(--muted);font-size:20px;padding:8px;cursor:pointer;border-radius:8px}
        .menuBtn:hover{background:rgba(255,255,255,0.02)}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        /* make some cards span two cols on wide screens */
        .card{background:var(--panel);padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,0.03)}
        .cardWide{grid-column: span 2}
        .cardTitle{font-size:15px;font-weight:600;margin-bottom:12px;color:#eaf6ff}
        .watchItem{display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;background:rgba(0,0,0,0.12);margin-bottom:10px}
        .watchLeft{display:flex;flex-direction:column}
        .symbol{font-weight:700}
        .price{font-weight:600}
        .miniSvg{width:96px;height:34px}
        .orderPanel{display:flex;flex-direction:column;gap:10px}
        .toggle{display:flex;background:rgba(255,255,255,0.03);padding:6px;border-radius:8px}
        .toggle button{flex:1;padding:8px;border-radius:6px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-weight:600}
        .toggle button.active{background:rgba(59,130,246,0.2);color:#fff}
        input[type="number"], input[type="text"]{padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.16);color:inherit}
        .actions{display:flex;gap:10px;margin-top:6px}
        .buy{flex:1;padding:10px;border-radius:8px;border:none;background:var(--accent);color:#071026;font-weight:700;cursor:pointer}
        .sell{flex:1;padding:10px;border-radius:8px;border:none;background:rgba(255,255,255,0.06);color:inherit;cursor:pointer}
        .liveRow{display:flex;align-items:center;gap:18px;justify-content:space-between}
        .livePrice{font-size:28px;font-weight:800}
        .chartSvg{width:100%;height:80px}
        .equityBox{display:flex;flex-direction:column;gap:8px}
        .pnlBox{display:flex;justify-content:space-between;padding:10px;background:rgba(0,0,0,0.12);border-radius:8px}
        .micro{margin-top:12px;color:var(--muted);font-size:13px;text-align:center}

        /* responsive */
        @media (max-width: 1024px){
          .grid{grid-template-columns:repeat(2,1fr)}
          .cardWide{grid-column: span 2}
        }
        @media (max-width: 768px){
          .sidebar{position:fixed;z-index:40;transform:translateX(-110%);width:72%;max-width:320px}
          .sidebar.mobileHidden{transform:translateX(-110%)}
          .sidebar.mobileShow{transform:translateX(0)}
          .main{margin-left:0;padding:18px}
          .menuBtn{display:inline-flex}
        }
      `}</style>

      <div className="dashboard-shell">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'mobileShow' : 'mobileHidden'}`} role="navigation" aria-label="Main navigation">
          <div className="logo">
            <div className="logoTitle">EAZY BYTZ</div>
            <div className="logoSub">TRADE APP</div>
          </div>

          <nav className="nav" aria-label="App menu">
            {menuItems.map((m) => (
              <button
                key={m.id}
                className={selectedMenu === m.id ? 'active' : ''}
                onClick={() => { setSelectedMenu(m.id); setSidebarOpen(false); }}
                aria-current={selectedMenu === m.id ? 'page' : undefined}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </nav>

          <div className="userBox" role="region" aria-label="User">
            <div className="avatar">U</div>
            <div>
              <div style={{ fontWeight: 700 }}>User</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Member</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="main" role="main">
          <div className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="menuBtn" aria-label="Toggle menu" onClick={() => setSidebarOpen(s => !s)}>☰</button>
              <div>
                <div className="title">Dashboard</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Welcome back — make moves.</div>
              </div>
            </div>
            <div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 20 }}>⋯</button>
            </div>
          </div>

          <section className="grid" aria-live="polite">
            {/* Watchlist */}
            <div className="card" role="region" aria-label="Watchlist">
              <div className="cardTitle">Watchlist</div>
              <div>
                {watchlist.map((s) => (
                  <div key={s.symbol} className="watchItem" onClick={() => alert(`${s.symbol} clicked`)}>
                    <div className="watchLeft">
                      <div className="symbol">{s.symbol}</div>
                      <div className="price" style={{ color: s.positive ? 'var(--success)' : 'var(--danger)' }}>
                        {s.price} <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.change}%</span>
                      </div>
                    </div>
                    <svg className="miniSvg" viewBox="0 0 88 34" preserveAspectRatio="none" aria-hidden>
                      <polyline
                        fill="none"
                        stroke={s.positive ? '#10b981' : '#ef4444'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={generatePolyline(8, 5, 20, 80, 30)}
                      />
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Panel */}
            <div className="card" role="region" aria-label="Order panel">
              <div className="cardTitle">Order Type</div>
              <div className="orderPanel">
                <div className="toggle" role="tablist" aria-label="Order type">
                  <button className={orderType === 'market' ? 'active' : ''} onClick={() => setOrderType('market')}>Market</button>
                  <button className={orderType === 'limit' ? 'active' : ''} onClick={() => setOrderType('limit')}>Limit</button>
                </div>

                <div>
                  <label style={{ fontSize: 13, color: 'var(--muted)' }}>Quantity</label>
                  <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                </div>

                {orderType === 'limit' && (
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--muted)' }}>Limit Price</label>
                    <input type="text" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="Enter limit price"/>
                  </div>
                )}

                <div className="actions" role="group" aria-label="Buy or sell">
                  <button className="buy" onClick={() => handlePlaceOrder('Buy')} disabled={loadingOrder}>Buy</button>
                  <button className="sell" onClick={() => handlePlaceOrder('Sell')} disabled={loadingOrder}>Sell</button>
                </div>
              </div>
            </div>

            {/* Live Quotes (wide) */}
            <div className="cardWide card" role="region" aria-label="Live quotes">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="cardTitle">Live Quotes</div>
                <div style={{ color: 'var(--muted)' }}>Real-time</div>
              </div>

              <div className="liveRow" style={{ marginTop: 6 }}>
                <div>
                  <div className="livePrice">${liveQuote.price}</div>
                  <div style={{ color: liveQuote.positive ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                    {liveQuote.positive ? '↑' : '↓'} {liveQuote.change} ({liveQuote.changePercent}%)
                  </div>
                </div>

                <svg viewBox="0 0 260 80" className="chartSvg" aria-hidden>
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    points={generatePolyline(30, 6, 70, 250, 80)}
                  />
                </svg>
              </div>
            </div>

            {/* Portfolio Chart (wide) */}
            <div className="cardWide card" role="region" aria-label="Portfolio">
              <div className="cardTitle">Portfolio</div>
              <svg viewBox="0 0 600 180" style={{ width: '100%', height: 180 }} aria-hidden>
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  points={generatePolyline(40, 20, 160, 600, 180)}
                />
              </svg>
            </div>

            {/* Equity */}
            <div className="card" role="region" aria-label="Equity summary">
              <div className="cardTitle">Equity</div>
              <div className="equityBox">
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--success)' }}>${equity.value}</div>
                <div style={{ color: equity.positive ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                  {equity.positive ? '↑' : '↓'} ${equity.change} ({equity.changePercent})
                </div>

                <div className="pnlBox">
                  <div style={{ color: 'var(--muted)' }}>{pnl.label}</div>
                  <div style={{ color: pnl.positive ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>${pnl.value}</div>
                </div>
              </div>
            </div>

            {/* Strategy Backtest (wide) */}
            <div className="cardWide card" role="region" aria-label="Strategy backtest">
              <div className="cardTitle">Strategy Backtest</div>
              <svg viewBox="0 0 600 180" style={{ width: '100%', height: 180 }} aria-hidden>
                <polyline
                  fill="none"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="2"
                  points={generatePolyline(40, 20, 160, 600, 180)}
                />
              </svg>
            </div>
          </section>

          <div className="micro">Prototype UI — plug in real endpoints to make it live.</div>
        </main>
      </div>
    </>
  );
}
