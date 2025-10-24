package com.sts.backend.ws;

import com.sts.backend.security.JwtService; // adjust if your JwtService lives elsewhere
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

  private final JwtService jwtService;

  public JwtHandshakeInterceptor(JwtService jwtService) {
    this.jwtService = jwtService;
  }

  @Override
  public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                 WebSocketHandler wsHandler, Map<String, Object> attributes) {

    String token = null;

    // 1) Authorization header if present
    var auth = request.getHeaders().getFirst("Authorization");
    if (auth != null && auth.startsWith("Bearer ")) {
      token = auth.substring("Bearer ".length());
    }

    // 2) Fallback: query param ?access_token=...
    if (token == null) {
      URI uri = request.getURI();
      String q = uri.getQuery();
      if (q != null) {
        for (String p : q.split("&")) {
          int i = p.indexOf('=');
          if (i > 0) {
            String k = URLDecoder.decode(p.substring(0, i), StandardCharsets.UTF_8);
            String v = URLDecoder.decode(p.substring(i + 1), StandardCharsets.UTF_8);
            if ("access_token".equals(k) && v != null && !v.isBlank()) {
              token = v;
              break;
            }
          }
        }
      }
    }

    if (token == null) {
      System.out.println("[WS] Handshake: token MISSING");
      return false; // strict: reject WS without token (dev: change to 'return true' to allow)
    }

    try {
      // validate; adjust to your JwtService API if names differ
      boolean ok = jwtService.validateToken(token);
      if (!ok) {
        System.out.println("[WS] Handshake: token INVALID");
        return false;
      }
      attributes.put("jwt", token);
      System.out.println("[WS] Handshake: token OK (len=" + token.length() + ")");
      return true;
    } catch (Exception e) {
      System.out.println("[WS] Handshake: exception validating token -> " + e.getMessage());
      return false;
    }
  }

  @Override
  public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                             WebSocketHandler wsHandler, Exception exception) { }
}
