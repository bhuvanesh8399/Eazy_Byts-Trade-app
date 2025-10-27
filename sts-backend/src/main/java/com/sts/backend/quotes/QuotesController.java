package com.sts.backend.quotes;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
public class QuotesController {
  private final QuotesService svc;
  public QuotesController(QuotesService svc) { this.svc = svc; }

  // GET /api/quotes/initial?symbols=AAPL,TSLA
  @GetMapping("/api/quotes/initial")
  public Map<String, Map<String,Object>> initial(@RequestParam(name = "symbols", required = false) String symbols) {
    List<String> list = new ArrayList<>();
    if (symbols != null && !symbols.isBlank()) {
      for (String s : symbols.split(",")) {
        String t = s.trim().toUpperCase();
        if (!t.isEmpty()) list.add(t);
      }
    }
    if (list.isEmpty()) list = List.of("AAPL","TSLA","GOOGL");
    return svc.initial(list);
  }
}

