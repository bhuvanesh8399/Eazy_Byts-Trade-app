import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getAccessToken } from '../api/client';
import { useAuth } from '../components/AuthProvider';

const TradeCtx = createContext(null);

export function TradeProvider({ children }) {
  const { isAuthed } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [stats, setStats] = useState(null);
  const [quotes, setQuotes] = useState({}); // symbol -> latest quote object
  const [err, setErr] = useState(null);
  const [watchlist, setWatchlist] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const abortHoldings = useRef(null);
  const abortStats = useRef(null);

  async function loadHoldings() {
    if (abortHoldings.current) abortHoldings.current.abort();
    const ctrl = new AbortController();
    abortHoldings.current = ctrl;
    try {
      const data = await api.get('/portfolio/holdings', { signal: ctrl.signal });
      console.log('[TradeProvider] Raw holdings data:', data);
      const holdingsArray = Array.isArray(data) ? data : [];
      console.log('[TradeProvider] Processed holdings:', holdingsArray);
      console.log('[TradeProvider] Symbols from holdings:', holdingsArray.map(h => h.symbol));
      setHoldings(holdingsArray);
    } catch (e) {
      // Don't set error for abort errors - they're expected during cleanup
      if (e.name !== 'AbortError') {
        console.error('[TradeProvider] Holdings load error:', e);
        setErr(e.message || 'Failed to load holdings');
      }
    }
  }

  async function loadStats() {
    if (abortStats.current) abortStats.current.abort();
    const ctrl = new AbortController();
    abortStats.current = ctrl;
    try {
      const data = await api.get('/portfolio/stats', { signal: ctrl.signal });
      setStats(data);
    } catch (e) {
      // Don't set error for abort errors - they're expected during cleanup
      if (e.name !== 'AbortError') {
        setErr(e.message || 'Failed to load portfolio stats');
      }
    }
  }

  useEffect(() => {
    if (isAuthed) {
      loadHoldings();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  // Initialize watchlist from holdings once data arrives (first time)
  useEffect(() => {
    if (!watchlist.length && Array.isArray(holdings) && holdings.length) {
      const syms = Array.from(new Set(holdings.map(h => h.symbol).filter(Boolean)));
      setWatchlist(syms);
    }
  }, [holdings, watchlist.length]);

  useEffect(() => {
    if (!isAuthed) return; // Don't connect if not authenticated

    function connect() {
      const token = getAccessToken();
      if (!token) return; // Don't connect without token
      
      const url = api.buildWsUrl('/ws/quotes'); // adds ?access_token=...
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        // optionally SUB after open:
        // ws.send(JSON.stringify({ type: 'SUB', symbols: ['AAPL','TSLA','MSFT'] }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'QUOTE' && data.symbol) {
            setQuotes((prev) => ({ ...prev, [data.symbol]: data }));
          }
        } catch {
          // ignore pings/non-JSON
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => { reconnectTimer.current = setTimeout(connect, 3000); };
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      try { wsRef.current?.close(1000, 'cleanup'); } catch {}
    };
  }, [isAuthed]);

  // --- Watchlist ops (local state, can be persisted later) ---
  const addSymbol = (raw) => {
    const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
    if (!s) return;
    setWatchlist((prev) => (prev.includes(s) ? prev : [s, ...prev]).slice(0, 50));
  };
  const removeSymbol = (s) => setWatchlist((prev) => prev.filter((x) => x !== s));

  // --- Place order via REST, then refresh dependent state ---
  const placeOrder = async ({ symbol, side, type = 'MARKET', qty, limitPrice }) => {
    const payload = {
      symbol,
      side,
      type,
      qty: Number(qty),
      ...(String(type).toUpperCase() === 'LIMIT' ? { limitPrice: Number(limitPrice) } : {}),
    };
    const created = await api.post('/orders', payload);
    try { window.dispatchEvent(new CustomEvent('orders:changed', { detail: created })); } catch {}
    // Refresh portfolio snapshots
    await Promise.allSettled([loadHoldings(), loadStats()]);
    return created;
  };

  const value = useMemo(
    () => ({
      holdings,
      stats,
      quotes,
      err,
      // Watchlist + ops
      watchlist,
      addSymbol,
      removeSymbol,
      // Trading
      placeOrder,
      reloadHoldings: loadHoldings,
      reloadStats: loadStats,
    }),
    [holdings, stats, quotes, err, watchlist]
  );

  // Debug logging
  useEffect(() => {
    const watchlistDerived = holdings?.map(h => h.symbol) || [];
    console.log('[TradeProvider] Current state:', { 
      holdings, 
      stats, 
      quotes, 
      err,
      watchlistDerived,
      holdingsCount: holdings?.length || 0
    });
  }, [holdings, stats, quotes, err]);

  return <TradeCtx.Provider value={value}>{children}</TradeCtx.Provider>;
}

export function useTrade() {
  const ctx = useContext(TradeCtx);
  if (ctx === null) {
    throw new Error('useTrade() must be used inside <TradeProvider>. Wrap your app properly.');
  }
  return ctx;
}
