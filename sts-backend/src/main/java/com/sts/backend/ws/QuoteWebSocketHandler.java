package com.sts.backend.ws;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

/**
 * QuoteWebSocketHandler
 * Dev-friendly quote streamer with two providers:
 *  - mock (random walk)
 *  - alpha (Alpha Vantage GLOBAL_QUOTE polling with simple caching)
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
  private final boolean deterministic = Boolean.parseBoolean(System.getenv().getOrDefault("QUOTES_DETERMINISTIC", "false"));
  private final Random rng = deterministic ? new Random(123456789L) : new Random();

  private final String provider;
  private final String alphaKey;
  private final long alphaPollMs;
  private final RestTemplate http = new RestTemplate();
  private final Map<String, Long> lastFetchAt = new ConcurrentHashMap<>();

  private static final List<String> DEFAULT = List.of("AAPL","GOOGL","TSLA","MSFT","NVDA","AMZN");

  public QuoteWebSocketHandler(
      @Value("${quotes.provider:mock}") String provider,
      @Value("${quotes.alpha.api-key:}") String alphaKey,
      @Value("${quotes.alpha.poll-interval-ms:15000}") long alphaPollMs
  ) {
    this.provider = provider;
    this.alphaKey = alphaKey;
    this.alphaPollMs = alphaPollMs;
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
  protected void handleTextMessage(WebSocketSession session, TextMessage message) {
    String p = message.getPayload() == null ? "" : message.getPayload().trim();
    if (p.isEmpty()) return;
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
        snapshot(session, syms);
      }
    }
  }

  private void tick() {
    if (subs.isEmpty()) return;
    long now = System.currentTimeMillis();
    for (Map.Entry<WebSocketSession, Set<String>> e : subs.entrySet()) {
      WebSocketSession s = e.getKey();
      if (!s.isOpen()) continue;
      for (String sym : e.getValue()) {
        try {
          double price = "alpha".equalsIgnoreCase(provider) ? fetchAlpha(sym, now) : evolve(sym);
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
    double lastPx = last.computeIfAbsent(sym, this::basePrice);
    double drift = (rng.nextDouble() - 0.5) * 0.024;
    double next = Math.max(1.0, lastPx * (1.0 + drift));
    last.put(sym, next);
    return next;
  }

  private double basePrice(String sym) {
    if (!deterministic) return 80.0 + rng.nextDouble() * 140.0;
    int h = Math.abs(sym.hashCode());
    return 50.0 + (h % 200);
  }

  private void snapshot(WebSocketSession s, Collection<String> symbols) {
    long now = System.currentTimeMillis();
    for (String sym : symbols) {
      try {
        double price = last.computeIfAbsent(sym, k -> "alpha".equalsIgnoreCase(provider) ? baseAlpha(sym) : basePrice(sym));
        double base = ref.computeIfAbsent(sym, k -> price);
        double changePct = (price - base) / base * 100.0;
        String json = "{\"type\":\"QUOTE\",\"symbol\":\"" + sym + "\",\"price\":" +
            String.format(java.util.Locale.US, "%.2f", price) + ",\"changePct\":" +
            String.format(java.util.Locale.US, "%.2f", changePct) + ",\"ts\":" + now + "}";
        s.sendMessage(new TextMessage(json));
      } catch (IOException ignored) {}
    }
  }

  private double baseAlpha(String sym) {
    try {
      return fetchAlpha(sym, System.currentTimeMillis());
    } catch (Exception ignored) {
      return 100.0;
    }
  }

  private double fetchAlpha(String sym, long now) {
    try {
      Long lastAt = lastFetchAt.get(sym);
      if (lastAt != null && (now - lastAt) < alphaPollMs) {
        return last.getOrDefault(sym, basePrice(sym));
      }
      if (alphaKey == null || alphaKey.isBlank()) return last.getOrDefault(sym, basePrice(sym));
      String url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=" + sym + "&apikey=" + alphaKey;
      ResponseEntity<Map> r = http.getForEntity(url, Map.class);
      Object q = r.getBody() == null ? null : r.getBody().get("Global Quote");
      if (q instanceof Map<?,?> m) {
        String ps = Objects.toString(m.get("05. price"), null);
        if (ps != null) {
          double px = Double.parseDouble(ps);
          last.put(sym, px);
          lastFetchAt.put(sym, now);
          return px;
        }
      }
    } catch (Exception ignored) {}
    return evolve(sym);
  }
}

