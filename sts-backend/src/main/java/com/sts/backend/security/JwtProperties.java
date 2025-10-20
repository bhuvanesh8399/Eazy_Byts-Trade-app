package com.sts.backend.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {
    private String issuer;
    private String secret; // Base64-encoded
    private String accessTokenTtl; // e.g. "15m"

    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
    public String getAccessTokenTtl() { return accessTokenTtl; }
    public void setAccessTokenTtl(String accessTokenTtl) { this.accessTokenTtl = accessTokenTtl; }
}
