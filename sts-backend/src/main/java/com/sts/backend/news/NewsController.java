package com.sts.backend.news;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class NewsController {
  private final NewsService svc;
  public NewsController(NewsService svc) { this.svc = svc; }

  @GetMapping("/api/news")
  public List<Map<String,Object>> news(@RequestParam(name = "symbol", required = false) String symbol) {
    return svc.fetch(symbol);
  }
}

