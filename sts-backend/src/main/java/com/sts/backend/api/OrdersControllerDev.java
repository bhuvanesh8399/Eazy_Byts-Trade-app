package com.sts.backend.api;

import com.sts.backend.api.dto.OrderDTO;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Profile("dev")
@RestController
@RequestMapping("/api")
public class OrdersControllerDev {

  @GetMapping("/orders")
  public List<OrderDTO> orders(@RequestParam(defaultValue = "50") int limit, Authentication auth) {
    ensureAuthed(auth);
    List<OrderDTO> sample = List.of(
        new OrderDTO(1,"AAPL","BUY","MARKET",3,null,"FILLED",Instant.now().minusSeconds(3600)),
        new OrderDTO(2,"TSLA","SELL","LIMIT",2,230.00,"OPEN",Instant.now().minusSeconds(1800)),
        new OrderDTO(3,"GOOG","BUY","MARKET",1,null,"FILLED",Instant.now().minusSeconds(900))
    );
    return sample.subList(0, Math.min(limit, sample.size()));
  }

  private void ensureAuthed(Authentication auth) {
    if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(String.valueOf(auth.getPrincipal()))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
    }
  }
}
