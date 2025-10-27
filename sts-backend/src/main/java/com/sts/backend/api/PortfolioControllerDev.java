package com.sts.backend.api;

import com.sts.backend.api.dto.HoldingDTO;
import com.sts.backend.api.dto.PortfolioStatsDTO;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Profile("dev")
@RestController
@RequestMapping("/api/portfolio")
public class PortfolioControllerDev {

  @GetMapping("/holdings")
  public List<HoldingDTO> holdings(Authentication auth) {
    // ensureAuthed(auth); // Disabled for development
    return List.of(
        new HoldingDTO("AAPL", 10, 190.25),
        new HoldingDTO("GOOG", 2, 128.40),
        new HoldingDTO("TSLA", 5, 225.10)
    );
  }

  @GetMapping("/stats")
  public PortfolioStatsDTO stats(Authentication auth) {
    // ensureAuthed(auth); // Disabled for development
    double total = 10*190.25 + 2*128.40 + 5*225.10;
    return new PortfolioStatsDTO(total, +215.30, +1245.80);
  }

  private void ensureAuthed(Authentication auth) {
    if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(String.valueOf(auth.getPrincipal()))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
    }
  }
}
