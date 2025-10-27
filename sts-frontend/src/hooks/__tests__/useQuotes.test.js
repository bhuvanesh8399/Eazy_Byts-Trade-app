// src/hooks/__tests__/useQuotes.test.js
import { renderHook, act } from '@testing-library/react';
import { useQuotes } from '../../hooks/useQuotes';

class MockWS {
  constructor() { MockWS.instances.push(this); this.readyState = 1; }
  static instances = [];
  static reset() { MockWS.instances = []; }
  send() {}
  close() { this.readyState = 3; }
}

describe('useQuotes', () => {
  beforeEach(() => {
    MockWS.reset();
    global.WebSocket = MockWS;
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ AAPL: { price: 100, changePct: 0, ts: Date.now() } }) });
  });

  it('connects and sets initial quotes', async () => {
    const { result } = renderHook(() => useQuotes(['AAPL']));
    // initial fetch resolves
    await act(async () => {});
    expect(result.current.quotes.AAPL.price).toBe(100);
  });

  it('updates on QUOTE messages', async () => {
    const { result } = renderHook(() => useQuotes(['AAPL']));
    await act(async () => {});
    const ws = MockWS.instances[0];
    act(() => {
      ws.onmessage({ data: JSON.stringify({ type: 'QUOTE', symbol: 'AAPL', price: 101.23, changePct: 1.2, ts: Date.now() }) });
    });
    expect(result.current.quotes.AAPL.price).toBe(101.23);
  });
});

