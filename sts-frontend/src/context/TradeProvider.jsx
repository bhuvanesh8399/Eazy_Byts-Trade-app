import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { api } from "../lib/api";
 // helper from earlier (coreFetch + api.* wrappers)

const TradeCtx = createContext(null);
export const useTrade = () => useContext(TradeCtx);

/**
 * TradeProvider
 * - loads holdings, stats, orders once authenticated
 * - exposes reload + placeOrder
 * - opens a WebSocket to /ws/quotes?access_token=<token> (proxied by Vite)
 */
export default function TradeProvider({ children }) {
  const { token, isAuthed, logout } = useAuth();

  const [holdings, setHoldings] = useState([]);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // optional: live quotes buffer (you can shape how you like)
  const [quotes, setQuotes] = useState({}); // { SYM: { price, ts, ... } }
  const wsRef = useRef(null);

  // --- data loader ---
  const reload = async () => {
    if (!isAuthed || !token) return;
    setLoading(true);
    try {
      const [h, s, o] = await Promise.all([
        api.holdings(token),
        api.stats(token),
        api.orders(token, 100),
      ]);
      setHoldings(h);
      setStats(s);
      setOrders(o);
    } catch (err) {
      // If 401, force logout (token expired)
      if (err?.status === 401) logout();
      // eslint-disable-next-line no-console
      console.error('Trade reload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthed || !token) {
      setHoldings([]);
      setStats(null);
      setOrders([]);
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, token]);

  // --- place order (connect your UI buttons to this) ---
  const placeOrder = async ({ symbol, side, type, qty, limitPrice }) => {
    if (!isAuthed || !token) throw new Error('Not authenticated');
    const payload = { symbol, side, type, qty, limitPrice };
    const res = await api.placeOrder(token, payload);
    // naive: refresh orders afterwards; you can also optimistic-update
    reload();
    return res;
  };

  // --- WebSocket: quotes stream ---
  useEffect(() => {
    // close any old socket
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    if (!isAuthed || !token) return;

    // Relative URL → Vite proxies ws://localhost:5173/ws -> ws://localhost:8080/ws
    const url = `/ws/quotes?access_token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // eslint-disable-next-line no-console
      console.log('WS connected');
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        // expect shape like { symbol:"AAPL", price: 190.12, ts: 1712345678901 }
        if (data?.symbol) {
          setQuotes((prev) => ({ ...prev, [data.symbol]: data }));
        }
      } catch {
        // if backend currently echoes plain text, ignore parse failures
        // eslint-disable-next-line no-console
        console.warn('WS non-JSON message:', evt.data);
      }
    };

    ws.onerror = (e) => {
      // eslint-disable-next-line no-console
      console.error('WS error', e);
    };

    ws.onclose = () => {
      // eslint-disable-next-line no-console
      console.log('WS closed');
    };

    return () => {
      try { ws.close(); } catch {}
    };
  }, [isAuthed, token]);

  const value = useMemo(
    () => ({
      holdings,
      stats,
      orders,
      quotes,
      loading,
      reload,
      placeOrder,
    }),
    [holdings, stats, orders, quotes, loading]
  );

  return <TradeCtx.Provider value={value}>{children}</TradeCtx.Provider>;
}
