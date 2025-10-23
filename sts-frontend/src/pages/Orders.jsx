// src/pages/Orders.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

/**
 * EAZY BYTS Trade App - Orders Section
 * Features: Order Book, Stock Values Sidebar, Quick Stats (Sell/Buy/Order Qty)
 * Right Sidebar: AI Assistant, Dark Mode, Notifications, Settings
 */

export default function Orders() {
  const navigate = useNavigate();
  const authCtx = useAuth();
  const isAuthed = authCtx?.isAuthed;

  // Auth redirect
  useEffect(() => {
    if (typeof isAuthed !== 'undefined' && !isAuthed) {
      const t = setTimeout(() => navigate('/login', { replace: true }), 100);
      return () => clearTimeout(t);
    }
  }, [isAuthed, navigate]);

  // State
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Mock Data - Stock Values Sidebar
  const stockValues = useMemo(() => [
    { symbol: 'APPL', change: '+1.2%', positive: true },
    { symbol: 'MSFT', change: '0.9%', positive: true },
    { symbol: 'MST', change: '0.9%', positive: true },
    { symbol: 'MSFT', change: '0.9%', positive: true },
    { symbol: 'AMZN', change: '-0.3%', positive: false },
    { symbol: 'NVDA', change: '-2.1%', positive: false },
    { symbol: 'NVDA', change: '-2.1%', positive: false }
  ], []);

  // Quick Stats Cards
  const quickStats = useMemo(() => [
    {
      label: 'SELL',
      value: '19.9%',
      subtext: 'HIGH INNOVATIVE UPDATE - GLOBAL MARKETS',
      type: 'sell',
      chartData: [30, 45, 40, 55, 50, 60, 55]
    },
    {
      label: 'BUY',
      value: '36.8%',
      subtext: 'REAL-TIME INTELLIGENCE FEED',
      type: 'buy',
      chartData: [20, 35, 45, 55, 65, 70, 75]
    },
    {
      label: 'ORDER QUANTITY',
      value: '15.5K',
      subtext: 'TOTAL SHARES ORDERED',
      type: 'neutral'
    }
  ], []);

  // Order Book Data
  const orderBook = useMemo(() => [
    {
      id: 1,
      asset: 'TSLA',
      type: 'BUY',
      price: 'QTY',
      priceValue: 'PENDING',
      status: 'IIATRS'
    },
    {
      id: 2,
      asset: 'TSLA',
      type: '100',
      price: '1000',
      priceValue: 'PENDING',
      status: 'CIATRC'
    },
    {
      id: 3,
      asset: 'TSLA',
      type: 'SELL',
      price: '$185.30',
      priceValue: '$1200.50',
      status: 'DJATRC'
    },
    {
      id: 4,
      asset: 'GOOGL',
      type: '50',
      price: '$1200.50',
      priceValue: 'EXECUTED',
      status: 'ELITRS'
    },
    {
      id: 5,
      asset: 'TSLA',
      type: '50',
      price: 'GMALY',
      priceValue: '',
      status: ''
    }
  ], []);

  // Utility: generate chart points
  const generateChartPoints = (data, width = 80, height = 30) => {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return data.map((val, i) => {
      const x = i * (width / Math.max(data.length - 1, 1));
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
  };

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
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        html, body, #root { height: 100%; width: 100%; }
        
        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1829 100%);
          color: #ffffff;
          -webkit-font-smoothing: antialiased;
        }
        
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(circle at 20% 50%, rgba(0, 150, 255, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(0, 212, 255, 0.06) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }
        
        .orders-container {
          display: flex;
          min-height: 100vh;
          position: relative;
          z-index: 1;
          padding: 0;
          margin: 0;
        }
        
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
        
        .sidebar-title {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 20px;
          color: var(--accent);
        }
        
        .stock-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 10px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          margin-bottom: 6px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .stock-item:hover {
          background: rgba(0, 212, 255, 0.08);
          transform: translateX(4px);
        }
        
        .stock-symbol {
          font-weight: 700;
          font-size: 14px;
        }
        
        .stock-change {
          font-weight: 700;
          font-size: 13px;
        }
        
        .positive { color: var(--success); }
        .negative { color: var(--danger); }
        
        /* Main Content Area */
        .main-content {
          flex: 1;
          padding: 32px 40px;
          overflow-y: auto;
        }
        
        @media (max-width: 900px) {
          .main-content { padding: 24px 20px; }
        }
        
        .header {
          margin-bottom: 32px;
        }
        
        .app-title {
          font-size: 48px;
          font-weight: 900;
          letter-spacing: 4px;
          text-align: center;
          background: linear-gradient(135deg, #fff 0%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 40px;
          text-shadow: 0 0 40px var(--accent-glow);
        }
        
        /* Quick Stats Cards */
        .quick-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        
        @media (max-width: 1100px) {
          .quick-stats { grid-template-columns: repeat(2, 1fr); }
        }
        
        @media (max-width: 700px) {
          .quick-stats { grid-template-columns: 1fr; }
        }
        
        .stat-card {
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .stat-card:hover::before {
          opacity: 1;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 212, 255, 0.3);
        }
        
        .stat-card.sell {
          border-color: var(--danger);
        }
        
        .stat-card.buy {
          border-color: var(--success);
        }
        
        .stat-label {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 1px;
          color: var(--muted);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .stat-icon {
          font-size: 10px;
          cursor: pointer;
        }
        
        .stat-value {
          font-size: 48px;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 12px;
        }
        
        .stat-card.sell .stat-value {
          color: var(--danger);
        }
        
        .stat-card.buy .stat-value {
          color: var(--success);
        }
        
        .stat-subtext {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--muted);
          text-transform: uppercase;
        }
        
        .stat-card.sell .stat-subtext {
          color: rgba(255, 51, 102, 0.8);
        }
        
        .stat-card.buy .stat-subtext {
          color: rgba(0, 255, 136, 0.8);
        }
        
        .mini-chart {
          margin-top: 12px;
          width: 100%;
          height: 40px;
        }
        
        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(0, 212, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 12px;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--success));
          border-radius: 2px;
          animation: fillProgress 2s ease-out;
        }
        
        @keyframes fillProgress {
          from { width: 0; }
        }
        
        /* Order Book Section */
        .order-book {
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 18px;
          padding: 32px;
          box-shadow: var(--shadow);
          margin-bottom: 32px;
        }
        
        .order-book-title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 24px;
          text-transform: uppercase;
        }
        
        .order-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .order-table thead {
          border-bottom: 2px solid var(--glass-border);
        }
        
        .order-table th {
          text-align: left;
          padding: 16px 12px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1px;
          color: var(--muted);
          text-transform: uppercase;
        }
        
        .order-table tbody tr {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .order-table tbody tr:hover {
          background: rgba(0, 212, 255, 0.05);
        }
        
        .order-table td {
          padding: 16px 12px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .order-type-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        
        .order-type-badge.buy {
          background: rgba(0, 255, 136, 0.15);
          color: var(--success);
          border: 1px solid var(--success);
        }
        
        .order-type-badge.sell {
          background: rgba(255, 51, 102, 0.15);
          color: var(--danger);
          border: 1px solid var(--danger);
        }
        
        .place-order-btn {
          display: block;
          margin: 32px auto 0 auto;
          padding: 16px 48px;
          background: linear-gradient(135deg, var(--accent) 0%, #8a2be2 100%);
          border: none;
          border-radius: 14px;
          font-weight: 900;
          font-size: 16px;
          letter-spacing: 1px;
          color: #000;
          cursor: pointer;
          box-shadow: 0 8px 24px var(--accent-glow);
          transition: all 0.3s ease;
          text-transform: uppercase;
        }
        
        .place-order-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px var(--accent-glow);
        }
        
        .place-order-btn:active {
          transform: translateY(0);
        }
        
        /* Right Sidebar - Controls */
        .controls-sidebar {
          width: 90px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(180%);
          border-left: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          padding: 32px 12px;
          box-shadow: var(--shadow);
        }
        
        .control-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 12px;
          border-radius: 12px;
        }
        
        .control-btn:hover {
          background: rgba(0, 212, 255, 0.08);
          transform: scale(1.05);
        }
        
        .control-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.2s ease;
        }
        
        .control-btn:hover .control-icon {
          background: var(--accent);
          box-shadow: 0 0 20px var(--accent-glow);
        }
        
        .control-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--muted);
          text-transform: uppercase;
          text-align: center;
        }
        
        .toggle-switch {
          position: relative;
          width: 50px;
          height: 26px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 13px;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        
        .toggle-switch.active {
          background: var(--accent);
        }
        
        .toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }
        
        .toggle-switch.active .toggle-knob {
          transform: translateX(24px);
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 10, 30, 0.85);
          backdrop-filter: blur(10px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal {
          background: var(--glass-strong);
          backdrop-filter: blur(30px);
          border: 2px solid var(--glass-border);
          border-radius: 24px;
          padding: 40px 50px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          position: relative;
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .close-btn {
          position: absolute;
          top: 16px;
          right: 20px;
          background: none;
          border: none;
          color: #fff;
          font-size: 32px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .close-btn:hover {
          transform: rotate(90deg);
        }
        
        .modal-title {
          font-size: 24px;
          font-weight: 900;
          margin-bottom: 16px;
          color: var(--accent);
        }
        
        .modal-content {
          font-size: 15px;
          line-height: 1.6;
          color: var(--muted);
        }
        
        @media (max-width: 900px) {
          .stock-sidebar, .controls-sidebar {
            display: none;
          }
        }
      `}</style>

      <div className="orders-container">
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
                transition: `all 0.4s ease ${i * 0.05}s`
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

          {/* Quick Stats Cards */}
          <section className="quick-stats">
            {quickStats.map((stat, i) => (
              <div 
                key={stat.label}
                className={`stat-card ${stat.type}`}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.5s ease ${i * 0.15}s`
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
              transition: 'all 0.6s ease 0.5s'
            }}
          >
            <h2 className="order-book-title">Order Book</h2>
            <table className="order-table">
              <thead>
                <tr>
                  <th>ASSET</th>
                  <th>TYPE</th>
                  <th>PRICE</th>
                  <th>PRICE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {orderBook.map((order) => (
                  <tr 
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td style={{ fontWeight: 800 }}>{order.asset}</td>
                    <td>
                      {order.type === 'BUY' || order.type === 'SELL' ? (
                        <span className={`order-type-badge ${order.type.toLowerCase()}`}>
                          {order.type}
                        </span>
                      ) : (
                        order.type
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>{order.price}</td>
                    <td style={{ fontWeight: 700 }}>{order.priceValue}</td>
                    <td style={{ 
                      fontWeight: 800, 
                      color: order.status.includes('PENDING') ? '#ffa500' : 
                             order.status.includes('EXECUTED') ? 'var(--success)' : 
                             'var(--muted)',
                      fontSize: '12px',
                      letterSpacing: '0.5px'
                    }}>
                      {order.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="place-order-btn">
              Place New Order
            </button>
          </section>
        </main>

        {/* Right Sidebar - Controls */}
        <aside className="controls-sidebar">
          <button 
            className="control-btn"
            onClick={() => setShowAIAssistant(true)}
          >
            <div className="control-icon">💡</div>
            <span className="control-label">AI Assistant</span>
          </button>

          <button className="control-btn">
            <div className="control-icon">🌙</div>
            <span className="control-label">Dark Mode</span>
          </button>

          <button 
            className="control-btn"
            onClick={() => setShowNotifications(true)}
          >
            <div className="control-icon">🔔</div>
            <span className="control-label">Notifications</span>
          </button>

          <button className="control-btn">
            <div className="control-icon">⚙️</div>
            <span className="control-label">Settings</span>
          </button>
        </aside>

        {/* AI Assistant Modal */}
        {showAIAssistant && (
          <div className="modal-overlay" onClick={() => setShowAIAssistant(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowAIAssistant(false)}>
                &times;
              </button>
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
                <div style={{ 
                  marginTop: 24, 
                  padding: 16, 
                  background: 'rgba(0, 212, 255, 0.1)', 
                  borderRadius: 12,
                  border: '1px solid var(--accent)'
                }}>
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
            <div className="modal" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowNotifications(false)}>
                &times;
              </button>
              <h3 className="modal-title">🔔 Notifications</h3>
              <div className="modal-content">
                <div style={{ 
                  padding: 12, 
                  background: 'rgba(0, 255, 136, 0.1)', 
                  borderRadius: 8,
                  marginBottom: 12,
                  borderLeft: '4px solid var(--success)'
                }}>
                  <strong>Order Executed:</strong> GOOGL 50 shares @ $1200.50
                </div>
                <div style={{ 
                  padding: 12, 
                  background: 'rgba(255, 165, 0, 0.1)', 
                  borderRadius: 8,
                  marginBottom: 12,
                  borderLeft: '4px solid #ffa500'
                }}>
                  <strong>Order Pending:</strong> TSLA 100 shares
                </div>
                <div style={{ 
                  padding: 12, 
                  background: 'rgba(0, 212, 255, 0.1)', 
                  borderRadius: 8,
                  borderLeft: '4px solid var(--accent)'
                }}>
                  <strong>Market Update:</strong> High volatility detected in tech sector
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                &times;
              </button>
              <h3 className="modal-title">Order Details</h3>
              <div className="modal-content">
                <div style={{ marginBottom: 16 }}>
                  <strong>Asset:</strong> {selectedOrder.asset}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Type:</strong> {selectedOrder.type}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Price:</strong> {selectedOrder.price}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Value:</strong> {selectedOrder.priceValue}
                </div>
                <div>
                  <strong>Status:</strong> {selectedOrder.status}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
