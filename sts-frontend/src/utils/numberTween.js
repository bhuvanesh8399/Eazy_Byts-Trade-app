// src/utils/numberTween.js
import { useEffect, useRef, useState } from 'react';

export function animateNumber(from, to, ms, onFrame) {
  const start = performance.now();
  let raf = 0;
  function frame(t) {
    const p = Math.min(1, (t - start) / Math.max(1, ms));
    const v = from + (to - from) * p;
    onFrame(v, p);
    if (p < 1) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export function useTweenedNumber(value, duration = 260) {
  const [v, setV] = useState(Number(value || 0));
  const prev = useRef(Number(value || 0));
  useEffect(() => {
    const from = Number(prev.current || 0);
    const to = Number(value || 0);
    prev.current = to;
    if (from === to) { setV(to); return; }
    const cancel = animateNumber(from, to, duration, (nv) => setV(nv));
    return cancel;
  }, [value, duration]);
  return v;
}

export default useTweenedNumber;

