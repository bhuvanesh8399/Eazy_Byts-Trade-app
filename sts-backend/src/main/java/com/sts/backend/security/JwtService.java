package com.sts.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.lang.reflect.Method;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class JwtService {

  private final SecretKey key;
  private final long accessTtlMs;
  private final long refreshTtlMs;
  private final long skewSeconds;

  public JwtService(
      @Value("${security.jwt.secret-key}") String base64Secret,
      @Value("${security.jwt.access-token-expiration:900000}") long accessTtlMs,
      @Value("${security.jwt.refresh-token-expiration:604800000}") long refreshTtlMs,
      @Value("${security.jwt.allowed-skew-seconds:60}") long skewSeconds
  ) {
    this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
    this.accessTtlMs = accessTtlMs;
    this.refreshTtlMs = refreshTtlMs;
    this.skewSeconds = skewSeconds;
  }

  public String generateAccessToken(Object user) {
    String sub = subjectFromUser(user);
    Map<String, Object> claims = new HashMap<>();
    List<String> roles = rolesFromUser(user);
    if (!roles.isEmpty()) claims.put("roles", roles);
    claims.put("typ", "access");
    return buildToken(claims, sub, accessTtlMs);
  }

  public String generateRefreshToken(Object user) {
    String sub = subjectFromUser(user);
    Map<String, Object> claims = Map.of("typ", "refresh");
    return buildToken(claims, sub, refreshTtlMs);
  }

  public boolean isTokenValid(String token, Object user) {
    try {
      Claims c = parse(token);
      String sub = subjectFromUser(user);
      if (sub == null || sub.isBlank()) return false;
      String tokenSub = c.getSubject();
      if (tokenSub == null || tokenSub.isBlank()) tokenSub = Objects.toString(c.get("username"), null);
      return sub.equals(tokenSub);
    } catch (Exception e) {
      return false;
    }
  }

  public boolean validateToken(String token) {
    try { parse(token); return true; } catch (Exception e) { return false; }
  }

  public String extractUsername(String token) {
    Claims c = parse(token);
    if (c.getSubject() != null && !c.getSubject().isBlank()) return c.getSubject();
    Object u = c.get("username");
    return u == null ? null : String.valueOf(u);
  }

  public List<GrantedAuthority> extractAuthorities(String token) {
    Claims c = parse(token);
    List<GrantedAuthority> list = new ArrayList<>();
    Object roles = c.get("roles");
    if (roles instanceof Collection<?> col) {
      for (Object r : col) {
        String name = Objects.toString(r, "");
        if (!name.isBlank()) list.add(new SimpleGrantedAuthority(normalizeRole(name)));
      }
    }
    Object role = c.get("role");
    if (role instanceof String s && !s.isBlank()) list.add(new SimpleGrantedAuthority(normalizeRole(s)));
    if (list.isEmpty()) list.add(new SimpleGrantedAuthority("ROLE_USER"));
    return list;
  }

  /* internals */

  private String buildToken(Map<String, Object> claims, String subject, long ttlMs) {
    Instant now = Instant.now();
    return Jwts.builder()
        .setClaims(claims)
        .setSubject(subject)
        .setIssuedAt(Date.from(now))
        .setExpiration(Date.from(now.plus(Duration.ofMillis(ttlMs))))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }

  private Claims parse(String token) {
    return Jwts.parserBuilder()
        .setSigningKey(key)
        .setAllowedClockSkewSeconds(skewSeconds)
        .build()
        .parseClaimsJws(token)
        .getBody();
  }

  private String subjectFromUser(Object user) {
    if (user == null) return null;
    if (user instanceof UserDetails ud) return ud.getUsername();
    for (String m : new String[]{"getUsername", "getEmail", "getName", "getId"}) {
      try {
        Method method = user.getClass().getMethod(m);
        Object val = method.invoke(user);
        if (val != null && !val.toString().isBlank()) return String.valueOf(val);
      } catch (Exception ignore) {}
    }
    return null;
  }

  private List<String> rolesFromUser(Object user) {
    List<String> out = new ArrayList<>();
    if (user instanceof UserDetails ud) {
      for (GrantedAuthority a : ud.getAuthorities()) out.add(a.getAuthority());
      return normalizeRoles(out);
    }
    try {
      Method m = user.getClass().getMethod("getAuthorities");
      Object v = m.invoke(user);
      if (v instanceof Collection<?> c) for (Object a : c) out.add(Objects.toString(a, ""));
      return normalizeRoles(out);
    } catch (Exception ignore) {}
    try {
      Method m = user.getClass().getMethod("getRoles");
      Object v = m.invoke(user);
      if (v instanceof Collection<?> c) for (Object a : c) out.add(Objects.toString(a, ""));
      return normalizeRoles(out);
    } catch (Exception ignore) {}
    return out;
  }

  private List<String> normalizeRoles(List<String> roles) {
    List<String> out = new ArrayList<>();
    for (String r : roles) {
      if (r == null || r.isBlank()) continue;
      out.add(normalizeRole(r));
    }
    return out;
  }

  private String normalizeRole(String raw) {
    String r = raw.trim();
    return r.startsWith("ROLE_") ? r : "ROLE_" + r;
  }
}
