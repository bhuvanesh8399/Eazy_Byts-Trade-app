package com.sts.backend.user;

import com.sts.backend.repository.UserRepository;          // ✅ correct import
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

/**
 * UserDetailsServiceImpl — bridges your UserRepository with Spring Security.
 *
 * It allows Spring’s AuthenticationManager to load UserDetails
 * (username, password, roles) from your database.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

  private final UserRepository users;

  public UserDetailsServiceImpl(UserRepository users) {
    this.users = users;
  }

  @Override
  public UserDetails loadUserByUsername(String username) {
    return users.findByUsername(username)
        .or(() -> users.findByEmail(username))
        .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
  }
}
