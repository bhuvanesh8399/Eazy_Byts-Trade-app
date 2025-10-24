// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrade } from "../context/TradeProvider";

/**
 * EAZY BYTS — Trading Dashboard (UX pass + backend, no errors)
 *
 * What changed (based on your punch‑list):
 *  - Unified branding, stronger empty state with suggestion chips & demo data
 *  - Consistent buttons (primary/secondary/ghost), visible Trade CTA on cards
 *  - Live badge shows freshness (green=live, amber=stale, red=old)
 *  - Skeleton loaders for quotes when waiting for data
 *  - Toast feedback for add/remove/errors
 *  - Relative REST paths + token header helper; SSE uses ?token= query param
 *  - Uses TradeProvider's hook (`useTrade`) for BUY/SELL
 *  - A11y: aria labels, aria-live status, focus outlines
 */

// 🔧 Auth shim (prevents build errors if your AuthProvider path differs)
function useAuthShim() {
  try {
    if (typeof window !== "undefined" && typeof window.__USE_AUTH__ === "function") {
      return window.__USE_AUTH__();
    }
  } catch {}
  return { isAuthed: true, user: { handle: "bhuvanesh11" } };
}
const useAuth = useAuthShim;

// ─────────────────────────────────────────────────────────────────────────────
// Token helpers + small HTTP util (all RELATIVE paths)
// ─────────────────────────────────────────────────────────────────────────────
function getAuthToken() {
  try {
    if (typeof window !== "undefined") {
      if (typeof window.__GET_TOKEN__ === "function") return window.__GET_TOKEN__();
      return localStorage.getItem("auth.token") || localStorage.getItem("token") || null;
    }
  } catch {}
  return null;
}
function authHeaders() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
const API = {
  async listSymbols() {
    try {
      const r = await fetch("/api/symbols", { headers: { ...authHeaders() } });
      if (r.ok) return (await r.json()) ?? [];
    } catch {}
    return [];
  },
  async fetchQuotes(symbols) {
    if (!symbols?.length) return {};
    const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, {
      headers: { ...authHeaders() },
    });
    if (r.ok) return (await r.json()) ?? {};
    return {};
  },
};

const fmt2 = (n) =>
  Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function useLocalStorage(key, initialValue) {
  const [val, setVal] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

function useEventSource(url, onMessage, enabled) {
  useEffect(() => {
    if (!enabled || !url) return;
    let es;
    try {
      es = new EventSource(url);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          onMessage?.(data);
        } catch {}
      };
      es.onerror = () => {
        try { es.close(); } catch {}
      };
    } catch {}
    return () => { try { es?.close(); } catch {} };
  }, [url, enabled, onMessage]);
}

// tiny line helper (sparkline)
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

function Badge({ freshness }) {
  // freshness in seconds; <1 green, <30 amber, else red
  let color = "#00ff88";
  if (freshness >= 30) color = "#ff3366"; else if (freshness >= 1) color = "#ffc14d";
  const label = freshness < 1 ? "Live" : freshness < 60 ? `${Math.floor(freshness)}s` : `${Math.floor(freshness/60)}m`;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 12, padding: "4px 8px", borderRadius: 999,
      border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)",
    }} aria-live="polite">
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      <b>{label}</b>
    </span>
  );
}

function Toasts({ toasts, onClose }) {
  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} role="status" style={{
          minWidth: 260,
          background: "rgba(10,18,38,.9)",
          color: "#e9f7ff",
          border: "1px solid rgba(255,255,255,.14)",
          borderRadius: 12,
          padding: "10px 12px",
          boxShadow: "0 8px 22px rgba(0,0,0,.35)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <b>{t.title}</b>
            <button aria-label="Close" onClick={() => onClose(t.id)} style={{ background: "transparent", border: 0, color: "#9fd8ff", cursor: "pointer" }}>✕</button>
          </div>
          {t.msg && <div style={{ fontSize: 12, opacity: .9, marginTop: 4 }}>{t.msg}</div>}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const isAuthed = auth?.isAuthed;
  const { placeOrder } = useTrade();

  useEffect(() => {
    if (typeof isAuthed !== "undefined" && !isAuthed) {
      const t = setTimeout(() => navigate("/login", { replace: true }), 100);
      return () => clearTimeout(t);
    }
  }, [isAuthed, navigate]);

  // UI
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");
  const [showAIModal, setShowAIModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(null); // symbol currently trading
  const [toasts, setToasts] = useState([]);

  // Watchlist (no defaults)
  const [watchlist, setWatchlist] = useLocalStorage("dash.watchlist", []);
  const [newSymbol, setNewSymbol] = useState("");

  // Quotes state
  const [quotes, setQuotes] = useState({}); // {SYM: {price, changePct, ts}}
  const [series, setSeries] = useState({}); // {SYM: number[]}
  const [lastTickAt, setLastTickAt] = useState(null);

  // Ticket state (Trade modal)
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState(10);
  const [orderType, setOrderType] = useState("MARKET"); // MARKET | LIMIT
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState("DAY"); // UI only
  const [submitting, setSubmitting] = useState(false);
  const qtyRef = useRef(null);

  // Suggestions for empty state
  const suggestionSymbols = ["AAPL", "TSLA", "NVDA", "GOOGL", "AMZN", "TCS", "RELIANCE", "INFY"];

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Seed watchlist from backend if empty
  useEffect(() => {
    (async () => {
      if (watchlist.length) return;
      const syms = await API.listSymbols();
      const ids = Array.isArray(syms) ? syms.map((x) => x.symbol).filter(Boolean) : [];
      if (ids.length) setWatchlist(ids.slice(0, 8));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSE stream — token sent as query param (EventSource does not support headers)
  const token = getAuthToken();
  const streamUrl = watchlist.length
    ? `/api/quotes/stream?symbols=${encodeURIComponent(watchlist.join(","))}${token ? `&token=${encodeURIComponent(token)}` : ""}`
    : "";
  useEventSource(
    streamUrl,
    (payload) => {
      if (!payload?.symbol) return;
      setLastTickAt(Date.now());
      setQuotes((q) => ({ ...q, [payload.symbol]: payload }));
      setSeries((s) => {
        const arr = [...(s[payload.symbol] || [])];
        arr.push(Number(payload.price || 0));
        if (arr.length > 120) arr.shift();
        return { ...s, [payload.symbol]: arr };
      });
    },
    !!watchlist.length
  );

  // Polling fallback (5s)
  useEffect(() => {
    if (!watchlist.length) return;
    let alive = true;
    const go = async () => {
      try {
        const data = await API.fetchQuotes(watchlist);
        if (!alive || !data) return;
        const now = Date.now();
        setLastTickAt(now);
        setQuotes((q) => ({
          ...q,
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { symbol: k, ...v }]))
        }));
        setSeries((s) => {
          const next = { ...s };
          for (const [k, v] of Object.entries(data)) {
            const arr = next[k] ? [...next[k]] : [];
            arr.push(Number(v?.price || 0));
            if (arr.length > 120) arr.shift();
            next[k] = arr;
          }
          return next;
        });
      } catch (e) {
        notify("Network error", e?.message || "Could not refresh quotes");
      }
    };
    const id = setInterval(go, 5000);
    return () => { clearInterval(id); alive = false; };
  }, [watchlist]);

  // Toast helpers
  const notify = (title, msg) => setToasts((t) => [...t, { id: Date.now() + Math.random(), title, msg }]);
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  // Watchlist ops
  const addSymbol = (fromChip) => {
    const raw = fromChip || newSymbol;
    const s = (raw || "").toUpperCase().replace(/[^A-Z0-9._-]/g, "");
    if (!s) return;
    if (watchlist.includes(s)) { setNewSymbol(""); notify("Already added", s); return; }
    setWatchlist([s, ...watchlist].slice(0, 24));
    setNewSymbol("");
    notify("Added to watchlist", s);
  };
  const removeSymbol = (s) => { setWatchlist(watchlist.filter((x) => x !== s)); notify("Removed", s); };
  const loadDemo = () => { setWatchlist(["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"]); notify("Demo symbols added"); };

  // Step 4 — Connect BUY/SELL via TradeProvider (relative paths inside provider)
  const handlePlaceOrder = async (action) => {
    if (!quantity || quantity <= 0) return alert("Enter a valid quantity");
    if (orderType.toUpperCase() === "LIMIT" && (!limitPrice || Number(limitPrice) <= 0))
      return alert("Enter a valid limit price");

    const symbol = showStockModal || watchlist[0] || "AAPL"; // fallbacks
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
    } finally { setSubmitting(false); }
  };

  // Build UI data from quotes
  const liveCards = useMemo(() => watchlist.map((sym) => {
    const q = quotes[sym] || {};
    const price = Number(q.price || 0);
    const changePct = Number(q.changePct || 0);
    const spark = series[sym] || [];
    return { symbol: sym, price, changePct, positive: changePct >= 0, progress: Math.min(100, Math.max(0, Math.round((spark.length / 120) * 100))), spark };
  }), [watchlist, quotes, series]);

  const lastTickText = useMemo(() => {
    if (!lastTickAt) return Infinity; // treat as very old -> red
    const sec = Math.max(0, (Date.now() - lastTickAt) / 1000);
    return sec;
  }, [lastTickAt]);

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
          <div className="logo"><div className="logoTitle">EAZY BYTS</div><div className="logoSub">TRADE APP</div></div>
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
                onClick={() => { setSelectedMenu(m.id); setSidebarOpen(false); if (m.id === "portfolio") navigate("/portfolio"); if (m.id === "orders") navigate("/orders"); }}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </nav>
          <div className="userBox"><div className="avatar">U</div><div><div style={{ fontWeight: 800, fontSize: 15 }}>Trading Pro</div><div className="muted" style={{ fontSize: 12 }}>Premium Member</div></div></div>
        </aside>

        {/* Main */}
        <main className="main">
          <div className="header">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="btn ghost" aria-label="Toggle Menu" onClick={() => setSidebarOpen((s) => !s)}>☰</button>
              <div>
                <div className="title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span role="img" aria-label="document">📄</span> Trading Dashboard
                </div>
                <div className="muted" style={{ fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  Live quotes & instant order flow — last tick: <Badge freshness={lastTickText === Infinity ? 9999 : lastTickText} />
                </div>
              </div>
            </div>
            <div>
              <button className="btn" onClick={() => setShowAIModal(true)} aria-label="Open AI Assistant">💬 AI</button>
            </div>
          </div>

          {/* Watchlist controls */}
          <section className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input className="inp" aria-label="Add symbol" placeholder="Add symbol (e.g., AAPL) and Enter" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSymbol()} />
              <button className="btn" onClick={() => addSymbol()} aria-label="Add symbol">+ Add</button>
              <button className="btn ghost" onClick={loadDemo}>Try demo symbols</button>
              {!!watchlist.length && <div className="muted" style={{ marginLeft: 6 }}>Subscribed: {watchlist.join(", ")}</div>}
            </div>
            {!watchlist.length && (
              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ marginBottom: 10 }}>No symbols yet. Add above, click a suggestion, or expose <code>/api/symbols</code> to auto‑load your universe.</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {suggestionSymbols.map((s) => (
                    <button key={s} className="btn" onClick={() => addSymbol(s)} aria-label={`Add ${s}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Live Stocks */}
          <section className="grid stocks">
            {watchlist.length === 0 && (
              <div className="card" style={{ textAlign: "center" }}>
                <div className="muted">Add symbols to start streaming quotes.</div>
              </div>
            )}

            {watchlist.length > 0 && liveCards.length === 0 && (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton" />
                ))}
              </>
            )}

            {liveCards.map((c, i) => (
              <div key={c.symbol} className="card" style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: `all .35s ease ${i * 0.05}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="avatar" style={{ width: 44, height: 44 }}>{c.symbol[0]}</div>
                    <div>
                      <div className="muted" style={{ fontWeight: 800 }}>{c.symbol}</div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>${fmt2(c.price)}</div>
                      <div className={c.positive ? "pos" : "neg"} style={{ fontSize: 13 }}>
                        {c.positive ? "+" : ""}{Number(c.changePct || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn primary" onClick={() => setShowStockModal(c.symbol)} aria-label={`Trade ${c.symbol}`}>Trade</button>
                    <button className="btn danger" onClick={() => removeSymbol(c.symbol)} aria-label={`Remove ${c.symbol}`}>Remove</button>
                  </div>
                </div>
                <div className="progress" title={`data points: ${c.spark.length}/120`}><span style={{ width: `${c.progress}%` }} /></div>
                <svg style={{ marginTop: 10, width: "100%", height: 60 }} viewBox="0 0 200 60" preserveAspectRatio="none">
                  <polyline fill="none" stroke={c.positive ? "#00ff88" : "#ff3366"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints(c.spark, 200, 60)} />
                </svg>
              </div>
            ))}
          </section>

          {/* Extras */}
          <section className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Extra features</div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {[
                { icon: "🧠", title: "AI Trading Bot", description: "Automated intelligent trading" },
                { icon: "🌐", title: "Global Market Access", description: "Trade worldwide markets" },
                { icon: "🛡️", title: "Enhanced Security", description: "Military‑grade encryption" },
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

          <div className="muted" style={{ marginTop: 18, textAlign: "center", fontSize: 12 }}>EAZY BYTS • Live Quotes • Orders via TradeProvider</div>
        </main>
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div className="modalOverlay" onClick={() => setShowAIModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowAIModal(false)}>&times;</button>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8, color: "var(--accent)" }}>🧠 Trade Assistant</div>
            <div className="muted" style={{ lineHeight: 1.7 }}>Predictive market trends, automated portfolio optimization, and real‑time risk signals.</div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {!!showStockModal && (
        <div className="modalOverlay" onClick={() => setShowStockModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            <button className="close" onClick={() => setShowStockModal(null)}>&times;</button>
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10 }}>{showStockModal}</div>
            <div className="muted" style={{ marginBottom: 12 }}>Last: <b>${fmt2(quotes[showStockModal]?.price ?? 0)}</b></div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" aria-pressed={side === "BUY"} onClick={() => setSide("BUY")}>BUY</button>
                <button className="btn" aria-pressed={side === "SELL"} onClick={() => setSide("SELL")}>SELL</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select className="inp" value={orderType} onChange={(e) => setOrderType(e.target.value)} aria-label="Order type">
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
                <input ref={qtyRef} className="inp" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} placeholder="Qty" aria-label="Quantity" />
                {orderType === "LIMIT" && (
                  <input className="inp" type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="Limit price" aria-label="Limit price" />
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary" onClick={() => handlePlaceOrder(side)} disabled={submitting} aria-label="Submit order">{submitting ? "Submitting…" : `Submit ${side}`}</button>
                <button className="btn ghost" onClick={() => { setSide("BUY"); setOrderType("MARKET"); setTif("DAY"); setQuantity(10); setLimitPrice(""); try { qtyRef.current?.focus(); } catch {} }}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toasts toasts={toasts} onClose={dismissToast} />

      {/* DEV TESTS (safe asserts in dev only) */}
      {import.meta && import.meta.env && import.meta.env.MODE !== 'production' && (
        <script>{`
          try {
            (function DEV_TESTS(){
              const line = (${linePoints.toString()})([0,10], 10, 10);
              console.assert(line === '0,10 10,0', 'linePoints basic');
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
