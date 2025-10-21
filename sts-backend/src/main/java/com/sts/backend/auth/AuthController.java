package com.sts.backend.auth;

import com.sts.backend.auth.dto.AuthResponse;
import com.sts.backend.auth.dto.LoginRequest;
import com.sts.backend.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestHeader(name = "Authorization", required = false) String authHeader,
                                                @RequestBody(required = false) String tokenBody) {
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) token = authHeader.substring(7);
        if (token == null && tokenBody != null && !tokenBody.isBlank()) token = tokenBody.trim();
        return ResponseEntity.ok(authService.refresh(token));
    }
}
