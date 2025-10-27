package com.sts.backend.quotes;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
public class MoversController {
  private final QuotesService svc;
  public MoversController(QuotesService svc) { this.svc = svc; }

  // GET /api/movers?tf=1D|1W
  @GetMapping("/api/movers")
  public Map<String,Object> movers(@RequestParam(name="tf", defaultValue = "1D") String tf,
                                   @RequestParam(name="symbols", required = false) String symbols) {
    List<String> list = new ArrayList<>();
    if (symbols != null && !symbols.isBlank()) {
      for (String s : symbols.split(",")) {
        String t = s.trim().toUpperCase();
        if (!t.isEmpty()) list.add(t);
      }
    }
    if (list.isEmpty()) list = List.of("AAPL","TSLA","GOOGL","MSFT","NVDA","AMZN");
    Map<String, Map<String,Object>> q = svc.initial(list);
    List<Map<String,Object>> arr = new ArrayList<>();
    for (String s : list) {
      Map<String,Object> m = q.get(s);
      if (m != null) arr.add(Map.of(
          "symbol", s,
          "changePct", m.get("changePct"),
          "price", m.get("price")
      ));
    }
    arr.sort(Comparator.comparingDouble(a -> ((Number)a.get("changePct")).doubleValue()));
    List<Map<String,Object>> losers = new ArrayList<>(arr.subList(0, Math.min(5, arr.size())));
    Collections.reverse(arr);
    List<Map<String,Object>> gainers = new ArrayList<>(arr.subList(0, Math.min(5, arr.size())));
    return Map.of("tf", tf, "gainers", gainers, "losers", losers);
  }
}

