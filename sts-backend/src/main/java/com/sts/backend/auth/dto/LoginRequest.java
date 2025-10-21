package com.sts.backend.auth.dto;
public record LoginRequest(String usernameOrEmail, String password) {}
