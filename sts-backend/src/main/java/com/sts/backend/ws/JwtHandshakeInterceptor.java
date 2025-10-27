package com.sts.backend.ws;

import com.sts.backend.security.JwtService;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * JwtHandshakeInterceptor — validates JWTs during WebSocket handshakes.
 *
 * Supports:
 *   • Authorization header ("Bearer <token>")
 *   • Query parameter (?access_token=<token>)
 *
 * On success, stores "username" and "jwt" into the session attributes.
 * Rejects the handshake if the token is missing or invalid.
 */
@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

  private final JwtService jwtService;

  public JwtHandshakeInterceptor(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  public boolean beforeHandshake(ServerHttpRequest request,
                                 ServerHttpResponse response,
                                 WebSocketHandler wsHandler,
                                 Map<String, Object> attributes) {

    String token = null;

    // 1️⃣ Authorization header
    var authHeader = request.getHeaders().getFirst("Authorization");
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring("Bearer ".length()).trim();
    }

    // 2️⃣ Fallback — query param ?access_token=...
    if (token == null) {
      URI uri = request.getURI();
      String query = uri.getQuery();
      if (query != null) {
        for (String p : query.split("&")) {
          int eq = p.indexOf('=');
          if (eq > 0) {
            String key = URLDecoder.decode(p.substring(0, eq), StandardCharsets.UTF_8);
            String val = URLDecoder.decode(p.substring(eq + 1), StandardCharsets.UTF_8);
            if ("access_token".equals(key) && val != null && !val.isBlank()) {
              token = val.trim();
              break;
            }
          }
        }
      }
    }

    // 3️⃣ No token found
    if (token == null || token.isBlank()) {
      System.out.println("[WS] ❌ Handshake rejected — missing token");
      return false;
    }

    // 4️⃣ Validate JWT
    try {
      String username = jwtService.extractUsername(token);
      if (username == null || !jwtService.isTokenValid(token, username)) {
        System.out.println("[WS] ❌ Invalid or expired token for WS handshake");
        return false;
      }

      attributes.put("jwt", token);
      attributes.put("username", username);
      System.out.println("[WS] ✅ Handshake OK — user=" + username);
      return true;

    } catch (Exception e) {
      System.out.println("[WS] ❌ Exception validating token: " + e.getMessage());
      return false;
    }
  }

  @Override
  public void afterHandshake(ServerHttpRequest request,
                             ServerHttpResponse response,
                             WebSocketHandler wsHandler,
                             Exception ex) {
    // no-op
  }
}
