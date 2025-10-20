package com.sts.backend.auth;

import com.sts.backend.auth.dto.AuthResponse;
import com.sts.backend.auth.dto.LoginRequest;
import com.sts.backend.auth.dto.RegisterRequest;
import com.sts.backend.domain.User;
import com.sts.backend.repository.UserRepository;
import com.sts.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwt) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
    }

    public AuthResponse register(RegisterRequest req) {
        if (users.existsByEmail(req.email())) throw new IllegalArgumentException("Email already in use");
        if (users.existsByUsername(req.username())) throw new IllegalArgumentException("Username already in use");
        User u = new User();
        u.setEmail(req.email());
        u.setUsername(req.username());
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        users.save(u);
        String token = jwt.generate(u.getId().toString(), Map.of("role", u.getRole(), "username", u.getUsername()));
        return AuthResponse.bearer(token);
    }

    public AuthResponse login(LoginRequest req) {
        User u = users.findByUsernameOrEmail(req.usernameOrEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!passwordEncoder.matches(req.password(), u.getPasswordHash()))
            throw new IllegalArgumentException("Invalid credentials");
        String token = jwt.generate(u.getId().toString(), Map.of("role", u.getRole(), "username", u.getUsername()));
        return AuthResponse.bearer(token);
    }
}
