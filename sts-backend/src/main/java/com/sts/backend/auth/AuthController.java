package com.sts.backend.auth;

import com.sts.backend.auth.dto.AuthResponse;
import com.sts.backend.auth.dto.LoginRequest;
import com.sts.backend.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  /* ------------------- REGISTER ------------------- */
  @PostMapping("/register")
  public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
    return ResponseEntity.ok(auth.register(req));
  }

  /* ------------------- LOGIN ------------------- */
  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
    return ResponseEntity.ok(auth.login(req));
  }

  /**
   * Refresh endpoint — accepts refresh token from:
   *  1) JSON body: {"refreshToken": "..."}
   *  2) Raw string body
   *  3) Query param: ?refresh_token=...
   *  4) Authorization header: Bearer <refreshToken>
   */
  @PostMapping("/refresh")
  public ResponseEntity<?> refresh(
      @RequestHeader(name = "Authorization", required = false) String authHeader,
      @RequestParam(name = "refresh_token", required = false) String refreshParam,
      @RequestBody(required = false) Object body
  ) {
    String token = null;

    // Case 1: JSON body {"refreshToken":"..."}
    if (body instanceof Map<?, ?> map) {
      Object v = map.get("refreshToken");
      if (v instanceof String s && StringUtils.hasText(s)) token = s.trim();
    }
    // Case 2: Raw string body
    else if (body instanceof String s && StringUtils.hasText(s)) {
      token = s.trim();
    }

    // Case 3: Query param
    if (!StringUtils.hasText(token) && StringUtils.hasText(refreshParam)) {
      token = refreshParam.trim();
    }

    // Case 4: Authorization header
    if (!StringUtils.hasText(token) && authHeader != null && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    // Validation
    if (!StringUtils.hasText(token)) {
      return ResponseEntity.badRequest().body(Map.of("error", "MISSING_REFRESH_TOKEN"));
    }

    // Success: issue new tokens
    AuthResponse resp = auth.refresh(token);
    return ResponseEntity.ok(resp);
  }
}
