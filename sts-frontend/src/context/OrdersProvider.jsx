import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../components/AuthProvider';

const OrdersCtx = createContext(null);

export function OrdersProvider({ children }) {
  const { isAuthed } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const pollRef = useRef(null);
  const abortRef = useRef(null);

  const upsert = (order) =>
    setOrders((prev) => {
      const i = prev.findIndex((o) => o.id === order.id);
      if (i >= 0) {
        const copy = prev.slice();
        copy[i] = { ...copy[i], ...order };
        return copy;
      }
      return [order, ...prev];
    });

  async function load() {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setLoading(true);
      const data = await api.get('/orders?limit=100', { signal: ctrl.signal });
      setOrders(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e) {
      // Don't set error for abort errors - they're expected during cleanup
      if (e.name !== 'AbortError') {
        console.error('Failed to load orders:', e);
        setErr(e.message || 'Failed to load orders');
      }
    } finally {
      // Only update loading state if the request wasn't aborted
      if (!ctrl.signal.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!isAuthed) return; // Don't load orders if not authenticated
    
    let mounted = true;
    
    const loadOrders = async () => {
      if (!mounted) return;
      await load();
    };
    
    loadOrders();
    
    let stopSSE = null;
    try {
      stopSSE = api.sse(
        '/orders/stream',
        (evt) => {
          if (!mounted) return;
          if (evt?.type === 'UPSERT' && evt.order) upsert(evt.order);
          else if (evt?.type === 'DELETE' && evt.id) {
            setOrders((p) => p.filter((o) => o.id !== evt.id));
          }
        },
        () => { 
          if (mounted) {
            pollRef.current = setInterval(load, 8000); 
          }
        }
      );
    } catch {
      if (mounted) {
        pollRef.current = setInterval(load, 8000);
      }
    }

    return () => {
      mounted = false;
      stopSSE?.();
      if (pollRef.current) clearInterval(pollRef.current);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const placeOrder = async ({ symbol, side, type = 'MARKET', qty, limitPrice }) => {
    const created = await api.post('/orders', {
      symbol,
      side,
      type,
      qty: Number(qty),
      ...(type === 'LIMIT' ? { limitPrice: Number(limitPrice) } : {}),
    });
    if (created?.id) upsert(created);
    return created;
  };

  const cancelOrder = async (id) => {
    await api.del(`/orders/${id}`);
    setOrders((p) => p.filter((o) => o.id !== id));
  };

  const value = useMemo(
    () => ({ orders, loading, err, placeOrder, cancelOrder, reload: load }),
    [orders, loading, err]
  );

  return <OrdersCtx.Provider value={value}>{children}</OrdersCtx.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersCtx);
  if (ctx === null) {
    throw new Error('useOrders() must be used inside <OrdersProvider>. Wrap your app properly.');
  }
  return ctx;
}
