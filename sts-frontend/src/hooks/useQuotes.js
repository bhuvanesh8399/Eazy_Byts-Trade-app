// src/hooks/useQuotes.js
// Live quotes over WS with backoff/heartbeat and fetch fallback
import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../api/client';

function wsBase() {
  const HTTP_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
  const WS_BASE = import.meta.env.VITE_WS_BASE || (
    HTTP_BASE.startsWith('https')
      ? HTTP_BASE.replace(/^https/, 'wss').replace(/\/api$/, '/ws')
      : HTTP_BASE.replace(/^http/, 'ws').replace(/\/api$/, '/ws')
  );
  return WS_BASE.endsWith('/') ? WS_BASE.slice(0, -1) : WS_BASE;
}

function buildWsUrl(symbols = []) {
  const base = wsBase();
  const params = new URLSearchParams();
  if (symbols.length) params.set('symbols', symbols.join(','));
  const t = getAccessToken();
  if (t) params.set('access_token', t);
  return `${base}/quotes?${params.toString()}`;
}

async function fetchInitial(symbols = []) {
  try {
    const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';
    const params = new URLSearchParams();
    if (symbols.length) params.set('symbols', symbols.join(','));
    const r = await fetch(`${API}/quotes/initial?${params.toString()}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    // fallback mock if endpoint is missing
    const out = {};
    symbols.forEach(s => { out[s] = { price: 100, changePct: 0, ts: Date.now() }; });
    return out;
  }
}

export function useQuotes(symbols = [], { heartbeatMs = 15000, retryMax = 5 } = {}) {
  const [quotes, setQuotes] = useState({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  const wsRef = useRef(null);
  const retries = useRef(0);
  const hbTimer = useRef(null);
  const visHandler = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!symbols || symbols.length === 0) {
        setQuotes({});
        setConnected(false);
        return;
      }

      // Fetch initial snapshot so UI has data even if WS is blocked
      try {
        const init = await fetchInitial(symbols);
        if (!cancelled) {
          setQuotes(prev => ({ ...init, ...prev }));
          setLastUpdated(Date.now());
        }
      } catch {}

      connect();
    }

    function scheduleHeartbeat() {
      if (hbTimer.current) clearTimeout(hbTimer.current);
      hbTimer.current = setTimeout(() => {
        try {
          // If no message for heartbeatMs, reconnect
          if (wsRef.current && wsRef.current.readyState === 1) {
            // send ping (optional; server may ignore)
            try { wsRef.current.send('{"type":"PING"}'); } catch {}
          }
        } catch {}
      }, heartbeatMs);
    }

    function connect() {
      if (document.hidden) return; // pause when not visible
      const url = buildWsUrl(symbols);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setError(null);

      ws.onopen = () => {
        retries.current = 0;
        setConnected(true);
        scheduleHeartbeat();
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || '{}');
          if (data && data.type === 'QUOTE' && data.symbol) {
            setQuotes(prev => ({
              ...prev,
              [data.symbol]: {
                price: Number(data.price || 0),
                changePct: Number(data.changePct || 0),
                ts: data.ts || Date.now(),
              },
            }));
            setLastUpdated(Date.now());
            scheduleHeartbeat();
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (cancelled) return;
        if (retries.current >= retryMax) return;
        const backoff = Math.min(12000, 1000 * Math.pow(2, retries.current));
        retries.current += 1;
        setTimeout(connect, backoff);
      };

      ws.onerror = () => { setError('ws-error'); };
    }

    // visibility pause/resume
    visHandler.current = () => {
      if (!document.hidden && (!wsRef.current || wsRef.current.readyState !== 1)) {
        retries.current = 0;
        connect();
      } else if (document.hidden && wsRef.current) {
        try { wsRef.current.close(1000, 'hidden'); } catch {}
      }
    };
    document.addEventListener('visibilitychange', visHandler.current);

    start();

    return () => {
      cancelled = true;
      if (hbTimer.current) clearTimeout(hbTimer.current);
      document.removeEventListener('visibilitychange', visHandler.current);
      try { wsRef.current?.close(1000, 'cleanup'); } catch {}
    };
  }, [JSON.stringify(symbols), heartbeatMs, retryMax]);

  return { quotes, connected, error, lastUpdated };
}

export default useQuotes;

