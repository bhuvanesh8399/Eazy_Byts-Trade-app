// src/pages/Portfolio.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTrade } from "../context/TradeProvider";


// ---------- small SVG chart primitives (no chart.js needed) -----------------
const hue = (i) => `hsl(${(i * 67) % 360} 85% 60%)`;

function Pie({ data, size = 220, inner = 0, label }) {
  const total = Math.max(1e-6, data.reduce((s, d) => s + (d.value || 0), 0));
  const cx = size / 2, cy = size / 2, r = (size / 2) - 2, r0 = Math.max(0, inner);
  let a0 = -Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs><filter id="glow"><feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.45" /></filter></defs>
      {data.map((d, i) => {
        const a1 = a0 + ((d.value || 0) / total) * Math.PI * 2;
        const large = (a1 - a0) > Math.PI ? 1 : 0;
        const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        const xi = cx + r0 * Math.cos(a1), yi = cy + r0 * Math.sin(a1);
        const xj = cx + r0 * Math.cos(a0), yj = cy + r0 * Math.sin(a0);
        const path = r0 > 0
          ? `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi} ${yi} A ${r0} ${r0} 0 ${large} 0 ${xj} ${yj} Z`
          : `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
        a0 = a1;
        return <path key={i} d={path} fill={hue(i)} opacity=".95" filter="url(#glow)" />;
      })}
      {label && (
        <g>
          <circle cx={cx} cy={cy} r={Math.max(22, inner * 0.9)} fill="rgba(255,255,255,0.06)" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontWeight={800} fontSize={14} fill="#9ed9ff">{label}</text>
        </g>
      )}
    </svg>
  );
}

function Bars({ series = [], height = 160, pad = 8, labelFmt = (s) => s, valueFmt = (v) => v }) {
  if (!series.length) return null;
  const max = Math.max(...series.map(s => Math.abs(s.value || 0)), 1);
  const barH = (height - pad * 2) / series.length;
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      {series.map((s, i) => {
        const v = s.value || 0;
        const w = Math.abs(v) / max * 100;
        const y = pad + i * barH + barH * 0.15;
        const h = barH * 0.7;
        return (
          <g key={i}>
            <text x="1" y={y - 2} fontSize="4" fill="#a7dfff">{labelFmt(s.label)}</text>
            <rect x="0" y={y} width={w} height={h} fill={v >= 0 ? '#00ff88' : '#ff5b6e'} opacity=".9" rx="1.2" />
            <text x={w + 1.5} y={y + h * 0.75} fontSize="4" fill="#cfe1ff">{valueFmt(v)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- page ------------------------------------------------------------
export default function Portfolio() {
  const {
    holdings,   // [{ticker,name,qty,avg,ltp,sector}]
    orders,     // [{id,ticker,side,qty,price,status,createdAt}]
    quotes,     // { TICKER: { ltp, ts } }
    loaded,
    lastUpdate,
    refreshAll,
  } = useTrade();

  const [nav, setNav] = useState('overview'); // overview | holdings | allocation | individual | performance | help
  const [denseTable, setDense] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // selection
  const [selected, setSelected] = useState(holdings[0]?.ticker || '');
  useEffect(() => {
    if (holdings.length && !selected) setSelected(holdings[0].ticker);
  }, [holdings]);

  // notes
  const [notes, setNotes] = useState(() => localStorage.getItem('eb_portfolio_notes') || '');
  useEffect(() => {
    const id = setTimeout(() => localStorage.setItem('eb_portfolio_notes', notes), 400);
    return () => clearTimeout(id);
  }, [notes]);

  // news (optional API key)
  const [query, setQuery] = useState(selected || 'AAPL');
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsErr, setNewsErr] = useState('');
  async function fetchNews(symbol) {
    setNewsLoading(true); setNewsErr('');
    try {
      const key = import.meta.env.VITE_NEWSAPI_KEY;
      if (key) {
        const r = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(symbol)}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${key}`);
        const j = await r.json();
        if (j?.articles?.length) {
          setNews(j.articles.map(a => ({ t: a.title, s: a.source?.name || 'News', u: a.url, d: a.publishedAt })));
          setNewsLoading(false);
          return;
        }
      }
      setNews([
        { t: `${symbol} in focus amid rotation`, s: 'MockWire', u: '#', d: Date.now() },
        { t: `Analyst take on ${symbol} valuation`, s: 'StreetMock', u: '#', d: Date.now() - 4e6 },
      ]);
    } catch (e) {
      setNewsErr(String(e?.message || e));
    } finally { setNewsLoading(false); }
  }
  useEffect(() => { fetchNews(query || selected || 'AAPL'); /* once */ }, []); // eslint-disable-line

  // enrich holdings with quotes
  const rows = useMemo(() => {
    return holdings.map(h => {
      const ltp = quotes[h.ticker]?.ltp ?? h.ltp ?? h.avg ?? 0;
      const mv  = ltp * h.qty;
      const cost = h.avg * h.qty;
      return { ...h, ltp, mv, cost, pnl: mv - cost, pnlPct: cost ? ((mv - cost) / cost) * 100 : 0 };
    });
  }, [holdings, quotes]);

  const totals = useMemo(() => {
    const totalMV = rows.reduce((s, r) => s + r.mv, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const pnl = totalMV - totalCost;
    const pnlPct = totalCost ? (pnl / totalCost) * 100 : 0;
    const gainers = rows.filter(r => r.pnl > 0).length;
    const losers = rows.length - gainers;
    return { totalMV, totalCost, pnl, pnlPct, gainers, losers };
  }, [rows]);

  const allocByTicker = useMemo(() => rows.map(r => ({ label: r.ticker, value: r.mv })), [rows]);
  const allocBySector = useMemo(() => {
    const m = new Map();
    rows.forEach(r => m.set(r.sector, (m.get(r.sector) || 0) + r.mv));
    return [...m].map(([label, value]) => ({ label, value }));
  }, [rows]);

  const selectedRow = rows.find(r => r.ticker === selected);

  const buySellAgg = useMemo(() => {
    const list = orders?.filter(o => o.ticker === selected) || [];
    const buy  = list.filter(o => String(o.side).toUpperCase() === 'BUY').reduce((s, o) => s + Number(o.qty || 0), 0);
    const sell = list.filter(o => String(o.side).toUpperCase() === 'SELL').reduce((s, o) => s + Number(o.qty || 0), 0);
    return [
      { label: 'BUY',  value: buy },
      { label: 'SELL', value: sell },
    ];
  }, [orders, selected]);

  const perf = useMemo(() => rows.map(r => ({ label: r.ticker, value: Math.round(r.pnl) })), [rows]);

  const money = (n) => '₹' + (n || 0).toLocaleString('en-IN');
  const pct = (n, dp = 2) => `${(n || 0).toFixed(dp)}%`;

  return (
    <div className="port-root">
      <style>{css}</style>
      <div className="frame">

        {/* LEFT */}
        <aside className="sidebar">
          <div className="brand">EAZY BYTS</div>
          <div className="nav">
            {['overview','holdings','allocation','individual','performance','help'].map(k => (
              <button key={k} className={`nav-btn ${nav===k?'active':''}`} onClick={() => setNav(k)}>
                <span className="ico">{icon[k]}</span><span>{label[k]}</span>
              </button>
            ))}
          </div>

          <div className="mini">
            <div className="mini-row"><span>Total Value</span><b>{money(totals.totalMV)}</b></div>
            <div className="mini-row">
              <span>Total P&L</span>
              <b className={totals.pnl>=0 ? 'pos':'neg'}>{money(totals.pnl)} ({pct(totals.pnlPct)})</b>
            </div>
            <div className="mini-row"><span>Gainers / Losers</span><b>{totals.gainers} / {totals.losers}</b></div>
            <div className="mini-row muted" title={lastUpdate ? new Date(lastUpdate).toLocaleString() : ''}>
              <span>Last update</span><b>{lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '-'}</b>
            </div>
          </div>

          <div className="toggles">
            <label className="tgl"><input type="checkbox" checked={denseTable} onChange={() => setDense(v => !v)} /> <span>Dense Table</span></label>
            <label className="tgl"><input type="checkbox" checked={showRight} onChange={() => setShowRight(v => !v)} /> <span>Show Right Panel</span></label>
            <button className="nav-btn" onClick={refreshAll}>🔄 <span>Refresh</span></button>
          </div>
        </aside>

        {/* CENTER */}
        <main className="content">
          {!loaded && <section className="panel"><h3>Loading Portfolio…</h3><div className="muted">Fetching holdings & orders…</div></section>}

          {loaded && rows.length === 0 && (
            <section className="panel">
              <h3>No Holdings Yet</h3>
              <div className="muted">Place a BUY order from the Dashboard to see it here live.</div>
            </section>
          )}

          {loaded && rows.length > 0 && nav === 'overview' && (
            <section className="panel">
              <h3>Portfolio Overview</h3>
              <div className="grid2">
                <div className="card">
                  <div className="card-h">Allocation by Ticker</div>
                  <Pie data={allocByTicker} size={240} inner={70} label="Value" />
                </div>
                <div className="card">
                  <div className="card-h">Recent Orders</div>
                  <OrdersTable orders={orders} />
                </div>
              </div>
            </section>
          )}

          {loaded && nav === 'holdings' && (
            <section className="panel">
              <h3>Holdings</h3>
              <div className={`table ${denseTable ? 'dense':''}`}>
                <div className="thead">
                  <div>Symbol</div><div>Name</div><div>Qty</div><div>Avg</div>
                  <div>LTP</div><div>Cost</div><div>Value</div><div>PnL</div>
                </div>
                {rows.map(r => (
                  <div key={r.ticker} className={`trow ${selected===r.ticker?'sel':''}`}
                    onClick={() => { setSelected(r.ticker); setNav('individual'); setQuery(r.ticker); fetchNews(r.ticker); }}>
                    <div>{r.ticker}</div>
                    <div className="muted">{r.name || '-'}</div>
                    <div>{r.qty}</div>
                    <div>{money(r.avg)}</div>
                    <div>{money(r.ltp)}</div>
                    <div>{money(r.cost)}</div>
                    <div>{money(r.mv)}</div>
                    <div className={r.pnl>=0?'pos':'neg'}>{money(r.pnl)} ({pct(r.pnlPct)})</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {loaded && nav === 'allocation' && (
            <section className="panel">
              <h3>Allocation</h3>
              <div className="grid2">
                <div className="card"><div className="card-h">By Ticker</div><Pie data={allocByTicker} size={240} inner={60} label="Tickers" /></div>
                <div className="card"><div className="card-h">By Sector</div><Pie data={allocBySector} size={240} inner={60} label="Sectors" /></div>
              </div>
            </section>
          )}

          {loaded && nav === 'individual' && selectedRow && (
            <section className="panel">
              <h3>Individual — {selected}</h3>
              <div className="grid2">
                <div className="card">
                  <div className="card-h">Snapshot</div>
                  <div className="facts">
                    <div><span>Qty</span><b>{selectedRow.qty}</b></div>
                    <div><span>Avg</span><b>{money(selectedRow.avg)}</b></div>
                    <div><span>LTP</span><b>{money(selectedRow.ltp)}</b></div>
                    <div><span>Value</span><b>{money(selectedRow.mv)}</b></div>
                    <div><span>PnL</span><b className={selectedRow.pnl>=0?'pos':'neg'}>{money(selectedRow.pnl)} ({pct(selectedRow.pnlPct)})</b></div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-h">BUY vs SELL</div>
                  <Pie data={buySellAgg} size={240} inner={70} label={selected} />
                </div>
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-h">Orders for {selected}</div>
                <OrdersTable orders={orders.filter(o => o.ticker === selected)} compact />
              </div>

              <div className="pick">
                <label>Change symbol:</label>
                <select value={selected} onChange={(e) => { setSelected(e.target.value); setQuery(e.target.value); fetchNews(e.target.value); }}>
                  {rows.map(r => <option key={r.ticker} value={r.ticker}>{r.ticker}</option>)}
                </select>
              </div>
            </section>
          )}

          {loaded && nav === 'performance' && rows.length > 0 && (
            <section className="panel">
              <h3>Performance (PnL by Symbol)</h3>
              <div className="card">
                <Bars
                  series={perf}
                  labelFmt={(s) => s}
                  valueFmt={(v) => (v>=0?'+':'') + '₹' + Math.round(v).toLocaleString('en-IN')}
                />
              </div>
            </section>
          )}

          {nav === 'help' && (
            <section className="panel">
              <h3>Help & Tips</h3>
              <div className="help">
                <p>• Live-connected via SSE/WS. When an order is executed, holdings refresh automatically.</p>
                <p>• Expected holding fields: <code>ticker, name, qty, avg, ltp, sector</code>.</p>
                <p>• Streams: <code>/api/events/orders</code> (SSE). Quotes (optional): <code>/ws/quotes</code>.</p>
                <p>• Headlines use <code>VITE_NEWSAPI_KEY</code> if set; otherwise a mock list is shown.</p>
              </div>
            </section>
          )}
        </main>

        {/* RIGHT */}
        {showRight && (
          <aside className="right">
            <div className="card sticky">
              <div className="card-h">Quick Notes</div>
              <textarea className="notes" placeholder="Trade ideas, risk rules, tasks… (autosaves)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="card">
              <div className="card-h">Live News</div>
              <div className="news-query">
                <input value={query} onChange={(e)=>setQuery(e.target.value.toUpperCase())} placeholder="symbol or topic (e.g., AAPL, NVDA, AI)" />
                <button onClick={() => fetchNews(query || selected || 'AAPL')}>Search</button>
              </div>
              {newsLoading && <div className="muted">loading…</div>}
              {newsErr && <div className="neg">{newsErr}</div>}
              <div className="news-list">
                {news.map((n,i)=>(
                  <a key={i} className="news-item" href={n.u} target="_blank" rel="noreferrer">
                    <div className="news-title">{n.t}</div>
                    <div className="news-meta"><span>{n.s}</span></div>
                  </a>
                ))}
                {!news.length && !newsLoading && <div className="muted">no headlines right now</div>}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function OrdersTable({ orders, compact }) {
  if (!orders?.length) return <div className="muted">No orders yet</div>;
  return (
    <div className={`table ${compact ? 'dense' : ''}`}>
      <div className="thead">
        <div>Time</div><div>Symbol</div><div>Side</div><div>Qty</div><div>Price</div><div>Status</div><div>ID</div><div></div>
      </div>
      {orders.map(o => (
        <div key={o.id} className="trow">
          <div>{new Date(o.createdAt || o.ts || Date.now()).toLocaleString()}</div>
          <div>{o.ticker}</div>
          <div className={String(o.side).toUpperCase()==='BUY'?'pos':'neg'}>{String(o.side).toUpperCase()}</div>
          <div>{o.qty}</div>
          <div>{'price' in o ? o.price : '-'}</div>
          <div>{o.status || 'EXECUTED'}</div>
          <div className="muted">{o.id}</div>
          <div></div>
        </div>
      ))}
    </div>
  );
}

const label = {
  overview: 'Overall View',
  holdings: 'Holdings',
  allocation: 'Allocation',
  individual: 'Individual',
  performance: 'Performance',
  help: 'Help'
};
const icon = { overview:'📈', holdings:'📋', allocation:'🥧', individual:'👤', performance:'📊', help:'❓' };

const css = `
:root{ --glass: rgba(255,255,255,0.08); --stroke: rgba(255,255,255,0.14); --muted: #aeb8c4; --pos:#19d27c; --neg:#ff5b6e;}
.port-root{ min-height:100vh; background: radial-gradient(80rem 80rem at 20% -10%, #2a3350 0%, #0b0f1a 40%, #070a12 100%); color:#eef3ff; padding:18px;}
.frame{ display:grid; grid-template-columns: 240px 1fr 350px; gap:16px; }
.sidebar{ backdrop-filter: blur(14px); background: var(--glass); border: 1px solid var(--stroke); border-radius: 18px; padding:14px;}
.brand{ font-weight:800; letter-spacing:1px; font-size:20px; margin-bottom:10px;}
.nav{ display:flex; flex-direction:column; gap:8px; margin-bottom:10px;}
.nav-btn{ display:flex; align-items:center; gap:10px; background:transparent; color:#dfe7ff; border:1px solid transparent; padding:10px 12px; border-radius:12px; cursor:pointer;}
.nav-btn:hover{ background: rgba(255,255,255,0.06); border-color: var(--stroke);}
.nav-btn.active{ background: rgba(255,255,255,0.12); border-color: var(--stroke);}
.ico{ filter:saturate(1.4); }
.mini{ margin-top:10px; padding-top:8px; border-top:1px dashed var(--stroke);}
.mini-row{ display:flex; justify-content:space-between; padding:6px 2px;}
.pos{ color: var(--pos); } .neg{ color: var(--neg); }
.toggles{ margin-top:10px; display:flex; flex-direction:column; gap:6px;}
.tgl{ display:flex; gap:8px; align-items:center; font-size:12px; color: var(--muted); }

.content{ display:flex; flex-direction:column; gap:16px;}
.panel{ backdrop-filter: blur(14px); background: var(--glass); border: 1px solid var(--stroke); border-radius: 18px; padding:16px;}
h3{ margin:0 0 12px 0; letter-spacing:.3px; }
.grid2{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
.card{ background: rgba(255,255,255,0.05); border: 1px solid var(--stroke); border-radius: 16px; padding:12px; }
.card-h{ font-weight:700; font-size:13px; color:#cfe1ff; margin-bottom:8px; }

.table{ border:1px solid var(--stroke); border-radius:14px; overflow:hidden; }
.thead,.trow{ display:grid; grid-template-columns: 170px 100px 80px 80px 90px 120px 150px 1fr; border-bottom:1px dashed var(--stroke); padding:10px 12px; align-items:center; }
.table.dense .thead,.table.dense .trow{ padding:8px 10px; }
.trow:hover{ background: rgba(255,255,255,0.04); }
.trow.sel{ outline:1px solid var(--stroke); background: rgba(255,255,255,0.06); }
.muted{ color: var(--muted); }

.facts{ display:grid; grid-template-columns: repeat(5,1fr); gap:10px; }
.facts > div{ background: rgba(255,255,255,0.04); border:1px solid var(--stroke); border-radius:12px; padding:10px; }
.facts span{ color: var(--muted); font-size:12px; display:block; }

.pick{ margin-top:12px; display:flex; gap:10px; align-items:center; }
.pick select{ background: rgba(255,255,255,0.06); color:#fff; border:1px solid var(--stroke); border-radius:10px; padding:6px 10px; }

.right{ display:flex; flex-direction:column; gap:16px; }
.sticky{ position:sticky; top:18px; }
.notes{ width:100%; min-height:160px; background: rgba(0,0,0,0.25); color:#eaf1ff; border:1px solid var(--stroke); border-radius:12px; padding:10px; resize:vertical; }
.news-query{ display:flex; gap:8px; margin-bottom:8px; }
.news-query input{ flex:1; background: rgba(255,255,255,0.06); color:#fff; border:1px solid var(--stroke); border-radius:10px; padding:8px 10px; }
.news-query button{ background: rgba(255,255,255,0.14); border:1px solid var(--stroke); color:#fff; border-radius:10px; padding:8px 10px; cursor:pointer; }
.news-list{ display:flex; flex-direction:column; gap:10px; }
.news-item{ text-decoration:none; color:#e8f1ff; border:1px solid var(--stroke); background: rgba(255,255,255,0.04); padding:10px; border-radius:12px; }
.news-item:hover{ background: rgba(255,255,255,0.08); }
.news-title{ font-weight:600; margin-bottom:4px; }
.news-meta{ font-size:12px; color: var(--muted); }

/* responsive */
@media (max-width: 1180px){ .frame{ grid-template-columns: 220px 1fr; } }
@media (max-width: 860px){ .frame{ grid-template-columns: 1fr; } .right{ order:3; } .grid2{ grid-template-columns: 1fr; } }
`;
