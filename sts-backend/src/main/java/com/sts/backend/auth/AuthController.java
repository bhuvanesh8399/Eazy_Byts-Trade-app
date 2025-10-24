package com.sts.backend.auth;

import com.sts.backend.auth.dto.AuthResponse;
import com.sts.backend.auth.dto.LoginRequest;
import com.sts.backend.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

    /**
     * Accept refresh token from:
     *  1) JSON body: {"refreshToken":"..."}  OR raw body string
     *  2) Query param: ?refresh_token=...
     *  3) Authorization header: Bearer <refreshToken>
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestParam(name = "refresh_token", required = false) String refreshParam,
            @RequestBody(required = false) Object body // Map or String supported
    ) {
        String token = null;

        // Body as JSON: { "refreshToken": "..." }
        if (body instanceof Map<?,?> map) {
            Object v = map.get("refreshToken");
            if (v instanceof String s && StringUtils.hasText(s)) token = s.trim();
        }
        // Body as raw string
        else if (body instanceof String s && StringUtils.hasText(s)) {
            token = s.trim();
        }

        if (!StringUtils.hasText(token) && StringUtils.hasText(refreshParam)) {
            token = refreshParam.trim();
        }
        if (!StringUtils.hasText(token) && authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        }

        if (!StringUtils.hasText(token)) {
            // Return a 400 with a small JSON error; keeps AuthResponse to 2 fields elsewhere
            return ResponseEntity.badRequest().body(Map.of("error", "MISSING_REFRESH_TOKEN"));
        }

        // Success: return your 2-field AuthResponse from the service
        AuthResponse resp = authService.refresh(token);
        return ResponseEntity.ok(resp);
    }
}
