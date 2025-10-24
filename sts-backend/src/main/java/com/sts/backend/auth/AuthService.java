package com.sts.backend.auth;

import com.sts.backend.auth.dto.AuthResponse;
import com.sts.backend.auth.dto.LoginRequest;
import com.sts.backend.auth.dto.RegisterRequest;
import com.sts.backend.security.JwtService;
import com.sts.backend.domain.User;                  // ✅ your existing entity
import com.sts.backend.repository.UserRepository;   // ✅ your existing repo
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Optional;

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
  public AuthResponse register(RegisterRequest request) {
    final String uname = read(request, "getUsername", "username");
    final String email = read(request, "getEmail", "email");
    final String raw   = read(request, "getPassword", "password");

    if (isBlank(uname)) throw new IllegalArgumentException("username is required");
    if (isBlank(email)) throw new IllegalArgumentException("email is required");
    if (isBlank(raw))   throw new IllegalArgumentException("password is required");

    if (users.existsByUsername(uname)) throw new IllegalArgumentException("Username already exists");
    if (users.existsByEmail(email))    throw new IllegalArgumentException("Email already exists");

    User user = new User(); // assumes default ctor exists
    write(user, uname,   new String[]{"setUsername"}, new String[]{"username"});
    write(user, email,   new String[]{"setEmail"},    new String[]{"email"});
    write(user, passwordEncoder.encode(raw),
          new String[]{"setPassword"}, new String[]{"password"});

    // role is optional; JwtService defaults ROLE_USER when absent
    try { write(user, "ROLE_USER", new String[]{"setRole"}, new String[]{"role"}); } catch (Exception ignore) {}

    users.save(user);

    String access  = jwtService.generateAccessToken(user);
    String refresh = jwtService.generateRefreshToken(user);
    return new AuthResponse(access, refresh);
  }

  /* ------------------- LOGIN ------------------- */
  public AuthResponse login(LoginRequest request) {
    final String id   = read(request, "getUsername", "username", "getEmail", "email"); // allow either
    final String pass = read(request, "getPassword", "password");

    if (isBlank(id) || isBlank(pass)) throw new IllegalArgumentException("credentials required");

    Optional<User> byUsername = users.findByUsername(id);
    User user = byUsername.or(() -> users.findByEmail(id))
        .orElseThrow(() -> new IllegalArgumentException("User not found"));

    String hashed = read(user, "getPassword", "password");
    if (isBlank(hashed) || !passwordEncoder.matches(pass, hashed)) {
      throw new IllegalArgumentException("Invalid credentials");
    }

    String access  = jwtService.generateAccessToken(user);
    String refresh = jwtService.generateRefreshToken(user);
    return new AuthResponse(access, refresh);
  }

  /* ------------------- REFRESH ------------------- */
  public AuthResponse refresh(String refreshToken) {
    String username = jwtService.extractUsername(refreshToken);
    if (isBlank(username)) throw new IllegalArgumentException("Invalid token");

    User user = users.findByUsername(username)
        .or(() -> users.findByEmail(username))
        .orElseThrow(() -> new IllegalArgumentException("User not found"));

    if (!jwtService.isTokenValid(refreshToken, user)) {
      throw new IllegalArgumentException("Invalid refresh token");
    }

    String newAccess  = jwtService.generateAccessToken(user);
    String newRefresh = jwtService.generateRefreshToken(user);
    return new AuthResponse(newAccess, newRefresh);
  }

  /* ------------------- tiny reflection helpers ------------------- */
  private static String read(Object target, String... candidates) {
    for (String name : candidates) {
      try {
        Method m = target.getClass().getMethod(name);
        Object v = m.invoke(target);
        if (v != null) return String.valueOf(v);
      } catch (Exception ignore) {}
      try {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        Object v = f.get(target);
        if (v != null) return String.valueOf(v);
      } catch (Exception ignore) {}
    }
    return null;
  }

  private static void write(Object target, String value, String[] setterNames, String[] fieldNames) {
    // try setters
    for (String s : setterNames) {
      try {
        Method m = target.getClass().getMethod(s, String.class);
        m.invoke(target, value);
        return;
      } catch (Exception ignore) {}
    }
    // try fields
    for (String fName : fieldNames) {
      try {
        Field f = target.getClass().getDeclaredField(fName);
        f.setAccessible(true);
        f.set(target, value);
        return;
      } catch (Exception ignore) {}
    }
    // if neither worked, surface a clear error:
    throw new IllegalStateException("Cannot set value on " + target.getClass().getSimpleName());
  }

  private static boolean isBlank(String s) { return s == null || s.isBlank(); }
}
