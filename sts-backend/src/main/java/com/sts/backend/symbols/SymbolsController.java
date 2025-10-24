package com.sts.backend.symbols;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@Profile("dev") // active only in dev profile
public class SymbolsController {

  @GetMapping("/symbols")
  public List<SymbolDto> list() {
    return List.of(
        new SymbolDto("AAPL","Apple Inc."),
        new SymbolDto("GOOG","Alphabet Class C"),
        new SymbolDto("TSLA","Tesla Inc."),
        new SymbolDto("MSFT","Microsoft Corp."),
        new SymbolDto("AMZN","Amazon.com Inc.")
    );
  }

  public record SymbolDto(String symbol, String name) {}
}
