package com.sts.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Flexible login request:
 * - You can send ONE of: usernameOrEmail, email, or username
 * - Plus a required password
 *
 * Usage in AuthService:
 *   String id = req.identifier();
 *   if (id == null || id.isBlank()) -> throw 400/401
 */
public record LoginRequest(
        String usernameOrEmail,
        String email,
        String username,
        @NotBlank String password
) {
    /** Resolve a single identifier in priority order. */
    public String identifier() {
        if (usernameOrEmail != null && !usernameOrEmail.isBlank()) return usernameOrEmail;
        if (email != null && !email.isBlank()) return email;
        if (username != null && !username.isBlank()) return username;
        return null;
    }
}
