// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrade } from "../context/TradeProvider";

/**
 * EAZY BYTS — Dashboard (Backend‑Connected + TradeProvider + Relative Paths)
 *
 * Fix for crash: previous code called useOrders() without a mounted provider.
 *  - Now we use useTrade() from TradeProvider (mounted at the app root).
 *
 * Also:
 *  - All REST calls use RELATIVE paths ("/api/..."), with Authorization header when present
 *  - SSE stream uses token query param (EventSource cannot set headers)
 */

// 🔧 Auth shim (prevents build errors if AuthProvider path is different/missing)


// 🔧 Auth shim (prevents build errors if AuthProvider path is different/missing)
function useAuthShim() {
  try {
    if (typeof window !== "undefined" && typeof window.__USE_AUTH__ === "function") {
      return window.__USE_AUTH__();
    }
  } catch {}
  return { isAuthed: true };
}
const useAuth = useAuthShim;

// ─────────────────────────────────────────────────────────────────────────────
// Auth token helpers
// ─────────────────────────────────────────────────────────────────────────────
function getAuthToken() {
  try {
    if (typeof window !== "undefined") {
      if (typeof window.__GET_TOKEN__ === "function") return window.__GET_TOKEN__();
      return (
        localStorage.getItem("auth.token") ||
        localStorage.getItem("token") ||
        null
      );
    }
  } catch {}
  return null;
}
function authHeaders() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend adapter (all RELATIVE paths)
// ─────────────────────────────────────────────────────────────────────────────
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
    const r = await fetch(
      `/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
      { headers: { ...authHeaders() } }
    );
    if (r.ok) return (await r.json()) ?? {};
    return {};
  },
};

const fmt = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
        try {
          es.close();
        } catch {}
      };
    } catch {}
    return () => {
      try {
        es?.close();
      } catch {}
    };
  }, [url, enabled, onMessage]);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const isAuthed = auth?.isAuthed;

  // ——— Trade context ———
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

  // Watchlist (no defaults)
  const [watchlist, setWatchlist] = useLocalStorage("dash.watchlist", []);
  const [newSymbol, setNewSymbol] = useState("");

  // Quotes state
  const [quotes, setQuotes] = useState({}); // {SYM: {price, changePct, ts}}
  const [series, setSeries] = useState({}); // {SYM: number[]}
  const [lastTickAt, setLastTickAt] = useState(null);

  // Ticket state expected by Step 4
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState(10);
  const [orderType, setOrderType] = useState("MARKET"); // MARKET | LIMIT
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState("DAY"); // UI only
  const [submitting, setSubmitting] = useState(false);
  const qtyRef = useRef(null);

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
    ? `/api/quotes/stream?symbols=${encodeURIComponent(watchlist.join(","))}${
        token ? `&token=${encodeURIComponent(token)}` : ""
      }`
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
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, { symbol: k, ...v }])
          ),
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
      } catch {}
    };
    const id = setInterval(go, 5000);
    return () => {
      clearInterval(id);
      alive = false;
    };
  }, [watchlist]);

  // Manipulate watchlist
  const addSymbol = () => {
    const s = (newSymbol || "").toUpperCase().replace(/[^A-Z0-9._-]/g, "");
    if (!s) return;
    if (watchlist.includes(s)) return setNewSymbol("");
    setWatchlist([s, ...watchlist].slice(0, 20));
    setNewSymbol("");
  };
  const removeSymbol = (s) => setWatchlist(watchlist.filter((x) => x !== s));

  // Step 4 — Connect BUY/SELL to backend via OrdersProvider (relative paths inside provider)
  const handlePlaceOrder = async (action) => {
    if (!quantity || quantity <= 0) return alert("Enter a valid quantity");
    if (String(orderType).toUpperCase() === "LIMIT" && (!limitPrice || Number(limitPrice) <= 0))
      return alert("Enter a valid limit price");

    const symbol = showStockModal || watchlist[0] || "AAPL"; // fallbacks
    try {
      setSubmitting(true);
      await placeOrder({
        symbol,
        side: String(action || "BUY").toUpperCase(),
        type: String(orderType || "MARKET").toUpperCase(),
        qty: quantity,
        limitPrice:
          String(orderType || "MARKET").toUpperCase() === "LIMIT"
            ? Number(limitPrice)
            : undefined,
      });
      if (String(orderType).toUpperCase() === "LIMIT") setLimitPrice("");
      setShowStockModal(null);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Build cards from quotes
  const liveCards = useMemo(
    () =>
      watchlist.map((sym) => {
        const q = quotes[sym] || {};
        const price = Number(q.price || 0);
        const changePct = Number(q.changePct || 0);
        const spark = series[sym] || [];
        return {
          symbol: sym,
          price,
          changePct,
          positive: changePct >= 0,
          progress: Math.min(100, Math.max(0, Math.round((spark.length / 120) * 100))),
          spark,
        };
      }),
    [watchlist, quotes, series]
  );

  const lastTickText = useMemo(() => {
    if (!lastTickAt) return "waiting for data…";
    const sec = Math.max(0, (Date.now() - lastTickAt) / 1000);
    if (sec < 1) return "live";
    if (sec < 60) return `${Math.floor(sec)}s ago`;
    return `${Math.floor(sec / 60)}m ago`;
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
        .nav button{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:transparent;border:none;color:rgba(255,255,255,.9);cursor:pointer;font-weight:700;font-size:15px;transition:all .2s}
        .nav button:hover{background:rgba(0,212,255,.08);transform:translateX(4px)}
        .nav button.active{background:linear-gradient(135deg,rgba(0,212,255,.22),rgba(138,43,226,.22));border-left:4px solid var(--accent)}
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
        .pill{display:inline-block;padding:6px 10px;border:1px solid var(--glass-border);border-radius:999px;font-size:12px;margin-right:6px;background:rgba(255,255,255,.04);cursor:pointer}
        .pill.rm{background:rgba(255,51,102,.12);border-color:var(--danger)}
        .modalOverlay{position:fixed;inset:0;background:rgba(0,10,30,.75);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center}
        .modal{background:rgba(10,18,38,.9);border:2px solid var(--glass-border);border-radius:22px;padding:24px 26px;max-width:560px;width:92%}
        .close{position:absolute;right:18px;top:10px;background:transparent;border:none;font-size:26px;color:#fff;cursor:pointer}
      `}</style>

      <div className="shell">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "" : "hide"}`} role="navigation">
          <div className="logo"><div className="logoTitle">EAZY BYTS</div><div className="logoSub">TRADE APP</div></div>
          <nav className="nav">
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
          <div className="userBox"><div className="avatar">U</div><div><div style={{ fontWeight: 800, fontSize: 15 }}>Trading Pro</div><div className="muted" style={{ fontSize: 12 }}>Premium Member</div></div></div>
        </aside>

        {/* Main */}
        <main className="main">
          <div className="header">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="menuBtn" onClick={() => setSidebarOpen((s) => !s)}>
                ☰
              </button>
              <div>
                <div className="title">Trading Dashboard</div>
                <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                  Live quotes & instant order flow — last tick: <b>{lastTickText}</b>
                </div>
              </div>
            </div>
            <div>
              <button className="pill" onClick={() => setShowAIModal(true)}>
                🧠 AI
              </button>
            </div>
          </div>

          {/* Watchlist controls */}
          <section className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input
                className="inp"
                placeholder="Add symbol (e.g., AAPL) and Enter"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              />
              <button className="pill" onClick={addSymbol}>
                + Add
              </button>
              {!!watchlist.length && (
                <div className="muted" style={{ marginLeft: 6 }}>
                  Subscribed: {watchlist.join(", ")}
                </div>
              )}
            </div>
            {!watchlist.length && (
              <div className="muted" style={{ marginTop: 8 }}>
                No symbols yet. Add above or expose <code>/api/symbols</code> to auto‑load your
                universe.
              </div>
            )}
          </section>

          {/* Live Stocks */}
          <section className="grid stocks">
            {liveCards.map((c, i) => (
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
                      <div style={{ fontSize: 22, fontWeight: 900 }}>${fmt(c.price)}</div>
                      <div className={c.positive ? "pos" : "neg"} style={{ fontSize: 13 }}>
                        {c.positive ? "+" : ""}
                        {Number(c.changePct || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="pill" onClick={() => setShowStockModal(c.symbol)}>
                      Trade
                    </button>
                    <button className="pill rm" onClick={() => removeSymbol(c.symbol)}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className="progress" title={`data points: ${c.spark.length}/120`}>
                  <span style={{ width: `${c.progress}%` }} />
                </div>
                <svg style={{ marginTop: 10, width: "100%", height: 60 }} viewBox="0 0 200 60" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke={c.positive ? "#00ff88" : "#ff3366"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={linePoints(c.spark, 200, 60)}
                  />
                </svg>
              </div>
            ))}
          </section>

          {/* Extras */}
          <section className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10, letterSpacing: ".06em" }}>
              EXTRA FEATURES
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              {[
                { icon: "🧠", title: "AI TRADING BOT", description: "Automated intelligent trading" },
                { icon: "🌐", title: "GLOBAL MARKET ACCESS", description: "Trade worldwide markets" },
                { icon: "🛡️", title: "ENHANCED SECURITY", description: "Military‑grade encryption" },
              ].map((f) => (
                <button key={f.title} className="pill" onClick={() => setShowAIModal(true)} style={{ padding: 14 }}>
                  <span style={{ fontSize: 24, marginRight: 8 }}>{f.icon}</span>
                  <b style={{ color: "var(--accent)" }}>{f.title}</b>
                  <span className="muted" style={{ marginLeft: 8 }}>
                    {f.description}
                  </span>
                </button>
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
              Predictive market trends, automated portfolio optimization, and real‑time risk
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
              Last: <b>${fmt(quotes[showStockModal]?.price ?? 0)}</b>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button className={`pill ${side === "BUY" ? "active" : ""}`} onClick={() => setSide("BUY")}>
                  BUY
                </button>
                <button className={`pill ${side === "SELL" ? "active" : ""}`} onClick={() => setSide("SELL")}>
                  SELL
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select className="inp" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
                <select className="inp" value={tif} onChange={(e) => setTif(e.target.value)}>
                  <option value="DAY">DAY</option>
                  <option value="GTC">GTC</option>
                  <option value="IOC">IOC</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  ref={qtyRef}
                  className="inp"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  placeholder="Qty"
                />
                {orderType === "LIMIT" && (
                  <input
                    className="inp"
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="Limit price"
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="pill" onClick={() => handlePlaceOrder(side)} disabled={submitting}>
                  {submitting ? "Submitting…" : `Submit ${side}`}
                </button>
                <button
                  className="pill"
                  onClick={() => {
                    setSide("BUY");
                    setOrderType("MARKET");
                    setTif("DAY");
                    setQuantity(10);
                    setLimitPrice("");
                    try { qtyRef.current?.focus(); } catch {}
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
