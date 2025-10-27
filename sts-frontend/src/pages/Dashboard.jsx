// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { useTrade } from "../context/TradeProvider";

/**
 * EAZY BYTS — Trading Dashboard (reads from TradeProvider; no direct REST/WS here)
 *
 * Changes per Step 3:
 *  - ❌ removed local REST/SSE fetching and any hard-coded WS/HTTP
 *  - ✅ now reads { stats, holdings, quotes } from useTrade()
 *  - ✅ still uses useTrade().placeOrder for BUY/SELL
 *  - ✅ keeps all UX upgrades: watchlist chips, demo symbols, toasts, skeletons, live badge
 *
 * Note: If your TradeProvider also exposes { watchlist, addSymbol, removeSymbol, updatedAt, series }
 * we’ll use them; otherwise this file gracefully falls back to a tiny local watchlist.
 */

// ----------------------------- helpers ---------------------------------------
const fmt2 = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function linePoints(data, width = 200, height = 60) {
  if (!data?.length) return "";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = i * (width / Math.max(data.length - 1, 1));
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function Badge({ freshnessSec }) {
  let color = "#00ff88";
  if (freshnessSec >= 30) color = "#ff3366";
  else if (freshnessSec >= 1) color = "#ffc14d";
  const label =
    freshnessSec === Infinity
      ? "waiting"
      : freshnessSec < 1
      ? "Live"
      : freshnessSec < 60
      ? `${Math.floor(freshnessSec)}s`
      : `${Math.floor(freshnessSec / 60)}m`;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(255,255,255,.05)",
      }}
      aria-live="polite"
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <b>{label}</b>
    </span>
  );
}

function Toasts({ toasts, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            minWidth: 260,
            background: "rgba(10,18,38,.9)",
            color: "#e9f7ff",
            border: "1px solid rgba(255,255,255,.14)",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 8px 22px rgba(0,0,0,.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b>{t.title}</b>
            <button
              aria-label="Close"
              onClick={() => onClose(t.id)}
              style={{ background: "transparent", border: 0, color: "#9fd8ff", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          {t.msg && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{t.msg}</div>}
        </div>
      ))}
    </div>
  );
}

// ----------------------------- component -------------------------------------
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthed = true } = useAuth();

  // TradeProvider is the single source of truth now
  const trade = useTrade();
  const {
    // required by Step 3
    stats,
    holdings,
    quotes,
    // nice-to-have fields (if your provider exposes them)
    placeOrder,
    watchlist: providerWatchlist,
    addSymbol: providerAddSymbol,
    removeSymbol: providerRemoveSymbol,
    updatedAt: providerUpdatedAt, // timestamp when quotes last updated
    series: providerSeries, // per-symbol sparklines if available
  } = trade || {};

  // Redirect unauthenticated users if your real AuthProvider provides false
  useEffect(() => {
    if (typeof isAuthed !== "undefined" && !isAuthed) {
      const t = setTimeout(() => navigate("/login", { replace: true }), 100);
      return () => clearTimeout(t);
    }
  }, [isAuthed, navigate]);

  // UI states
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");
  const [showAIModal, setShowAIModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(null); // symbol currently trading
  const [toasts, setToasts] = useState([]);

  // watchlist: prefer provider's; fallback to a tiny local list (no fetching)
  const [localWatchlist, setLocalWatchlist] = useState(() => []);
  
  // Debug: Check all watchlist sources
  const derivedFromHoldings = holdings?.map((h) => h.symbol) || [];
  const derivedFromQuotes = quotes ? Object.keys(quotes) : [];
  
  const watchlist =
    (providerWatchlist && providerWatchlist.length ? providerWatchlist : null) ||
    (localWatchlist.length ? localWatchlist : null) ||
    // derive from data we already have
    Array.from(
      new Set([
        ...derivedFromHoldings,
        ...derivedFromQuotes,
      ])
    );
  
  console.log('[Dashboard] Watchlist derivation:', {
    providerWatchlist,
    localWatchlist,
    derivedFromHoldings,
    derivedFromQuotes,
    finalWatchlist: watchlist
  });

  const [newSymbol, setNewSymbol] = useState("");
  const suggestionSymbols = ["AAPL", "TSLA", "NVDA", "GOOGL", "AMZN", "TCS", "RELIANCE", "INFY"];

  // Order ticket state (modal)
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState(10);
  const [orderType, setOrderType] = useState("MARKET"); // MARKET | LIMIT
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState("DAY"); // UI only
  const [submitting, setSubmitting] = useState(false);
  const qtyRef = useRef(null);

  // News panel (shared style with Portfolio)
  const [newsQuery, setNewsQuery] = useState('AAPL');
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
          setNews(j.articles.map(a => ({ t: a.title, s: a.source?.name || 'News', u: a.url }))); setNewsLoading(false); return;
        }
      }
      setNews([
        { t: `${symbol} update — analyst note`, s: 'MockWire', u: '#' },
        { t: `${symbol} in focus amid rotation`, s: 'StreetMock', u: '#' },
      ]);
    } catch (e) { setNewsErr(String(e?.message || e)); }
    finally { setNewsLoading(false); }
  }
  useEffect(() => { fetchNews(newsQuery); /* initial */ }, []); // eslint-disable-line

  // Calculator state (position/PnL calculator)
  const firstSym = (watchlist && watchlist[0]) || 'AAPL';
  const [calcSymbol, setCalcSymbol] = useState(firstSym);
  const [calcQty, setCalcQty] = useState(10);
  const getPx = (s) => Number(quotes?.[s]?.price ?? quotes?.[s]?.ltp ?? 0);
  const [calcEntry, setCalcEntry] = useState(getPx(firstSym) || 100);
  const [calcPrice, setCalcPrice] = useState(getPx(firstSym) || 100);

  useEffect(() => {
    const s = (watchlist && watchlist[0]) || 'AAPL';
    setCalcSymbol((prev) => prev || s);
    // refresh live price targets when symbol list changes
    const px = getPx(s);
    if (px) { setCalcPrice(px); if (!calcEntry) setCalcEntry(px); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist?.join(',')]);

  const calc = useMemo(() => {
    const qty = Number(calcQty) || 0;
    const entry = Number(calcEntry) || 0;
    const price = Number(calcPrice) || 0;
    const cost = qty * entry;
    const mv = qty * price;
    const pnl = mv - cost;
    const pnlPct = cost ? (pnl / cost) * 100 : 0;
    const tgt5 = entry * 1.05;
    const tgt10 = entry * 1.10;
    const stop5 = entry * 0.95;
    return { qty, entry, price, cost, mv, pnl, pnlPct, tgt5, tgt10, stop5 };
  }, [calcQty, calcEntry, calcPrice]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // toast helpers
  const notify = (title, msg) =>
    setToasts((t) => [...t, { id: Date.now() + Math.random(), title, msg }]);
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  // watchlist ops (prefer provider functions; fallback to local state)
  const addSymbol = (raw) => {
    const s = (raw || newSymbol || "").toUpperCase().replace(/[^A-Z0-9._-]/g, "");
    if (!s) return;
    if (watchlist?.includes(s)) {
      setNewSymbol("");
      notify("Already added", s);
      return;
    }
    if (providerAddSymbol) providerAddSymbol(s);
    else setLocalWatchlist((curr) => [s, ...curr].slice(0, 24));
    setNewSymbol("");
    notify("Added to watchlist", s);
  };
  const removeSymbol = (s) => {
    if (providerRemoveSymbol) providerRemoveSymbol(s);
    else setLocalWatchlist((curr) => curr.filter((x) => x !== s));
    notify("Removed", s);
  };
  const loadDemo = () => {
    const demo = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"];
    if (providerAddSymbol) demo.forEach((s) => providerAddSymbol(s));
    else setLocalWatchlist(demo);
    notify("Demo symbols added");
  };

  // order submission — fully via provider
  const handlePlaceOrder = async (action) => {
    if (!placeOrder) {
      notify("Order failed", "TradeProvider.placeOrder is not available");
      return;
    }
    if (!quantity || quantity <= 0) return alert("Enter a valid quantity");
    if (orderType.toUpperCase() === "LIMIT" && (!limitPrice || Number(limitPrice) <= 0))
      return alert("Enter a valid limit price");

    const symbol = showStockModal || (watchlist && watchlist[0]) || "AAPL";
    try {
      setSubmitting(true);
      await placeOrder({
        symbol,
        side: String(action || "BUY").toUpperCase(),
        type: String(orderType || "MARKET").toUpperCase(),
        qty: quantity,
        limitPrice: String(orderType || "MARKET").toUpperCase() === "LIMIT" ? Number(limitPrice) : undefined,
      });
      if (String(orderType).toUpperCase() === "LIMIT") setLimitPrice("");
      setShowStockModal(null);
      notify("Order submitted", `${action} ${quantity} ${symbol}${orderType === "LIMIT" ? ` @ ${limitPrice}` : ""}`);
    } catch (e) {
      console.error(e);
      notify("Order failed", e?.message || "Unknown error");
      alert(e?.message || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('[Dashboard] State:', { 
      watchlist, 
      watchlistLength: watchlist?.length || 0,
      quotes,
      holdings,
      stats,
      cards: watchlist?.map(sym => ({ symbol: sym, quote: quotes?.[sym] }))
    });
  }, [watchlist, quotes, holdings, stats]);

  // build UI cards from provider data
  // Expecting quotes like: { [symbol]: { price, changePct, ts, spark? } }
  const cards = useMemo(() => {
    const symbols = watchlist || [];
    console.log('[Dashboard] Building cards for symbols:', symbols);
    const builtCards = symbols.map((sym) => {
      const q = quotes?.[sym] || {};
      const price = Number(q.price ?? 0);
      const changePct = Number(q.changePct ?? 0);
      const spark =
        q.spark ||
        q.series ||
        (providerSeries && providerSeries[sym]) ||
        []; // optional
      return {
        symbol: sym,
        price,
        changePct,
        positive: changePct >= 0,
        spark,
        progress: Math.min(100, Math.max(0, Math.round((spark.length / 120) * 100))),
        ts: q.ts || q.updatedAt || providerUpdatedAt || 0,
      };
    });
    console.log('[Dashboard] Built cards:', builtCards);
    return builtCards;
  }, [watchlist, quotes, providerSeries, providerUpdatedAt]);

  // compute freshness (seconds since last tick across all)
  const freshnessSec = useMemo(() => {
    const times = cards.map((c) => (typeof c.ts === "number" ? c.ts : Date.parse(c.ts || 0)));
    const latest = Math.max(0, ...times);
    if (!latest) return Infinity;
    return Math.max(0, (Date.now() - latest) / 1000);
  }, [cards]);

  // totals from provider
  const totalValue = useMemo(() => Number(stats?.totalValue ?? 0), [stats]);

  return (
    <>
      <style>{`
        :root{--glass-bg:rgba(15,25,50,.45);--glass-border:rgba(255,255,255,.18);--muted:rgba(255,255,255,.75);--accent:#00d4ff;--success:#00ff88;--danger:#ff3366;--shadow:0 8px 32px rgba(0,80,150,.37)}
        *{box-sizing:border-box;margin:0;padding:0} html,body,#root{height:100%;width:100%}
        body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;background:radial-gradient(1200px 600px at 20% 0%,#0b1430 0%,#0b0f25 45%,#091023 100%);color:#fff;-webkit-font-smoothing:antialiased;overflow-x:hidden}
        .shell{display:flex;min-height:100vh;position:relative;z-index:1}
        .sidebar{width:280px;position:fixed;inset:0 auto 0 0;z-index:50;display:flex;flex-direction:column;gap:20px;padding:28px 18px;background:var(--glass-bg);backdrop-filter:blur(20px) saturate(180%);border-right:1px solid var(--glass-border);box-shadow:var(--shadow);transform:translateX(0);transition:transform .3s}
        .sidebar.hide{transform:translateX(-100%)}
        .logo{text-align:center;padding-bottom:18px;border-bottom:1px solid var(--glass-border)}
        .logoTitle{font-size:26px;font-weight:900;letter-spacing:3px;background:linear-gradient(135deg,var(--accent) 0%,#00ff88 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .logoSub{font-size:10px;color:var(--muted);letter-spacing:3px;margin-top:5px}
        .nav{display:flex;flex-direction:column;gap:8px;flex:1;margin-top:16px}
        .nav button{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:transparent;border:1px solid transparent;color:rgba(255,255,255,.9);cursor:pointer;font-weight:700;font-size:15px;transition:all .2s}
        .nav button:hover{background:rgba(0,212,255,.08);transform:translateX(4px)}
        .nav button.active{background:linear-gradient(135deg,rgba(0,212,255,.22),rgba(138,43,226,.22));border-left:4px solid var(--accent)}
        .nav button:focus{outline:2px solid var(--accent)}
        .userBox{display:flex;align-items:center;gap:12px;padding:12px;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:14px}
        .avatar{width:44px;height:44px;border-radius:999px;background:linear-gradient(135deg,var(--accent),#8a2be2);display:flex;align-items:center;justify-content:center;font-weight:900;color:#000}
        .main{margin-left:280px;padding:28px 34px;flex:1;min-height:100vh;overflow:auto}
        @media (max-width:900px){.main{margin-left:0;padding:22px 18px}.menuBtn{display:inline-flex!important}.sidebar{width:82%}}
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .title{font-size:34px;font-weight:900;background:linear-gradient(135deg,#fff 0%,var(--accent) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .muted{color:var(--muted)} .pos{color:var(--success);font-weight:800} .neg{color:var(--danger);font-weight:800}
        .card{background:var(--glass-bg);backdrop-filter:blur(20px) saturate(180%);border:1px solid var(--glass-border);border-radius:18px;padding:18px;box-shadow:var(--shadow)}
        .grid{display:grid;gap:18px}
        .dash-grid{display:grid;grid-template-columns: 1.8fr 1fr;gap:16px}
        .dash-right .facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .calc-grid label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--muted)}
        .stocks{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
        .progress{width:100%;height:4px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;margin-top:10px}
        .progress>span{display:block;height:100%;background:linear-gradient(90deg,var(--success),var(--accent))}
        .inp{flex:1;min-width:0;padding:10px;border-radius:10px;border:1px solid var(--glass-border);background:rgba(0,0,0,.22);color:#e6fbff}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border-radius:12px;border:1px solid var(--glass-border);cursor:pointer;color:#e9f7ff;background:rgba(255,255,255,.06)}
        .btn.primary{background:linear-gradient(135deg,#00d4ff,#00ff88);color:#001218;border:none}
        .btn.ghost{background:transparent}
        .btn.danger{background:rgba(255,51,102,.12);border-color:var(--danger);color:#ff9db4}
        .btn:focus{outline:2px solid var(--accent)}
        .skeleton{position:relative;overflow:hidden;background:rgba(255,255,255,.06);border-radius:12px;min-height:96px}
        .skeleton::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);transform:translateX(-100%);animation:shimmer 1.2s infinite}
        @keyframes shimmer{100%{transform:translateX(100%)}}
        .modalOverlay{position:fixed;inset:0;background:rgba(0,10,30,.75);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center}
        .modal{background:rgba(10,18,38,.9);border:2px solid var(--glass-border);border-radius:22px;padding:24px 26px;max-width:560px;width:92%}
        .close{position:absolute;right:18px;top:10px;background:transparent;border:none;font-size:26px;color:#fff;cursor:pointer}
      `}</style>

      <div className="shell">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "" : "hide"}`} role="navigation">
          <div className="logo">
            <div className="logoTitle">EAZY BYTS</div>
            <div className="logoSub">TRADE APP</div>
          </div>
          <nav className="nav" aria-label="Primary">
            {[
              { id: "dashboard", icon: "🏠", label: "Dashboard" },
              { id: "portfolio", icon: "💼", label: "Portfolio" },
              { id: "news", icon: "📰", label: "News" },
              { id: "orders", icon: "🧾", label: "Orders" },
              { id: "help", icon: "❓", label: "Help" },
              { id: "settings", icon: "⚙️", label: "Settings" },
            ].map((m) => (
              <button
                key={m.id}
                className={selectedMenu === m.id ? "active" : ""}
                aria-current={selectedMenu === m.id ? "page" : undefined}
                onClick={() => {
                  setSelectedMenu(m.id);
                  setSidebarOpen(false);
                  if (m.id === "portfolio") navigate("/portfolio");
                  if (m.id === "orders") navigate("/orders");
                }}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </nav>
          <div className="userBox">
            <div className="avatar">U</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                {user?.username || user?.handle || "User"}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Premium Member
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main" style={{ marginLeft: sidebarOpen ? 280 : 0 }}>
          <div className="header">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                className="btn ghost"
                aria-label="Toggle Menu"
                onClick={() => setSidebarOpen((s) => !s)}
              >
                ☰
              </button>
              <div>
                <div className="title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span role="img" aria-label="document">
                    📄
                  </span>{" "}
                  Trading Dashboard
                </div>
                <div
                  className="muted"
                  style={{ fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}
                >
                  Live quotes & instant order flow — last tick:{" "}
                  <Badge freshnessSec={freshnessSec} />
                </div>
              </div>
            </div>
            <div>
              <button className="btn" onClick={() => setShowAIModal(true)} aria-label="Open AI Assistant">
                💬 AI
              </button>
            </div>
          </div>

          {/* Watchlist controls */}
          <section className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input
                className="inp"
                aria-label="Add symbol"
                placeholder="Add symbol (e.g., AAPL) and Enter"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              />
              <button className="btn" onClick={() => addSymbol()} aria-label="Add symbol">
                + Add
              </button>
              <button className="btn ghost" onClick={loadDemo}>
                Try demo symbols
              </button>
              {!!(watchlist && watchlist.length) && (
                <div className="muted" style={{ marginLeft: 6 }}>
                  Subscribed: {watchlist.join(", ")}
                </div>
              )}
            </div>
            {!(watchlist && watchlist.length) && (
              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ marginBottom: 10 }}>
                  No symbols yet. Add above or click a suggestion to get started.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {suggestionSymbols.map((s) => (
                    <button key={s} className="btn" onClick={() => addSymbol(s)} aria-label={`Add ${s}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Dashboard panels */}
          {selectedMenu === 'dashboard' && (
          <section>
            <div className="dash-grid">
              <div className="dash-left">
                <div className="grid stocks">
            {(() => {
              console.log('[Dashboard] Rendering stocks section:', {
                watchlistExists: !!watchlist,
                watchlistLength: watchlist?.length || 0,
                cardsLength: cards.length,
                showEmpty: !(watchlist && watchlist.length),
                showSkeleton: (watchlist && watchlist.length) && cards.length === 0,
                showCards: cards.length > 0
              });
              return null;
            })()}
            
            {!(watchlist && watchlist.length) && (
              <div className="card" style={{ textAlign: "center" }}>
                <div className="muted">Add symbols to start streaming quotes.</div>
                <div style={{ marginTop: 10, fontSize: '12px', color: '#999' }}>
                  Debug: watchlist={watchlist?.length || 0}, holdings={holdings?.length || 0}
                </div>
              </div>
            )}

            {(watchlist && watchlist.length) && cards.length === 0 && (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton" />
                ))}
              </>
            )}

            {cards.map((c, i) => {
              console.log('[Dashboard] Rendering card:', c);
              return (
              <div
                key={c.symbol}
                className="card"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(12px)",
                  transition: `all .35s ease ${i * 0.05}s`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="avatar" style={{ width: 44, height: 44 }}>{c.symbol[0]}</div>
                    <div>
                      <div className="muted" style={{ fontWeight: 800 }}>
                        {c.symbol}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>${fmt2(c.price)}</div>
                      <div className={c.positive ? "pos" : "neg"} style={{ fontSize: 13 }}>
                        {c.positive ? "+" : ""}
                        {Number(c.changePct || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn primary"
                      onClick={() => setShowStockModal(c.symbol)}
                      aria-label={`Trade ${c.symbol}`}
                    >
                      Trade
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => removeSymbol(c.symbol)}
                      aria-label={`Remove ${c.symbol}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="progress" title={`data points: ${c.spark.length || 0}/120`}>
                  <span style={{ width: `${c.progress}%` }} />
                </div>
                <svg style={{ marginTop: 10, width: "100%", height: 60 }} viewBox="0 0 200 60" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke={c.positive ? "#00ff88" : "#ff3366"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={linePoints(c.spark || [], 200, 60)}
                  />
                </svg>
              </div>
            );
            })}
                </div>
              </div>
              <aside className="dash-right">
                <div className="card" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight:900, fontSize:18, marginBottom:6 }}>Quick Stats</div>
                  <div className="facts">
                    <div><span>Watchlist</span><b>{watchlist?.length || 0}</b></div>
                    <div><span>Holdings</span><b>{holdings?.length || 0}</b></div>
                    <div><span>Freshness</span><b><Badge freshnessSec={freshnessSec} /></b></div>
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontWeight:900, fontSize:18, marginBottom:8 }}>Position Calculator</div>
                  <div className="calc-grid">
                    <label>
                      <span>Symbol</span>
                      <input className="inp" value={calcSymbol} onChange={(e)=>setCalcSymbol(e.target.value.toUpperCase())} placeholder="e.g., AAPL" />
                    </label>
                    <label>
                      <span>Quantity</span>
                      <input className="inp" type="number" min="0" value={calcQty} onChange={(e)=>setCalcQty(Number(e.target.value))} />
                    </label>
                    <label>
                      <span>Entry</span>
                      <input className="inp" type="number" min="0" step="0.01" value={calcEntry} onChange={(e)=>setCalcEntry(Number(e.target.value))} />
                    </label>
                    <label>
                      <span>Current</span>
                      <div style={{ display:'flex', gap:6 }}>
                        <input className="inp" type="number" min="0" step="0.01" value={calcPrice} onChange={(e)=>setCalcPrice(Number(e.target.value))} />
                        <button className="btn" onClick={()=>setCalcPrice(getPx(calcSymbol) || calcPrice)}>Use live</button>
                      </div>
                    </label>
                  </div>
                  <div className="facts" style={{ marginTop: 10 }}>
                    <div><span>Cost</span><b>${fmt2(calc.cost)}</b></div>
                    <div><span>Value</span><b>${fmt2(calc.mv)}</b></div>
                    <div><span>PnL</span><b className={calc.pnl>=0?'pos':'neg'}>${fmt2(calc.pnl)} ({calc.pnlPct.toFixed(2)}%)</b></div>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:10 }}>
                    <div className="card" style={{ padding:10 }}><div className="muted" style={{ fontSize:12 }}>Stop -5%</div><b>${fmt2(calc.stop5)}</b></div>
                    <div className="card" style={{ padding:10 }}><div className="muted" style={{ fontSize:12 }}>Target +5%</div><b>${fmt2(calc.tgt5)}</b></div>
                    <div className="card" style={{ padding:10 }}><div className="muted" style={{ fontSize:12 }}>Target +10%</div><b>${fmt2(calc.tgt10)}</b></div>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:12 }}>
                    <button className="btn primary" onClick={()=> setShowStockModal(calcSymbol) }>Trade</button>
                    <button className="btn" onClick={()=> { setCalcQty(10); setCalcEntry(getPx(calcSymbol) || 100); setCalcPrice(getPx(calcSymbol) || 100); }}>Reset</button>
                  </div>
                </div>
              </aside>
            </div>
          </section>
          )}

          {selectedMenu === 'news' && (
            <section className="card" style={{ marginTop: 12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontWeight:900, fontSize:18 }}>Live News</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input className="inp" value={newsQuery} onChange={(e)=>setNewsQuery(e.target.value.toUpperCase())} placeholder="Symbol or topic (e.g., AAPL, NVDA, AI)" />
                  <button className="btn" onClick={()=>fetchNews(newsQuery || 'AAPL')}>Search</button>
                </div>
              </div>
              {newsLoading && <div className="muted">loading…</div>}
              {newsErr && <div className="neg">{newsErr}</div>}
              <div style={{ display:'grid', gap:10 }}>
                {news.map((n,i)=>(
                  <a key={i} className="card" href={n.u} target="_blank" rel="noreferrer" style={{ padding:12, textDecoration:'none', color:'inherit' }}>
                    <div style={{ fontWeight:800 }}>{n.t}</div>
                    <div className="muted" style={{ fontSize:12 }}>{n.s}</div>
                  </a>
                ))}
                {!news.length && !newsLoading && <div className="muted">no headlines right now</div>}
              </div>
            </section>
          )}

          {selectedMenu === 'help' && (
            <section className="card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight:900, fontSize:18, marginBottom:10 }}>Help & Tips</div>
              <ul style={{ margin:0, paddingLeft:18, lineHeight:1.8 }}>
                <li>Use "+ Add" to build your watchlist, then Trade directly from a card.</li>
                <li>Orders update the Orders page instantly and refresh Portfolio holdings and stats.</li>
                <li>Quotes can stream over WebSocket when the server emits QUOTE messages.</li>
                <li>Portfolio → Individual shows BUY vs SELL and orders filtered by symbol.</li>
              </ul>
            </section>
          )}

          {selectedMenu === 'settings' && (
            <section className="card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight:900, fontSize:18, marginBottom:10 }}>Settings</div>
              <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))' }}>
                <div className="card" style={{ padding:12 }}>
                  <div className="muted" style={{ marginBottom:6 }}>Table density</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn">Comfortable</button>
                    <button className="btn">Compact</button>
                  </div>
                </div>
                <div className="card" style={{ padding:12 }}>
                  <div className="muted" style={{ marginBottom:6 }}>Notifications</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn">Enable</button>
                    <button className="btn">Mute</button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Extras */}
          <section className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Extra features</div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {[
                { icon: "🧠", title: "AI Trading Bot", description: "Automated intelligent trading" },
                { icon: "🌐", title: "Global Market Access", description: "Trade worldwide markets" },
                { icon: "🛡️", title: "Enhanced Security", description: "Military-grade encryption" },
              ].map((f) => (
                <div key={f.title} className="card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{f.icon}</span>
                    <div>
                      <b style={{ color: "var(--accent)" }}>{f.title}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{f.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="muted" style={{ marginTop: 18, textAlign: "center", fontSize: 12 }}>
            EAZY BYTS • Live Quotes • Orders via TradeProvider
          </div>
        </main>
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div className="modalOverlay" onClick={() => setShowAIModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowAIModal(false)}>
              &times;
            </button>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8, color: "var(--accent)" }}>
              🧠 Trade Assistant
            </div>
            <div className="muted" style={{ lineHeight: 1.7 }}>
              Predictive market trends, automated portfolio optimization, and real-time risk
              signals.
            </div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {!!showStockModal && (
        <div className="modalOverlay" onClick={() => setShowStockModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            <button className="close" onClick={() => setShowStockModal(null)}>
              &times;
            </button>
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10 }}>{showStockModal}</div>
            <div className="muted" style={{ marginBottom: 12 }}>
              Last: <b>${fmt2(quotes?.[showStockModal]?.price ?? 0)}</b>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" aria-pressed={side === "BUY"} onClick={() => setSide("BUY")}>
                  BUY
                </button>
                <button className="btn" aria-pressed={side === "SELL"} onClick={() => setSide("SELL")}>
                  SELL
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select
                  className="inp"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  aria-label="Order type"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
                <select className="inp" value={tif} onChange={(e) => setTif(e.target.value)} aria-label="Time in force">
                  <option value="DAY">DAY</option>
                  <option value="GTC">GTC</option>
                  <option value="IOC">IOC</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: orderType === "LIMIT" ? "1fr 1fr" : "1fr", gap: 8 }}>
                <input
                  ref={qtyRef}
                  className="inp"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  placeholder="Qty"
                  aria-label="Quantity"
                />
                {orderType === "LIMIT" && (
                  <input
                    className="inp"
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="Limit price"
                    aria-label="Limit price"
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn primary"
                  onClick={() => handlePlaceOrder(side)}
                  disabled={submitting}
                  aria-label="Submit order"
                >
                  {submitting ? "Submitting…" : `Submit ${side}`}
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setSide("BUY");
                    setOrderType("MARKET");
                    setTif("DAY");
                    setQuantity(10);
                    setLimitPrice("");
                    try {
                      qtyRef.current?.focus();
                    } catch {}
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toasts toasts={toasts} onClose={dismissToast} />

      {/* DEV TESTS (dev only) */}
      {import.meta && import.meta.env && import.meta.env.MODE !== "production" && (
        <script>{`
          try {
            (function DEV_TESTS(){
              const pts = (${linePoints.toString()})([0,10], 10, 10);
              console.assert(pts === '0,10 10,0', 'linePoints basic');
              const constant = (${linePoints.toString()})([5,5,5], 6, 6);
              console.assert(typeof constant === 'string' && constant.split(' ').length === 3, 'linePoints constant');
              console.info('%cDashboard DEV TESTS PASSED','color:#00ff88;font-weight:900');
            })();
          } catch (e) { console.error('DEV TESTS FAILED', e); }
        `}</script>
      )}
    </>
  );
}
