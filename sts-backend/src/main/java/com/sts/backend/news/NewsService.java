package com.sts.backend.news;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NewsService {
  private final RestTemplate http = new RestTemplate();
  private final String apiKey;

  public NewsService(@Value("${news.api.key:}") String apiKey) {
    this.apiKey = apiKey;
  }

  private static class CacheItem { long ts; List<Map<String,Object>> items; }
  private final Map<String, CacheItem> cache = new ConcurrentHashMap<>();

  public List<Map<String,Object>> fetch(String symbol) {
    String key = symbol == null || symbol.isBlank() ? "MARKET" : symbol.toUpperCase();
    CacheItem c = cache.get(key);
    long now = System.currentTimeMillis();
    if (c != null && (now - c.ts) < 60_000) return c.items;

    List<Map<String,Object>> out = new ArrayList<>();
    if (apiKey != null && !apiKey.isBlank()) {
      try {
        String q = key.equals("MARKET") ? "markets" : key;
        String url = "https://newsapi.org/v2/everything?q=" + q + "&language=en&pageSize=8&sortBy=publishedAt&apiKey=" + apiKey;
        ResponseEntity<Map> r = http.getForEntity(url, Map.class);
        Object arts = r.getBody() == null ? null : r.getBody().get("articles");
        if (arts instanceof List<?> list) {
          for (Object o : list) {
            if (o instanceof Map<?,?> mm) {
              String title = java.util.Objects.toString(mm.get("title"), "Headline");
              Object srcObj = mm.get("source");
              String src = "News";
              if (srcObj instanceof Map<?,?> sm) {
                src = java.util.Objects.toString(sm.get("name"), "News");
              }
              String link = java.util.Objects.toString(mm.get("url"), "#");
              out.add(Map.of(
                  "t", title,
                  "s", src,
                  "u", link,
                  "d", Instant.now().toString()
              ));
            }
          }
        }
      } catch (Exception ignored) {}
    }

    if (out.isEmpty()) {
      out = List.of(
          Map.of("t", key + " in focus amid rotation", "s", "MockWire", "u", "#", "d", Instant.now().toString()),
          Map.of("t", "Analyst take on " + key + " valuation", "s", "StreetMock", "u", "#", "d", Instant.now().toString())
      );
    }
    CacheItem ni = new CacheItem(); ni.ts = now; ni.items = out; cache.put(key, ni);
    return out;
  }
}
