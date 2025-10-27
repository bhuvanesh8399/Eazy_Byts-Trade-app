package com.sts.backend.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class MeController {

  @GetMapping("/api/me")
  public ResponseEntity<?> me(Authentication auth) {
    // Require proper authentication
    if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(String.valueOf(auth.getPrincipal()))) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
          "error", "Unauthorized",
          "message", "Authentication required"
      ));
    }
    return ResponseEntity.ok(Map.of(
        "username", auth.getName(),
        "roles", auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList()
    ));
  }
}
