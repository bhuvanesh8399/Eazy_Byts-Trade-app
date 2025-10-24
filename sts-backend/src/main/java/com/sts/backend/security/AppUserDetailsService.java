package com.sts.backend.security;

import com.sts.backend.domain.User;                  // ✅ your existing entity
import com.sts.backend.repository.UserRepository;    // ✅ your existing repo
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

@Service
public class AppUserDetailsService implements UserDetailsService {

  private final UserRepository users;

  public AppUserDetailsService(UserRepository users) {
    this.users = users;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    User u = users.findByUsername(username)
        .or(() -> users.findByEmail(username))
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));

    String uname = read(u, "getUsername", "username", "getEmail", "email");
    String pwd   = read(u, "getPassword", "password");
    if (uname == null) uname = username;
    if (pwd == null)   pwd = "";

    var authorities = resolveAuthorities(u);

    return org.springframework.security.core.userdetails.User
        .withUsername(uname)
        .password(pwd)
        .authorities(authorities)
        .accountExpired(false).accountLocked(false)
        .credentialsExpired(false).disabled(false)
        .build();
  }

  private List<SimpleGrantedAuthority> resolveAuthorities(User u) {
    List<SimpleGrantedAuthority> list = new ArrayList<>();
    String role = read(u, "getRole", "role");
    if (role != null && !role.isBlank()) {
      list.add(new SimpleGrantedAuthority(role.startsWith("ROLE_") ? role : "ROLE_" + role));
    } else {
      list.add(new SimpleGrantedAuthority("ROLE_USER"));
    }
    return list;
  }

  private static String read(Object target, String... names) {
    for (String n : names) {
      try { // getter
        Method m = target.getClass().getMethod(n);
        Object v = m.invoke(target);
        if (v != null) return String.valueOf(v);
      } catch (Exception ignore) {}
      try { // field
        Field f = target.getClass().getDeclaredField(n);
        f.setAccessible(true);
        Object v = f.get(target);
        if (v != null) return String.valueOf(v);
      } catch (Exception ignore) {}
    }
    return null;
  }
}
