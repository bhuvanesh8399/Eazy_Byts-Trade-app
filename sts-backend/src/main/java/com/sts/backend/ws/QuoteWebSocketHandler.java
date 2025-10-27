package com.sts.backend.ws;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

/**
 * QuoteWebSocketHandler
 *
 * Simple dev streamer that periodically emits fake QUOTE events for any
 * symbols the client subscribes to.
 *
 * Protocol (JSON):
 *   Client → Server: {"type":"SUB","symbols":["AAPL","TSLA"]}
 *   Server → Client: {"type":"QUOTE","symbol":"AAPL","price":123.45,"changePct":0.34,"ts":1712345678901}
 */
@Component
public class QuoteWebSocketHandler extends TextWebSocketHandler {

  private final ScheduledExecutorService exec = Executors.newSingleThreadScheduledExecutor(r -> {
    Thread t = new Thread(r, "quotes-tick");
    t.setDaemon(true);
    return t;
  });

  private final Map<WebSocketSession, Set<String>> subs = new ConcurrentHashMap<>();
  private final Map<String, Double> last = new ConcurrentHashMap<>();
  private final Map<String, Double> ref = new ConcurrentHashMap<>();
  private final SecureRandom rnd = new SecureRandom();

  private static final List<String> DEFAULT = List.of("AAPL","GOOGL","TSLA","MSFT","NVDA","AMZN");

  public QuoteWebSocketHandler() {
    exec.scheduleAtFixedRate(this::tick, 1000, 1000, TimeUnit.MILLISECONDS);
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    System.out.println("[WS] ✅ Connection established: " + session.getId());
    subs.put(session, new CopyOnWriteArraySet<>(DEFAULT));
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    subs.remove(session);
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    String p = message.getPayload() == null ? "" : message.getPayload().trim();
    if (p.isEmpty()) return;
    // Very small JSON parser for {"type":"SUB","symbols":[...]} without bringing a JSON lib
    if (p.contains("\"type\"") && p.toLowerCase().contains("sub") && p.contains("symbols")) {
      int start = p.indexOf('[');
      int end = p.indexOf(']');
      if (start >= 0 && end > start) {
        String arr = p.substring(start + 1, end);
        Set<String> syms = Arrays.stream(arr.split(","))
            .map(s -> s.replaceAll("[\\\"\\s]", "").toUpperCase())
            .filter(s -> !s.isBlank())
            .collect(Collectors.toCollection(CopyOnWriteArraySet::new));
        if (syms.isEmpty()) syms.addAll(DEFAULT);
        subs.put(session, syms);
        System.out.println("[WS] SUB " + session.getId() + " → " + syms);
      }
      return;
    }
    // Other messages ignored for now.
  }

  private void tick() {
    if (subs.isEmpty()) return;
    long now = System.currentTimeMillis();
    for (Map.Entry<WebSocketSession, Set<String>> e : subs.entrySet()) {
      WebSocketSession s = e.getKey();
      if (!s.isOpen()) continue;
      for (String sym : e.getValue()) {
        try {
          double price = evolve(sym);
          double base = ref.computeIfAbsent(sym, k -> price);
          double changePct = (price - base) / base * 100.0;
          String json = "{\"type\":\"QUOTE\",\"symbol\":\"" + sym + "\",\"price\":" +
              String.format(java.util.Locale.US, "%.2f", price) + ",\"changePct\":" +
              String.format(java.util.Locale.US, "%.2f", changePct) + ",\"ts\":" + now + "}";
          s.sendMessage(new TextMessage(json));
        } catch (IOException ignored) {}
      }
    }
  }

  private double evolve(String sym) {
    double lastPx = last.computeIfAbsent(sym, k -> 80.0 + rnd.nextDouble() * 140.0);
    // random walk within ±1.2%
    double drift = (rnd.nextDouble() - 0.5) * 0.024;
    double next = Math.max(1.0, lastPx * (1.0 + drift));
    last.put(sym, next);
    return next;
  }
}
