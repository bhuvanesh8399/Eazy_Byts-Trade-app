// src/state/AppStore.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

/** ---------------------------- backend adapter ----------------------------- **/
async function fetchJSON(url) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

const storage = {
  get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const AppStoreCtx = createContext(null);
export const useAppStore = () => useContext(AppStoreCtx);

/**
 * Expected backend (adapt/minify as needed):
 *  GET /api/watchlist                        -> string[] (e.g. ["AAPL","TSLA"])
 *  POST /api/watchlist {symbols:string[]}    -> {ok:true}
 *  GET /api/quotes?symbols=AAPL,TSLA         -> [{symbol, price, changePct, dayHigh, dayLow, volume}]
 *  WS  /ws/quotes  (message: {symbol, price, changePct?})  (optional)
 *  SSE /api/stream/quotes  (event: {symbol, price, changePct?}) (optional)
 *  GET /api/positions                         -> [{symbol, qty, avg, price, sector?}]
 *  GET /api/orders                            -> Order[]
 *  POST /api/orders                           -> Order (new/updated)
 */
export function AppStoreProvider({ children }) {
  const [watchlist, setWatchlist] = useState(() => storage.get("app.watchlist", []));
  const [prices, setPrices] = useState(() => storage.get("app.prices", {}));        // {SYM:{price,changePct,...}}
  const [positions, setPositions] = useState(() => storage.get("app.positions", []));
  const [orders, setOrders] = useState(() => storage.get("app.orders", []));
  const [connected, setConnected] = useState(false);
  const [lastTick, setLastTick] = useState(null);
  const pollRef = useRef(null);
  const wsRef = useRef(null);
  const sseRef = useRef(null);

  // persist
  useEffect(() => storage.set("app.watchlist", watchlist), [watchlist]);
  useEffect(() => storage.set("app.prices", prices), [prices]);
  useEffect(() => storage.set("app.positions", positions), [positions]);
  useEffect(() => storage.set("app.orders", orders), [orders]);

  // initial server state (watchlist, positions, orders)
  useEffect(() => {
    (async () => {
      try {
        const wl = await fetchJSON("/api/watchlist");
        if (Array.isArray(wl)) setWatchlist(wl);
      } catch { /* keep local */ }
      try { setPositions(await fetchJSON("/api/positions")); } catch { /* offline ok */ }
      try { setOrders(await fetchJSON("/api/orders")); } catch { /* offline ok */ }
    })();
  }, []);

  // quotes: WS → SSE → polling fallback
  useEffect(() => {
    cleanupStreams();

    if (!watchlist.length) { setConnected(false); return; }

    // 1) WebSocket
    try {
      const wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/quotes`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data || "{}");
        if (!msg.symbol) return;
        applyQuote(msg.symbol, msg);
      };
      ws.onerror = () => {};
      ws.onclose = () => {
        setConnected(false);
        // 2) try SSE
        startSSEorPoll();
      };
      return cleanupStreams;
    } catch {
      // if WS ctor throws, fallback immediately
      startSSEorPoll();
      return cleanupStreams;
    }

    function startSSEorPoll() {
      // 2) SSE
      try {
        const es = new EventSource(`/api/stream/quotes?symbols=${encodeURIComponent(watchlist.join(","))}`);
        sseRef.current = es;
        es.onopen = () => setConnected(true);
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data || "{}");
            if (data.symbol) applyQuote(data.symbol, data);
          } catch {}
        };
        es.onerror = () => {
          setConnected(false);
          es.close();
          // 3) Polling fallback
          startPolling();
        };
        return;
      } catch {
        startPolling();
      }
    }

    function startPolling() {
      setConnected(false);
      const doPoll = async () => {
        try {
          const arr = await fetchJSON(`/api/quotes?symbols=${encodeURIComponent(watchlist.join(","))}`);
          if (Array.isArray(arr)) {
            const next = { ...prices };
            for (const q of arr) {
              next[q.symbol] = { ...next[q.symbol], ...q };
              setLastTick(Date.now());
            }
            setPrices(next);
          }
        } catch {}
      };
      doPoll();
      pollRef.current = setInterval(doPoll, 5000);
    }

    function cleanupStreams() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
      if (sseRef.current) { try { sseRef.current.close(); } catch {} sseRef.current = null; }
    }

    function applyQuote(symbol, data) {
      setPrices((prev) => {
        const next = { ...prev, [symbol]: { ...(prev[symbol] || {}), ...data } };
        return next;
      });
      setLastTick(Date.now());
    }
  }, [watchlist]); // eslint-disable-line

  const refreshPositions = async () => {
    try { setPositions(await fetchJSON("/api/positions")); }
    catch { /* noop */ }
  };
  const refreshOrders = async () => {
    try { setOrders(await fetchJSON("/api/orders")); }
    catch { /* noop */ }
  };

  async function placeOrder(draft) {
    // minimal client validation
    if (!draft?.symbol) throw new Error("symbol required");
    if (!draft?.qty || draft.qty <= 0) throw new Error("qty > 0 required");
    try {
      const srv = await postJSON("/api/orders", draft);
      // optimistic merge
      setOrders((o) => [srv, ...o].slice(0, 200));
      // refresh positions/orders (server is source of truth)
      refreshPositions();
      refreshOrders();
      return srv;
    } catch (e) {
      // graceful offline fallback: synthesize a fill @ current price
      const px = prices[draft.symbol]?.price ?? 0;
      const fill = {
        ...draft,
        id: `C-${Date.now()}`,
        status: "FILLED",
        filledQty: draft.qty,
        avgPrice: draft.type === "MARKET" ? px : (draft.limitPrice || px),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setOrders((o) => [fill, ...o].slice(0, 200));
      // naive local position aggregation
      setPositions((pos) => {
        const i = pos.findIndex((p) => p.symbol === draft.symbol);
        const sign = draft.side === "SELL" ? -1 : 1;
        const qty = (i >= 0 ? pos[i].qty : 0) + sign * draft.qty;
        const price = px;
        let avg = i >= 0 ? pos[i].avg : price;
        if (draft.side === "BUY") {
          // new weighted avg if adding
          const prevQty = i >= 0 ? pos[i].qty : 0;
          avg = prevQty + draft.qty > 0
            ? ((prevQty * (i >= 0 ? pos[i].avg : 0)) + draft.qty * price) / (prevQty + draft.qty)
            : price;
        }
        const next = [...pos];
        if (i >= 0) next[i] = { ...next[i], qty: Math.max(0, qty), avg, price };
        else next.push({ symbol: draft.symbol, qty: Math.max(0, qty), avg, price });
        return next.filter((p) => p.qty > 0);
      });
      return fill;
    }
  }

  async function setServerWatchlist(symbols) {
    setWatchlist(symbols);
    try { await postJSON("/api/watchlist", { symbols }); } catch { /* offline ok */ }
  }

  const addSymbol = async (s) => {
    const sym = (s || "").toUpperCase().trim();
    if (!sym) return;
    if (watchlist.includes(sym)) return;
    await setServerWatchlist([sym, ...watchlist]);
    // prime quote once
    try {
      const [q] = await fetchJSON(`/api/quotes?symbols=${encodeURIComponent(sym)}`);
      if (q?.symbol) setPrices((p) => ({ ...p, [sym]: q }));
    } catch {}
  };
  const removeSymbol = async (s) => setServerWatchlist(watchlist.filter((x) => x !== s));

  const value = useMemo(() => ({
    watchlist, prices, positions, orders,
    addSymbol, removeSymbol, placeOrder, refreshPositions, refreshOrders,
    connected, lastTick
  }), [watchlist, prices, positions, orders, connected, lastTick]);

  return <AppStoreCtx.Provider value={value}>{children}</AppStoreCtx.Provider>;
}
