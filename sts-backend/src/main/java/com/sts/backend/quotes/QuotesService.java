package com.sts.backend.quotes;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class QuotesService {
  private final String provider;
  private final String alphaKey;
  private final RestTemplate http = new RestTemplate();

  public QuotesService(
      @Value("${quotes.provider:mock}") String provider,
      @Value("${quotes.alpha.api-key:}") String alphaKey
  ) {
    this.provider = provider;
    this.alphaKey = alphaKey;
  }

  public Map<String, Map<String,Object>> initial(List<String> symbols) {
    Map<String, Map<String,Object>> out = new LinkedHashMap<>();
    long now = System.currentTimeMillis();
    for (String s : symbols) {
      double price = "alpha".equalsIgnoreCase(provider) ? alphaPrice(s) : mockPrice(s);
      out.put(s, Map.of(
          "price", round2(price),
          "changePct", round2((price - base(s)) / base(s) * 100.0),
          "ts", now
      ));
    }
    return out;
  }

  private double alphaPrice(String sym) {
    try {
      if (alphaKey == null || alphaKey.isBlank()) return mockPrice(sym);
      String url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=" + sym + "&apikey=" + alphaKey;
      ResponseEntity<Map> r = http.getForEntity(url, Map.class);
      Object q = r.getBody() == null ? null : r.getBody().get("Global Quote");
      if (q instanceof Map<?,?> m) {
        String ps = Objects.toString(m.get("05. price"), null);
        if (ps != null) return Double.parseDouble(ps);
      }
    } catch (Exception ignored) {}
    return mockPrice(sym);
  }

  private double mockPrice(String sym) {
    int h = Math.abs(sym.hashCode());
    return 50.0 + (h % 200);
  }

  private double base(String sym) { return 50.0 + (Math.abs(sym.hashCode()) % 200); }
  private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}

