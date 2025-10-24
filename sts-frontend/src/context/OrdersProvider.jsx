// src/context/OrdersProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';

const OrdersCtx = createContext(null);

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const pollRef = useRef(null);

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

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/orders');
      setOrders(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e) {
      setErr(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Try SSE with ?access_token=… (backend filter will convert to Authorization header)
    let stopSSE = null;
    try {
      stopSSE = api.sse('/api/orders/stream', (evt) => {
        if (evt?.type === 'UPSERT' && evt.order) upsert(evt.order);
        else if (evt?.type === 'DELETE' && evt.id) {
          setOrders((p) => p.filter((o) => o.id !== evt.id));
        }
      }, () => {
        // fallback — poll
        pollRef.current = setInterval(load, 8000);
      });
    } catch {
      pollRef.current = setInterval(load, 8000);
    }

    return () => {
      stopSSE?.();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const placeOrder = async ({ symbol, side, type = 'MARKET', qty, limitPrice }) => {
    const created = await api.post('/api/orders', {
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
    await api.del(`/api/orders/${id}`);
    setOrders((p) => p.filter((o) => o.id !== id));
  };

  const value = useMemo(
    () => ({ orders, loading, err, placeOrder, cancelOrder, reload: load }),
    [orders, loading, err]
  );

  return <OrdersCtx.Provider value={value}>{children}</OrdersCtx.Provider>;
}

export const useOrders = () => useContext(OrdersCtx);
