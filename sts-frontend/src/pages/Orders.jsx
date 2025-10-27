// src/pages/Orders.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { useOrders } from '../context/OrdersProvider';

export default function Orders() {
  const navigate = useNavigate();
  const authCtx = useAuth();
  const isAuthed = authCtx?.isAuthed;

  // Provider (safe if hook not wired yet)
  const ordersCtx = (typeof useOrders === 'function' ? useOrders() : null) || {};
  const {
    orders = [],
    loading = false,
    err = null,
    cancelOrder = () => {},
    reload = () => {},
  } = ordersCtx;

  // Redirect unauthenticated
  useEffect(() => {
    if (typeof isAuthed !== 'undefined' && !isAuthed) {
      const t = setTimeout(() => navigate('/login', { replace: true }), 100);
      return () => clearTimeout(t);
    }
  }, [isAuthed, navigate]);

  // UI State
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [compactRows, setCompactRows] = useState(false);
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Live autoreload (poll fallback) if provider doesn’t stream
  useEffect(() => {
    if (!liveRefresh) return;
    const t = setInterval(() => reload?.(), 8000);
    return () => clearInterval(t);
  }, [liveRefresh, reload]);

  // Close modals on ESC
  const escListener = useCallback((e) => {
    if (e.key === 'Escape') {
      setShowAIAssistant(false);
      setShowNotifications(false);
      setShowSettings(false);
      setSelectedOrder(null);
    }
  }, []);
  useEffect(() => {
    window.addEventListener('keydown', escListener);
    return () => window.removeEventListener('keydown', escListener);
  }, [escListener]);

  // Sidebar stocks (demo)
  const stockValues = useMemo(
    () => [
      { symbol: 'APPL', change: '+1.2%', positive: true },
      { symbol: 'MSFT', change: '0.9%', positive: true },
      { symbol: 'MST', change: '0.9%', positive: true },
      { symbol: 'MSFT', change: '0.9%', positive: true },
      { symbol: 'AMZN', change: '-0.3%', positive: false },
      { symbol: 'NVDA', change: '-2.1%', positive: false },
      { symbol: 'NVDA', change: '-2.1%', positive: false },
    ],
    []
  );

  // Quick stats (demo)
  const quickStats = useMemo(
    () => [
      {
        label: 'SELL',
        value: '19.9%',
        subtext: 'HIGH INNOVATIVE UPDATE - GLOBAL MARKETS',
        type: 'sell',
        chartData: [30, 45, 40, 55, 50, 60, 55],
      },
      {
        label: 'BUY',
        value: '36.8%',
        subtext: 'REAL-TIME INTELLIGENCE FEED',
        type: 'buy',
        chartData: [20, 35, 45, 55, 65, 70, 75],
      },
      {
        label: 'ORDER QUANTITY',
        value: (orders?.length ?? 0).toLocaleString(),
        subtext: 'TOTAL ORDERS',
        type: 'neutral',
      },
    ],
    [orders]
  );

  // Adapt backend orders to UI cells
  const orderBook = useMemo(() => {
    return (orders || []).map((o) => {
      const side = (o.side || '').toString().toUpperCase();
      const ordType = (o.type || o.orderType || 'MARKET').toString().toUpperCase();
      const qty = Number(o.qty ?? o.quantity ?? 0);
      const limit = o.limitPrice ?? o.limit ?? null;
      const execPrice = o.price ?? o.avgExecPrice ?? null;
      const status = (o.status || 'PENDING').toString().toUpperCase();
      return {
        id: o.id,
        asset: o.symbol || o.ticker || '-',
        type: side || '-',
        qty,
        orderCell: ordType === 'LIMIT' ? `$${Number(limit).toLocaleString()}` : ordType,
        execCell: execPrice != null ? `$${Number(execPrice).toLocaleString()}` : (o.execution || '—'),
        status,
        raw: o,
      };
    });
  }, [orders]);

  // Mini chart
  const generateChartPoints = (data, width = 120, height = 40) => {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    return data
      .map((val, i) => {
        const x = i * (width / Math.max(data.length - 1, 1));
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  };

  // Theme class on container
  const themeClass = darkMode ? 'theme-dark' : 'theme-light';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

        :root {
          --glass-bg: rgba(15, 25, 50, 0.35);
          --glass-border: rgba(255, 255, 255, 0.15);
          --glass-strong: rgba(10, 18, 38, 0.75);
          --muted: rgba(255, 255, 255, 0.7);
          --accent: #00d4ff;
          --accent-glow: rgba(0, 212, 255, 0.4);
          --success: #00ff88;
          --danger: #ff3366;
          --shadow: 0 8px 32px 0 rgba(0, 80, 150, 0.37);
          --bg: #0a0e27;
          --bg2: #1a1f3a;
          --bg3: #0f1829;
          --text: #ffffff;
          --rowGap: 16px;
        }
        .theme-light {
          --glass-bg: rgba(255, 255, 255, 0.65);
          --glass-border: rgba(0, 0, 0, 0.08);
          --glass-strong: rgba(255, 255, 255, 0.92);
          --muted: rgba(0, 0, 0, 0.55);
          --accent: #0077ff;
          --accent-glow: rgba(0, 119, 255, 0.25);
          --success: #00a86b;
          --danger: #e11d48;
          --shadow: 0 8px 28px rgba(0, 0, 0, 0.15);
          --bg: #f4f8ff;
          --bg2: #eaf2ff;
          --bg3: #f7fbff;
          --text: #0d1321;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; }
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: linear-gradient(135deg, var(--bg) 0%, var(--bg2) 50%, var(--bg3) 100%);
          color: var(--text);
          -webkit-font-smoothing: antialiased;
        }
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 20% 50%, rgba(0, 150, 255, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(0, 212, 255, 0.06) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .orders-container { display: flex; min-height: 100vh; position: relative; z-index: 1; }

        /* Left Sidebar - Stock Values */
        .stock-sidebar {
          width: 200px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          border-right: 1px solid var(--glass-border);
          padding: 32px 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: var(--shadow);
        }
        .sidebar-title { font-size: 16px; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px; color: var(--accent); }
        .stock-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 10px; background: rgba(255,255,255,0.02);
          border-radius: 8px; margin-bottom: 6px; transition: all 0.2s ease; cursor: pointer;
        }
        .stock-item:hover { background: rgba(0,212,255,0.08); transform: translateX(4px); }
        .stock-symbol { font-weight: 700; font-size: 14px; }
        .stock-change { font-weight: 700; font-size: 13px; }
        .positive { color: var(--success); }
        .negative { color: var(--danger); }

        /* Main Content */
        .main-content { flex: 1; padding: 32px 40px; overflow-y: auto; }
        @media (max-width: 900px) { .main-content { padding: 24px 20px; } .stock-sidebar, .controls-sidebar { display:none; } }

        .header { margin-bottom: 32px; }
        .app-title {
          font-size: 48px; font-weight: 900; letter-spacing: 4px; text-align: center;
          background: linear-gradient(135deg, #fff 0%, var(--accent) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 40px; text-shadow: 0 0 40px var(--accent-glow);
        }

        /* Quick Stats */
        .quick-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
        @media (max-width: 1100px) { .quick-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px) { .quick-stats { grid-template-columns: 1fr; } }

        .stat-card {
          background: var(--glass-bg); backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px;
          box-shadow: var(--shadow); transition: all 0.3s ease; position: relative; overflow: hidden;
        }
        .stat-card::before {
          content: ''; position: absolute; top: 0; right: 0; width: 100px; height: 100px;
          background: radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .stat-card:hover::before { opacity: 1; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0, 212, 255, 0.3); }
        .stat-card.sell { border-color: var(--danger); }
        .stat-card.buy  { border-color: var(--success); }
        .stat-label { font-size: 14px; font-weight: 800; letter-spacing: 1px; color: var(--muted); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        .stat-icon { font-size: 10px; cursor: pointer; }
        .stat-value { font-size: 48px; font-weight: 900; line-height: 1; margin-bottom: 12px; }
        .stat-card.sell .stat-value { color: var(--danger); }
        .stat-card.buy  .stat-value { color: var(--success); }
        .stat-subtext { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: var(--muted); text-transform: uppercase; }
        .stat-card.sell .stat-subtext { color: rgba(255, 51, 102, 0.8); }
        .stat-card.buy  .stat-subtext { color: rgba(0, 255, 136, 0.8); }
        .mini-chart { margin-top: 12px; width: 100%; height: 40px; }
        .progress-bar { width: 100%; height: 4px; background: rgba(0, 212, 255, 0.2); border-radius: 2px; overflow: hidden; margin-top: 12px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--success)); border-radius: 2px; animation: fillProgress 2s ease-out; }
        @keyframes fillProgress { from { width: 0; } }

        /* Order Book */
        .order-book {
          background: var(--glass-bg); backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--glass-border); border-radius: 18px; padding: 32px;
          box-shadow: var(--shadow); margin-bottom: 32px;
        }
        .order-book-title { font-size: 24px; font-weight: 900; letter-spacing: 2px; margin-bottom: 24px; text-transform: uppercase; }
        .order-table { width: 100%; border-collapse: collapse; }
        .order-table thead { border-bottom: 2px solid var(--glass-border); }
        .order-table th {
          text-align: left; padding: 16px 12px; font-size: 13px; font-weight: 800; letter-spacing: 1px;
          color: var(--muted); text-transform: uppercase;
        }
        .order-table tbody tr {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease; cursor: pointer;
        }
        .order-table tbody tr:hover { background: rgba(0, 212, 255, 0.05); }
        .order-table td { padding: 16px 12px; font-size: 14px; font-weight: 600; }
        .compact .order-table td, .compact .order-table th { padding: 10px 10px; }
        .order-type-badge {
          display: inline-block; padding: 6px 14px; border-radius: 8px;
          font-weight: 800; font-size: 12px; letter-spacing: 0.5px;
        }
        .order-type-badge.buy  { background: rgba(0, 255, 136, 0.15); color: var(--success); border: 1px solid var(--success); }
        .order-type-badge.sell { background: rgba(255, 51, 102, 0.15); color: var(--danger); border: 1px solid var(--danger); }

        .place-order-btn {
          display: block; margin: 32px auto 0 auto; padding: 16px 48px;
          background: linear-gradient(135deg, var(--accent) 0%, #8a2be2 100%);
          border: none; border-radius: 14px; font-weight: 900; font-size: 16px; letter-spacing: 1px;
          color: #000; cursor: pointer; box-shadow: 0 8px 24px var(--accent-glow);
          transition: all 0.3s ease; text-transform: uppercase;
        }
        .place-order-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px var(--accent-glow); }
        .place-order-btn:active { transform: translateY(0); }

        /* Right Controls */
        .controls-sidebar {
          width: 100px; background: var(--glass-bg); backdrop-filter: blur(20px) saturate(180%);
          border-left: 1px solid var(--glass-border);
          display: flex; flex-direction: column; align-items: center; gap: 20px;
          padding: 22px 12px; box-shadow: var(--shadow);
        }
        .control-btn {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          background: transparent; border: none; cursor: pointer; transition: all 0.2s ease; padding: 10px; border-radius: 12px;
        }
        .control-btn:hover { background: rgba(0, 212, 255, 0.08); transform: scale(1.05); }
        .control-icon {
          width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--accent);
          display: flex; align-items: center; justify-content: center; font-size: 20px; transition: all 0.2s ease;
        }
        .control-btn:hover .control-icon { background: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }
        .control-label { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; color: var(--muted); text-transform: uppercase; text-align: center; }

        /* Toggle mini */
        .toggle {
          position: relative; width: 46px; height: 24px; background: rgba(255,255,255,0.15);
          border-radius: 999px; border: 1px solid var(--glass-border); cursor: pointer;
          transition: background .25s ease, border-color .25s ease;
        }
        .toggle.on { background: var(--accent); border-color: transparent; }
        .toggle .knob {
          position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 999px; background: #fff; transition: transform .25s ease;
        }
        .toggle.on .knob { transform: translateX(22px); }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0, 10, 30, 0.85); backdrop-filter: blur(10px); z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal {
          background: var(--glass-strong); backdrop-filter: blur(30px); border: 2px solid var(--glass-border);
          border-radius: 24px; padding: 28px 30px; max-width: 560px; width: 92%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          position: relative; animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .close-btn { position: absolute; top: 12px; right: 16px; background: none; border: none; color: var(--text); font-size: 28px; cursor: pointer; transition: transform 0.2s ease; }
        .close-btn:hover { transform: rotate(90deg); }
        .modal-title { font-size: 20px; font-weight: 900; margin-bottom: 12px; color: var(--accent); }
        .modal-content { font-size: 15px; line-height: 1.6; color: var(--muted); }

        .settings-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px dashed rgba(255,255,255,0.08); }
        .settings-row:last-child { border-bottom: none; }
        .settings-help { font-size: 12px; color: var(--muted); margin-top: 4px; }
      `}</style>

      <div className={`orders-container ${themeClass} ${compactRows ? 'compact' : ''}`}>
        {/* Left Sidebar - Stock Values */}
        <aside className="stock-sidebar">
          <div className="sidebar-title">STOCK VALUES</div>
          {stockValues.map((stock, i) => (
            <div
              key={`${stock.symbol}-${i}`}
              className="stock-item"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.4s ease ${i * 0.05}s`,
              }}
            >
              <span className="stock-symbol">{stock.symbol}</span>
              <span className={`stock-change ${stock.positive ? 'positive' : 'negative'}`}>
                {stock.change}
              </span>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* App Title */}
          <div className="header">
            <h1 className="app-title">EAZY BYTS</h1>
          </div>

          {/* Quick Stats */}
          <section className="quick-stats">
            {quickStats.map((stat, i) => (
              <div
                key={stat.label}
                className={`stat-card ${stat.type}`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.5s ease ${i * 0.15}s`,
                }}
              >
                <div className="stat-label">
                  {stat.label}
                  <span className="stat-icon">▼</span>
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-subtext">{stat.subtext}</div>
                {stat.chartData && (
                  <>
                    <svg className="mini-chart" viewBox="0 0 120 40" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke={stat.type === 'sell' ? 'var(--danger)' : 'var(--success)'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={generateChartPoints(stat.chartData, 120, 40)}
                      />
                    </svg>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: stat.type === 'sell' ? '20%' : '37%' }}
                      />
                    </div>
                  </>
                )}
                {stat.type === 'neutral' && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '65%' }} />
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Order Book */}
          <section
            className="order-book"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'scale(1)' : 'scale(0.95)',
              transition: 'all 0.6s ease 0.5s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 className="order-book-title" style={{ marginBottom: 0 }}>Order Book</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="pBtn"
                  style={{
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text)',
                    padding: '8px 12px',
                    borderRadius: 12,
                    cursor: 'pointer'
                  }}
                  onClick={() => reload()}
                  title="Reload orders"
                >
                  ⟳ Reload
                </button>
              </div>
            </div>

            <table className="order-table">
              <thead>
                <tr>
                  <th>ASSET</th>
                  <th>TYPE</th>
                  <th>QTY</th>
                  <th>ORDER</th>
                  <th>EXECUTION</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.map((order, i) => (
                  <tr
                    key={`order-${order.id}-${i}`}
                    onClick={() => setSelectedOrder(order)}
                    title={`Open details of order #${order.id}`}
                  >
                    <td style={{ fontWeight: 800 }}>{order.asset}</td>
                    <td>
                      {order.type === 'BUY' || order.type === 'SELL' ? (
                        <span className={`order-type-badge ${order.type.toLowerCase()}`}>{order.type}</span>
                      ) : (
                        order.type || '-'
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>{order.qty ?? '—'}</td>
                    <td style={{ fontWeight: 700 }}>{order.orderCell || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{order.execCell || '-'}</td>
                    <td
                      style={{
                        fontWeight: 800,
                        color:
                          order.status.includes('PENDING') ? '#ffa500' :
                          order.status.includes('EXECUTED') ? 'var(--success)' :
                          order.status.includes('CANCEL') ? '#ff8080' : 'var(--muted)',
                        fontSize: '12px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {order.status}
                      {order.status.includes('PENDING') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelOrder(order.id); }}
                          style={{
                            marginLeft: 8, fontSize: 11, padding: '4px 8px',
                            borderRadius: 8, border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,.06)', color: 'var(--text)', cursor: 'pointer'
                          }}
                          title="Cancel order"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && orderBook.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ padding: 20 }}>
                      No orders yet. Go to Dashboard and place your first order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {loading && (
              <div style={{ 
                marginTop: 12, 
                opacity: 0.8, 
                textAlign: 'center', 
                padding: '20px',
                background: 'rgba(0,212,255,0.1)',
                borderRadius: '8px',
                border: '1px solid var(--accent)'
              }}>
                Loading latest orders…
              </div>
            )}
            {err && (
              <div style={{ 
                marginTop: 12, 
                color: '#ff8888', 
                textAlign: 'center',
                padding: '20px',
                background: 'rgba(255,51,102,0.1)',
                borderRadius: '8px',
                border: '1px solid var(--danger)'
              }}>
                Error: {String(err)}
                <br />
                <button 
                  onClick={() => reload()} 
                  style={{
                    marginTop: '8px',
                    padding: '8px 16px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            <button className="place-order-btn" onClick={() => navigate('/dashboard')}>
              Place New Order
            </button>
          </section>
        </main>

        {/* Right Controls */}
        <aside className="controls-sidebar">
          <button className="control-btn" onClick={() => setShowAIAssistant(true)}>
            <div className="control-icon">💡</div>
            <span className="control-label">AI Assistant</span>
          </button>

          <button className="control-btn" onClick={() => setDarkMode((v) => !v)}>
            <div className="control-icon">🌙</div>
            <span className="control-label">Dark Mode</span>
            <div
              className={`toggle ${darkMode ? 'on' : ''}`}
              onClick={(e) => { e.stopPropagation(); setDarkMode((v) => !v); }}
              title="Toggle dark / light"
            >
              <div className="knob" />
            </div>
          </button>

          <button className="control-btn" onClick={() => setShowNotifications(true)}>
            <div className="control-icon">🔔</div>
            <span className="control-label">Notifications</span>
          </button>

          <button className="control-btn" onClick={() => setShowSettings(true)}>
            <div className="control-icon">⚙️</div>
            <span className="control-label">Settings</span>
          </button>
        </aside>

        {/* AI Assistant Modal */}
        {showAIAssistant && (
          <div className="modal-overlay" onClick={() => setShowAIAssistant(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowAIAssistant(false)}>&times;</button>
              <h3 className="modal-title">💡 AI Assistant</h3>
              <div className="modal-content">
                <p style={{ marginBottom: 16 }}>
                  Your intelligent trading assistant is ready to help you make informed decisions.
                </p>
                <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
                  <li>Real-time market analysis</li>
                  <li>Order suggestions based on trends</li>
                  <li>Risk assessment tools</li>
                  <li>Portfolio optimization recommendations</li>
                </ul>
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: 'rgba(0, 212, 255, 0.1)',
                    borderRadius: 12,
                    border: '1px solid var(--accent)',
                  }}
                >
                  <strong style={{ color: 'var(--accent)' }}>Status:</strong>{' '}
                  <span style={{ color: 'var(--success)' }}>● Active & Learning</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Modal */}
        {showNotifications && (
          <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowNotifications(false)}>&times;</button>
              <h3 className="modal-title">🔔 Notifications</h3>
              <div className="modal-content">
                <div
                  style={{
                    padding: 12,
                    background: 'rgba(0, 255, 136, 0.1)',
                    borderRadius: 8,
                    marginBottom: 12,
                    borderLeft: '4px solid var(--success)',
                  }}
                >
                  <strong>Order Executed:</strong> Check your recent fills for price improvement.
                </div>
                <div
                  style={{
                    padding: 12,
                    background: 'rgba(255, 165, 0, 0.1)',
                    borderRadius: 8,
                    marginBottom: 12,
                    borderLeft: '4px solid #ffa500',
                  }}
                >
                  <strong>Order Pending:</strong> Some LIMIT orders are queued due to spread widening.
                </div>
                <div
                  style={{
                    padding: 12,
                    background: 'rgba(0, 212, 255, 0.1)',
                    borderRadius: 8,
                    borderLeft: '4px solid var(--accent)',
                  }}
                >
                  <strong>Market Update:</strong> Elevated volatility detected in tech sector.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowSettings(false)}>&times;</button>
              <h3 className="modal-title">⚙️ Display & Behavior</h3>
              <div className="modal-content">
                <div className="settings-row">
                  <div>
                    <div><strong>Dark Mode</strong></div>
                    <div className="settings-help">Switch between dark and light themes.</div>
                  </div>
                  <div
                    className={`toggle ${darkMode ? 'on' : ''}`}
                    onClick={() => setDarkMode((v) => !v)}
                    title="Toggle dark / light"
                  >
                    <div className="knob" />
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div><strong>Compact Rows</strong></div>
                    <div className="settings-help">Tighter spacing in the order table.</div>
                  </div>
                  <div
                    className={`toggle ${compactRows ? 'on' : ''}`}
                    onClick={() => setCompactRows((v) => !v)}
                    title="Toggle compact table rows"
                  >
                    <div className="knob" />
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <div><strong>Live Refresh</strong></div>
                    <div className="settings-help">Auto-refresh orders every few seconds.</div>
                  </div>
                  <div
                    className={`toggle ${liveRefresh ? 'on' : ''}`}
                    onClick={() => setLiveRefresh((v) => !v)}
                    title="Toggle live refresh"
                  >
                    <div className="knob" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <button
                    onClick={() => { reload(); }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(255,255,255,.06)',
                      color: 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    Apply & Reload
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(0,212,255,.15)',
                      color: 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>&times;</button>
              <h3 className="modal-title">Order Details</h3>
              <div className="modal-content">
                <div style={{ marginBottom: 10 }}><strong>ID:</strong> {selectedOrder.id}</div>
                <div style={{ marginBottom: 10 }}><strong>Asset:</strong> {selectedOrder.asset}</div>
                <div style={{ marginBottom: 10 }}><strong>Side:</strong> {selectedOrder.type}</div>
                <div style={{ marginBottom: 10 }}><strong>Qty:</strong> {selectedOrder.qty}</div>
                <div style={{ marginBottom: 10 }}><strong>Order:</strong> {selectedOrder.orderCell}</div>
                <div style={{ marginBottom: 10 }}><strong>Execution:</strong> {selectedOrder.execCell || '—'}</div>
                <div><strong>Status:</strong> {selectedOrder.status}</div>
                {selectedOrder.status.includes('PENDING') && (
                  <div style={{ marginTop: 14 }}>
                    <button
                      onClick={() => { cancelOrder(selectedOrder.id); setSelectedOrder(null); }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,.06)',
                        color: 'var(--text)',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
