package com.sts.backend.auth;

import com.sts.backend.auth.dto.AuthResponse;
import com.sts.backend.auth.dto.LoginRequest;
import com.sts.backend.auth.dto.RegisterRequest;
import com.sts.backend.security.JwtService;
import com.sts.backend.domain.User;
import com.sts.backend.domain.Role;
import com.sts.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(UserRepository users,
                     PasswordEncoder passwordEncoder,
                     JwtService jwtService) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  /* ------------------- REGISTER ------------------- */
  public AuthResponse register(RegisterRequest req) {
    if (req == null) throw new IllegalArgumentException("request cannot be null");

    String username = req.username();
    String email = req.email();
    String password = req.password();

    if (isBlank(username)) throw new IllegalArgumentException("username is required");
    if (isBlank(email)) throw new IllegalArgumentException("email is required");
    if (isBlank(password)) throw new IllegalArgumentException("password is required");

    if (users.existsByUsername(username))
      throw new IllegalArgumentException("username already exists");
    if (users.existsByEmail(email))
      throw new IllegalArgumentException("email already exists");

    User user = new User();
    user.setUsername(username);
    user.setEmail(email);
    user.setPassword(passwordEncoder.encode(password));
    user.setRole(Role.USER); // default role

    users.save(user);

    String accessToken = jwtService.generateAccessToken(user);
    String refreshToken = jwtService.generateRefreshToken(user);
    return new AuthResponse(accessToken, refreshToken);
  }

  /* ------------------- LOGIN ------------------- */
  public AuthResponse login(LoginRequest req) {
    if (req == null) throw new IllegalArgumentException("request cannot be null");

    String id = req.identifier(); // Use the flexible identifier method
    String password = req.password();

    if (isBlank(id) || isBlank(password))
      throw new IllegalArgumentException("credentials required");

    User user = users.findByUsername(id)
        .or(() -> users.findByEmail(id))
        .orElseThrow(() -> new IllegalArgumentException("user not found"));

    if (!passwordEncoder.matches(password, user.getPassword()))
      throw new IllegalArgumentException("invalid credentials");

    String accessToken = jwtService.generateAccessToken(user);
    String refreshToken = jwtService.generateRefreshToken(user);
    return new AuthResponse(accessToken, refreshToken);
  }

  /* ------------------- REFRESH ------------------- */
  public AuthResponse refresh(String refreshToken) {
    if (isBlank(refreshToken))
      throw new IllegalArgumentException("refresh token required");

    String username = jwtService.extractUsername(refreshToken);
    if (isBlank(username))
      throw new IllegalArgumentException("invalid token");

    User user = users.findByUsername(username)
        .or(() -> users.findByEmail(username))
        .orElseThrow(() -> new IllegalArgumentException("user not found"));

    if (!jwtService.isTokenValid(refreshToken, user))
      throw new IllegalArgumentException("invalid refresh token");

    String newAccess = jwtService.generateAccessToken(user);
    String newRefresh = jwtService.generateRefreshToken(user);
    return new AuthResponse(newAccess, newRefresh);
  }

  /* ------------------- UTIL ------------------- */
  private static boolean isBlank(String s) {
    return s == null || s.isBlank();
  }
}
