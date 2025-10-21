package com.sts.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank String username,
        @NotBlank @Email String email,
        @NotBlank
        @Size(min = 8, message = "Password must be at least 8 characters")
        // at least 1 upper, 1 lower, 1 digit, 1 special, no spaces
        @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s])[\\S]{8,}$",
            message = "Password must contain upper, lower, digit, special and no spaces"
        )
        String password
) {}
