package com.sts.backend.security;

import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    private final JwtProperties props;
    private final Key key;

    public JwtService(JwtProperties props) {
        this.props = props;
        byte[] keyBytes = Decoders.BASE64.decode(props.getSecret());
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generate(String subject, Map<String, Object> claims) {
        Instant now = Instant.now();
        Instant exp = now.plus(parseDuration(props.getAccessTokenTtl()));
        return Jwts.builder()
                .setIssuer(props.getIssuer())
                .setSubject(subject)
                .addClaims(claims)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parserBuilder()
                .requireIssuer(props.getIssuer())
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token);
    }

    private static Duration parseDuration(String text) {
        // Simple "15m", "1h" parser
        if (text.endsWith("m")) return Duration.ofMinutes(Long.parseLong(text.replace("m","")));
        if (text.endsWith("h")) return Duration.ofHours(Long.parseLong(text.replace("h","")));
        if (text.endsWith("d")) return Duration.ofDays(Long.parseLong(text.replace("d","")));
        return Duration.parse(text); // ISO-8601 fallback (e.g., PT15M)
    }
}
