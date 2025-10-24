package com.sts.backend.dev;

import com.sts.backend.domain.User;                 // ✅ domain entity
import com.sts.backend.repository.UserRepository;   // ✅ kept repo
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

@Component
@Profile("dev")
public class DevData implements CommandLineRunner {

  private final UserRepository users;
  private final PasswordEncoder encoder;

  public DevData(UserRepository users, PasswordEncoder encoder) {
    this.users = users;
    this.encoder = encoder;
  }

  @Override
  public void run(String... args) {
    if (users.count() == 0) {
      User u = new User();
      set(u, "demo", "setUsername", "username");
      set(u, "demo@example.com", "setEmail", "email");
      set(u, encoder.encode("pass123"), "setPassword", "password");
      try { set(u, "ROLE_USER", "setRole", "role"); } catch (Exception ignore) {}
      users.save(u);
      System.out.println("[DEV] Seeded demo user -> username=demo, password=pass123");
    }
  }

  private static void set(Object target, String value, String setter, String field) {
    try {
      Method m = target.getClass().getMethod(setter, String.class);
      m.invoke(target, value);
      return;
    } catch (Exception ignore) {}
    try {
      Field f = target.getClass().getDeclaredField(field);
      f.setAccessible(true);
      f.set(target, value);
    } catch (Exception e) {
      throw new RuntimeException("Cannot set " + field + " on " + target.getClass().getSimpleName(), e);
    }
  }
}
