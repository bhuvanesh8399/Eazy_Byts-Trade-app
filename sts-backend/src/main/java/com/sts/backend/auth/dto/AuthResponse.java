package com.sts.backend.auth.dto;

public record AuthResponse(String accessToken, String tokenType) {
    public static AuthResponse bearer(String token) { return new AuthResponse(token, "Bearer"); }
}
