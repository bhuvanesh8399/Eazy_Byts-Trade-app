package com.sts.backend.auth;

import com.sts.backend.auth.dto.*;
import com.sts.backend.domain.User;
import com.sts.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService service;
    private final UserRepository users;

    public AuthController(AuthService service, UserRepository users) {
        this.service = service;
        this.users = users;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(service.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(service.login(req));
    }

    // Simple "me" endpoint outside /auth to demonstrate protection
    @GetMapping("/me") // keep under /auth for now; SecurityConfig can permit/protect as you like
    public ResponseEntity<?> me(Authentication auth) {
        // auth.getName() is userId (we set subject = id)
        Long userId = Long.valueOf(auth.getName());
        User u = users.findById(userId).orElseThrow();
        return ResponseEntity.ok(Map.of("id", u.getId(), "username", u.getUsername(), "email", u.getEmail(), "role", u.getRole()));
    }
}
