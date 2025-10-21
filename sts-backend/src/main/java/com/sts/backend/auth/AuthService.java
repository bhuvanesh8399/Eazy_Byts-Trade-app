package com.sts.backend.auth;

import com.sts.backend.auth.dto.AuthResponse;
import com.sts.backend.auth.dto.LoginRequest;
import com.sts.backend.auth.dto.RegisterRequest;
import com.sts.backend.domain.User;
import com.sts.backend.repository.UserRepository;
import com.sts.backend.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;


...
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Enforce gmail
        if (request.email() == null || !request.email().toLowerCase().endsWith("@gmail.com")) {
            throw new IllegalArgumentException("Only @gmail.com emails are allowed.");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already taken.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered.");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        // NOTE: No setRole(...) – your User has no Role enum in this project snapshot

        userRepository.save(user);

        String access = jwtService.generateAccessToken(user);
        String refresh = jwtService.generateRefreshToken(user);
        return new AuthResponse(access, refresh);
    }

    public AuthResponse login(LoginRequest request) {
        String principal = request.usernameOrEmail();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(principal, request.password())
        );

        // try username first, then email
        Optional<User> userOpt = userRepository.findByUsername(principal);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(principal);
        }
        User user = userOpt.orElseThrow(() -> new IllegalArgumentException("User not found."));

        String access = jwtService.generateAccessToken(user);
        String refresh = jwtService.generateRefreshToken(user);
        return new AuthResponse(access, refresh);
    }

    public AuthResponse refresh(String refreshToken) {
        // read subject (username or email) from token
        String subject = jwtService.extractUsername(refreshToken);

        Optional<User> userOpt = userRepository.findByUsername(subject);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(subject);
        }
        User user = userOpt.orElseThrow(() -> new IllegalArgumentException("User not found."));

        // validate token against the user
        if (!jwtService.isTokenValid(refreshToken, user)) {
            throw new IllegalArgumentException("Invalid refresh token.");
        }

        // issue new pair
        String newAccess = jwtService.generateAccessToken(user);
        String newRefresh = jwtService.generateRefreshToken(user);
        return new AuthResponse(newAccess, newRefresh);
    }
}
