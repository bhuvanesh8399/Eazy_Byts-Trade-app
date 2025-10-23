// src/pages/Portfolio.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeSeriesScale,
} from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeSeriesScale
);

/**
 * EAZY BYTS — PORTFOLIO (Single-file)
 * - Glassmorphism UI, left nav, sticky right tools
 * - Overall view (value + allocation)
 * - Holdings table (gain/loss)
 * - Allocation (by ticker, by sector)
 * - Individual view (select symbol → mini analytics + BUY/SELL pie)
 * - Performance (PnL bars)
 * - Help panel (short)
 * - Notes (right) autosaves to localStorage
 * - Live News (right) tries public APIs via env keys, otherwise mock
 *
 * ENV (optional):
 *  - VITE_NEWSAPI_KEY (newsapi.org)
 *  - VITE_FINNHUB_KEY (finnhub.io)
 *  - VITE_ALPHAVANTAGE_KEY (alphavantage.co)
 */

export default function Portfolio() {
  // ---- demo portfolio state (replace with API/DB) --------------------------
  const [holdings, setHoldings] = useState([
    { ticker: "AAPL", name: "Apple", qty: 14, avg: 160, ltp: 175, sector: "Tech" },
    { ticker: "GOOG", name: "Alphabet", qty: 6, avg: 125, ltp: 168, sector: "Tech" },
    { ticker: "TSLA", name: "Tesla", qty: 5, avg: 210, ltp: 195, sector: "Auto" },
    { ticker: "AMZN", name: "Amazon", qty: 8, avg: 120, ltp: 131, sector: "E-Comm" },
    { ticker: "MSFT", name: "Microsoft", qty: 4, avg: 310, ltp: 378, sector: "Tech" },
  ]);

  // mock orders to render BUY vs SELL distribution (individual tab)
  const [orders] = useState([
    { ticker: "AAPL", side: "BUY", qty: 8 },
    { ticker: "AAPL", side: "SELL", qty: 2 },
    { ticker: "AAPL", side: "BUY", qty: 6 },
    { ticker: "TSLA", side: "BUY", qty: 5 },
    { ticker: "TSLA", side: "SELL", qty: 1 },
    { ticker: "GOOG", side: "BUY", qty: 6 },
    { ticker: "AMZN", side: "BUY", qty: 8 },
    { ticker: "MSFT", side: "BUY", qty: 4 },
  ]);

  // quick synthetic equity curve for the Line chart
  const equitySeries = useMemo(() => {
    // simple cumulative curve derived from MV to look alive
    const totalNow = holdings.reduce((s, h) => s + h.ltp * h.qty, 0);
    const base = totalNow * 0.85;
    return Array.from({ length: 12 }).map((_, i) => ({
      t: i,
      v: Math.round(base + (i * (totalNow - base)) / 11 + (Math.sin(i) * totalNow) / 40),
    }));
  }, [holdings]);

  // ---- UI state -----------------------------------------------------------
  const [nav, setNav] = useState("overview"); // overview | holdings | allocation | individual | performance | help
  const [selected, setSelected] = useState("AAPL");
  const [denseTable, setDenseTable] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [query, setQuery] = useState("AAPL"); // for news

  // ---- derived metrics ----------------------------------------------------
  const stats = useMemo(() => {
    const rows = holdings.map((h) => {
      const mv = h.ltp * h.qty;
      const cost = h.avg * h.qty;
      return { ...h, mv, cost, pnl: mv - cost, pnlPct: ((mv - cost) / cost) * 100 };
    });
    const totalMV = rows.reduce((s, r) => s + r.mv, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const pnl = totalMV - totalCost;
    const gainers = rows.filter((r) => r.pnl > 0).length;
    const losers = rows.length - gainers;
    return { rows, totalMV, totalCost, pnl, pnlPct: (pnl / totalCost) * 100, gainers, losers };
  }, [holdings]);

  const byTicker = useMemo(() => {
    const labels = stats.rows.map((r) => r.ticker);
    const values = stats.rows.map((r) => r.mv);
    return { labels, values };
  }, [stats]);

  const bySector = useMemo(() => {
    const map = new Map();
    stats.rows.forEach((r) => map.set(r.sector, (map.get(r.sector) || 0) + r.mv));
    const labels = [...map.keys()];
    const values = [...map.values()];
    return { labels, values };
  }, [stats]);

  const selectedOrders = useMemo(() => {
    const os = orders.filter((o) => o.ticker === selected);
    const buy = os.filter((o) => o.side === "BUY").reduce((s, o) => s + o.qty, 0);
    const sell = os.filter((o) => o.side === "SELL").reduce((s, o) => s + o.qty, 0);
    return { buy, sell, total: buy + sell };
  }, [orders, selected]);

  const selectedRow = stats.rows.find((r) => r.ticker === selected);

  // ---- notes (right) ------------------------------------------------------
  const [notes, setNotes] = useState(() => localStorage.getItem("eb_portfolio_notes") || "");
  useEffect(() => {
    const id = setTimeout(() => localStorage.setItem("eb_portfolio_notes", notes), 400);
    return () => clearTimeout(id);
  }, [notes]);

  // ---- news (right) -------------------------------------------------------
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsErr, setNewsErr] = useState("");

  async function fetchNews(symbol) {
    setNewsLoading(true);
    setNewsErr("");
    try {
      // try NewsAPI if available
      const nk = import.meta.env.VITE_NEWSAPI_KEY;
      if (nk) {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
          symbol
        )}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${nk}`;
        const r = await fetch(url);
        const j = await r.json();
        if (j?.articles?.length) {
          setNews(
            j.articles.map((a) => ({
              t: a.title,
              s: a.source?.name || "News",
              u: a.url,
              d: a.publishedAt,
            }))
          );
          setNewsLoading(false);
          return;
        }
      }
      // fallback AlphaVantage (needs key)
      const ak = import.meta.env.VITE_ALPHAVANTAGE_KEY;
      if (ak) {
        const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${ak}`;
        const r = await fetch(url);
        const j = await r.json();
        const feed = j?.feed?.slice(0, 8) || [];
        if (feed.length) {
          setNews(
            feed.map((n) => ({ t: n.title, s: n.source, u: n.url, d: n.time_published }))
          );
          setNewsLoading(false);
          return;
        }
      }
      // finnHub sample (needs key)
      const fk = import.meta.env.VITE_FINNHUB_KEY;
      if (fk) {
        const to = new Date();
        const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14);
        const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fmtDate(
          from
        )}&to=${fmtDate(to)}&token=${fk}`;
        const r = await fetch(url);
        const j = await r.json();
        if (Array.isArray(j) && j.length) {
          setNews(
            j.slice(0, 8).map((n) => ({ t: n.headline, s: n.source, u: n.url, d: n.datetime }))
          );
          setNewsLoading(false);
          return;
        }
      }
      // ultimate mock fallback (no keys / CORS)
      setNews([
        { t: `${symbol} extends rally as tech leads broader gains`, s: "MockWire", u: "#", d: Date.now() },
        { t: `Analysts lift ${symbol} price targets after earnings beat`, s: "StreetMock", u: "#", d: Date.now() - 1e6 },
        { t: `${symbol} unveils new AI initiative`, s: "TechMock", u: "#", d: Date.now() - 2e6 },
      ]);
    } catch (e) {
      setNewsErr(String(e?.message || e));
    } finally {
      setNewsLoading(false);
    }
  }

  useEffect(() => {
    fetchNews(query || selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- helpers ------------------------------------------------------------
  function fmt(n) {
    return n?.toLocaleString("en-IN");
  }
  function money(n) {
    return "₹" + (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  function pct(n, dp = 2) {
    return `${(n || 0).toFixed(dp)}%`;
  }
  function fmtDate(d) {
    const x = new Date(d);
    const m = x.getUTCMonth() + 1;
    const dd = x.getUTCDate();
    return `${x.getUTCFullYear()}-${m < 10 ? "0" + m : m}-${dd < 10 ? "0" + dd : dd}`;
  }

  // ---- chart datasets -----------------------------------------------------
  const lineData = useMemo(
    () => ({
      labels: equitySeries.map((p) => `T${p.t}`),
      datasets: [
        {
          label: "Equity Curve",
          data: equitySeries.map((p) => p.v),
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    }),
    [equitySeries]
  );

  const allocTickerData = useMemo(
    () => ({
      labels: byTicker.labels,
      datasets: [{ data: byTicker.values, borderWidth: 0 }],
    }),
    [byTicker]
  );

  const allocSectorData = useMemo(
    () => ({
      labels: bySector.labels,
      datasets: [{ data: bySector.values, borderWidth: 0 }],
    }),
    [bySector]
  );

  const perfBars = useMemo(
    () => ({
      labels: stats.rows.map((r) => r.ticker),
      datasets: [
        { label: "PnL (₹)", data: stats.rows.map((r) => Math.round(r.pnl)) },
      ],
    }),
    [stats]
  );

  const buySellPie = useMemo(
    () => ({
      labels: ["BUY", "SELL"],
      datasets: [{ data: [selectedOrders.buy, selectedOrders.sell], borderWidth: 0 }],
    }),
    [selectedOrders]
  );

  // ---- UI -----------------------------------------------------------------
  return (
    <div className="port-root">
      <style>{css}</style>

      <div className="frame">
        {/* LEFT NAV */}
        <aside className="sidebar">
          <div className="brand">EAZY BYTS</div>

          <div className="nav">
            {["overview", "holdings", "allocation", "individual", "performance", "help"].map(
              (k) => (
                <button
                  key={k}
                  className={`nav-btn ${nav === k ? "active" : ""}`}
                  onClick={() => setNav(k)}
                >
                  {icon(k)}
                  <span>{label(k)}</span>
                </button>
              )
            )}
          </div>

          <div className="mini">
            <div className="mini-row">
              <span>Total Value</span>
              <b>{money(stats.totalMV)}</b>
            </div>
            <div className="mini-row">
              <span>Total P&L</span>
              <b className={stats.pnl >= 0 ? "pos" : "neg"}>
                {money(stats.pnl)} ({pct(stats.pnlPct)})
              </b>
            </div>
            <div className="mini-row">
              <span>Gainers / Losers</span>
              <b>
                {stats.gainers} / {stats.losers}
              </b>
            </div>
          </div>

          <div className="toggles">
            <label className="tgl">
              <input
                type="checkbox"
                checked={denseTable}
                onChange={(e) => setDenseTable(e.target.checked)}
              />
              <span>Dense Table</span>
            </label>
            <label className="tgl">
              <input
                type="checkbox"
                checked={showRight}
                onChange={(e) => setShowRight(e.target.checked)}
              />
              <span>Show Right Panel</span>
            </label>
          </div>
        </aside>

        {/* CENTER CONTENT */}
        <main className="content">
          {nav === "overview" && (
            <section className="panel">
              <h3>Portfolio Overview</h3>
              <div className="grid2">
                <div className="card">
                  <div className="card-h">Equity Curve</div>
                  <Line
                    data={lineData}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: { y: { ticks: { callback: (v) => "₹" + v } } },
                    }}
                  />
                </div>
                <div className="card">
                  <div className="card-h">Allocation by Ticker</div>
                  <Doughnut
                    data={allocTickerData}
                    options={{ plugins: { legend: { position: "bottom" } } }}
                  />
                </div>
              </div>
            </section>
          )}

          {nav === "holdings" && (
            <section className="panel">
              <h3>Holdings</h3>
              <div className={`table ${denseTable ? "dense" : ""}`}>
                <div className="thead">
                  <div>Symbol</div>
                  <div>Name</div>
                  <div>Qty</div>
                  <div>Avg</div>
                  <div>LTP</div>
                  <div>Cost</div>
                  <div>Value</div>
                  <div>PnL</div>
                </div>
                {stats.rows.map((r) => (
                  <div
                    key={r.ticker}
                    className={`trow ${selected === r.ticker ? "sel" : ""}`}
                    onClick={() => {
                      setSelected(r.ticker);
                      setNav("individual");
                    }}
                  >
                    <div>{r.ticker}</div>
                    <div className="muted">{r.name || "-"}</div>
                    <div>{fmt(r.qty)}</div>
                    <div>{money(r.avg)}</div>
                    <div>{money(r.ltp)}</div>
                    <div>{money(r.cost)}</div>
                    <div>{money(r.mv)}</div>
                    <div className={r.pnl >= 0 ? "pos" : "neg"}>
                      {money(r.pnl)} ({pct(r.pnlPct)})
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {nav === "allocation" && (
            <section className="panel">
              <h3>Allocation</h3>
              <div className="grid2">
                <div className="card">
                  <div className="card-h">By Ticker</div>
                  <Doughnut
                    data={allocTickerData}
                    options={{ plugins: { legend: { position: "bottom" } } }}
                  />
                </div>
                <div className="card">
                  <div className="card-h">By Sector</div>
                  <Doughnut
                    data={allocSectorData}
                    options={{ plugins: { legend: { position: "bottom" } } }}
                  />
                </div>
              </div>
            </section>
          )}

          {nav === "individual" && selectedRow && (
            <section className="panel">
              <h3>Individual — {selected}</h3>
              <div className="grid2">
                <div className="card">
                  <div className="card-h">Snapshot</div>
                  <div className="facts">
                    <div>
                      <span>Qty</span>
                      <b>{fmt(selectedRow.qty)}</b>
                    </div>
                    <div>
                      <span>Avg</span>
                      <b>{money(selectedRow.avg)}</b>
                    </div>
                    <div>
                      <span>LTP</span>
                      <b>{money(selectedRow.ltp)}</b>
                    </div>
                    <div>
                      <span>Value</span>
                      <b>{money(selectedRow.mv)}</b>
                    </div>
                    <div>
                      <span>PnL</span>
                      <b className={selectedRow.pnl >= 0 ? "pos" : "neg"}>
                        {money(selectedRow.pnl)} ({pct(selectedRow.pnlPct)})
                      </b>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-h">BUY vs SELL</div>
                  <Doughnut
                    data={buySellPie}
                    options={{ plugins: { legend: { position: "bottom" } } }}
                  />
                </div>
              </div>

              <div className="pick">
                <label>Change symbol:</label>
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setQuery(e.target.value);
                    fetchNews(e.target.value);
                  }}
                >
                  {stats.rows.map((r) => (
                    <option key={r.ticker} value={r.ticker}>
                      {r.ticker}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {nav === "performance" && (
            <section className="panel">
              <h3>Performance</h3>
              <div className="card">
                <div className="card-h">PnL by Symbol</div>
                <Bar
                  data={perfBars}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { ticks: { callback: (v) => "₹" + v } },
                    },
                  }}
                />
              </div>
            </section>
          )}

          {nav === "help" && (
            <section className="panel">
              <h3>Help & Tips</h3>
              <div className="help">
                <p>• Click <b>Holdings</b> row to jump to the <b>Individual</b> view.</p>
                <p>• Use the toggle “Show Right Panel” to hide Notes/News for more chart space.</p>
                <p>• Replace the <i>holdings</i> array with your API response. Keep fields: ticker, name, qty, avg, ltp, sector.</p>
                <p>• Hook your backend orders to fill the BUY/SELL chart.</p>
                <p>• Add your API keys in <code>.env</code> (Vite): <code>VITE_NEWSAPI_KEY</code>, <code>VITE_FINNHUB_KEY</code>, or <code>VITE_ALPHAVANTAGE_KEY</code>. We fall back to mock headlines if keys/CORS aren’t available.</p>
              </div>
            </section>
          )}
        </main>

        {/* RIGHT STICKY: NOTES + NEWS */}
        {showRight && (
          <aside className="right">
            <div className="card sticky">
              <div className="card-h">Quick Notes</div>
              <textarea
                className="notes"
                placeholder="Write trade ideas, risk rules, tasks… (autosaves)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="card">
              <div className="card-h">Live News</div>
              <div className="news-query">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  placeholder="symbol or topic (e.g., AAPL, NVDA, AI)"
                />
                <button onClick={() => fetchNews(query)}>Search</button>
              </div>
              {newsLoading && <div className="muted">loading…</div>}
              {newsErr && <div className="neg">{newsErr}</div>}
              <div className="news-list">
                {news.map((n, i) => (
                  <a key={i} className="news-item" href={n.u} target="_blank" rel="noreferrer">
                    <div className="news-title">{n.t}</div>
                    <div className="news-meta">
                      <span>{n.s}</span>
                    </div>
                  </a>
                ))}
                {!news.length && !newsLoading && (
                  <div className="muted">no headlines right now</div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ---- tiny icon/label helpers ----------------------------------------------
function label(k) {
  return (
    {
      overview: "Overall View",
      holdings: "Holdings",
      allocation: "Allocation",
      individual: "Individual",
      performance: "Performance",
      help: "Help",
    }[k] || k
  );
}

function icon(k) {
  const map = {
    overview: "📈",
    holdings: "📋",
    allocation: "🥧",
    individual: "👤",
    performance: "📊",
    help: "❓",
  };
  return <span className="ico">{map[k]}</span>;
}

// ---- styles ---------------------------------------------------------------
const css = `
:root{
  --glass: rgba(255,255,255,0.08);
  --stroke: rgba(255,255,255,0.14);
  --muted: #aeb8c4;
  --pos: #19d27c;
  --neg: #ff5b6e;
}
.port-root{
  min-height:100vh;
  background: radial-gradient(80rem 80rem at 20% -10%, #2a3350 0%, #0b0f1a 40%, #070a12 100%);
  color:#eef3ff;
  padding:18px;
}
.frame{ display:grid; grid-template-columns: 240px 1fr 350px; gap:16px; }
.sidebar{
  backdrop-filter: blur(14px);
  background: var(--glass);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  padding:14px;
}
.brand{ font-weight:800; letter-spacing:1px; font-size:20px; margin-bottom:10px; }
.nav{ display:flex; flex-direction:column; gap:8px; margin-bottom:10px; }
.nav-btn{
  display:flex; align-items:center; gap:10px;
  background: transparent; color:#dfe7ff; border:1px solid transparent;
  padding:10px 12px; border-radius:12px; cursor:pointer;
}
.nav-btn:hover{ background: rgba(255,255,255,0.06); border-color: var(--stroke); }
.nav-btn.active{ background: rgba(255,255,255,0.12); border-color: var(--stroke); }
.ico{ filter:saturate(1.4); }
.mini{ margin-top:10px; padding-top:8px; border-top:1px dashed var(--stroke); }
.mini-row{ display:flex; justify-content:space-between; padding:6px 2px; }
.pos{ color: var(--pos); }
.neg{ color: var(--neg); }
.toggles{ margin-top:10px; display:flex; flex-direction:column; gap:6px; }
.tgl{ display:flex; gap:8px; align-items:center; font-size:12px; color: var(--muted); }

.content{
  display:flex; flex-direction:column; gap:16px;
}
.panel{
  backdrop-filter: blur(14px);
  background: var(--glass);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  padding:16px;
}
h3{ margin:0 0 12px 0; letter-spacing:.3px; }
.grid2{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
.card{
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  padding:12px;
}
.card-h{ font-weight:700; font-size:13px; color:#cfe1ff; margin-bottom:8px; }

.table{ border:1px solid var(--stroke); border-radius:14px; overflow:hidden; }
.thead,.trow{
  display:grid; grid-template-columns: 100px 1fr 80px 90px 90px 110px 110px 130px;
  border-bottom:1px dashed var(--stroke); padding:10px 12px; align-items:center;
}
.table.dense .thead,.table.dense .trow{ padding:8px 10px; }
.trow:hover{ background: rgba(255,255,255,0.04); cursor:pointer; }
.trow.sel{ outline:1px solid var(--stroke); background: rgba(255,255,255,0.06); }
.muted{ color: var(--muted); }

.facts{ display:grid; grid-template-columns: repeat(5,1fr); gap:10px; }
.facts > div{ background: rgba(255,255,255,0.04); border:1px solid var(--stroke); border-radius:12px; padding:10px; }
.facts span{ color: var(--muted); font-size:12px; display:block; }

.pick{ margin-top:12px; display:flex; gap:10px; align-items:center; }
.pick select{
  background: rgba(255,255,255,0.06); color:#fff; border:1px solid var(--stroke); border-radius:10px; padding:6px 10px;
}

.right{
  display:flex; flex-direction:column; gap:16px;
}
.sticky{ position:sticky; top:18px; }
.notes{
  width:100%; min-height:160px; background: rgba(0,0,0,0.25); color:#eaf1ff;
  border:1px solid var(--stroke); border-radius:12px; padding:10px; resize:vertical;
}
.news-query{ display:flex; gap:8px; margin-bottom:8px; }
.news-query input{
  flex:1; background: rgba(255,255,255,0.06); color:#fff; border:1px solid var(--stroke); border-radius:10px; padding:8px 10px;
}
.news-query button{
  background: rgba(255,255,255,0.14); border:1px solid var(--stroke); color:#fff; border-radius:10px; padding:8px 10px; cursor:pointer;
}
.news-list{ display:flex; flex-direction:column; gap:10px; }
.news-item{
  text-decoration:none; color:#e8f1ff; border:1px solid var(--stroke);
  background: rgba(255,255,255,0.04); padding:10px; border-radius:12px;
}
.news-item:hover{ background: rgba(255,255,255,0.08); }
.news-title{ font-weight:600; margin-bottom:4px; }
.news-meta{ font-size:12px; color: var(--muted); }

/* responsive */
@media (max-width: 1180px){
  .frame{ grid-template-columns: 220px 1fr; }
}
@media (max-width: 860px){
  .frame{ grid-template-columns: 1fr; }
  .right{ order: 3; }
  .grid2{ grid-template-columns: 1fr; }
}
`;
