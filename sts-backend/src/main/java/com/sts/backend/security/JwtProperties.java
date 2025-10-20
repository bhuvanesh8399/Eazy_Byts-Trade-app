package com.sts.backend.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {
    private String issuer;
    private String secret;             // base64-encoded 256-bit key
    private String accessTokenTtl;     // e.g., "15m"
    private String refreshTokenTtl;    // e.g., "7d"

    // getters/setters
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
    public String getAccessTokenTtl() { return accessTokenTtl; }
    public void setAccessTokenTtl(String accessTokenTtl) { this.accessTokenTtl = accessTokenTtl; }
    public String getRefreshTokenTtl() { return refreshTokenTtl; }
    public void setRefreshTokenTtl(String refreshTokenTtl) { this.refreshTokenTtl = refreshTokenTtl; }
}
