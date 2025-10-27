package com.sts.backend.dev;

import com.sts.backend.domain.Role;
import com.sts.backend.domain.User;
import com.sts.backend.repository.UserRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * DevData — seeds a demo user automatically when the Spring profile = "dev".
 */
@Configuration
@Profile("dev")
public class DevData {

  @Bean
  ApplicationRunner seedDevData(UserRepository users, PasswordEncoder encoder) {
    return args -> {
      if (!users.existsByUsername("bhuvi")) {
        User user = User.builder()
            .username("bhuvi")
            .email("claw@example.com")
            .password(encoder.encode("pass123"))
            .role(Role.USER)
            .build();

        users.save(user);
        System.out.println("[DEV] Seeded bhuvi user → username=bhuvi, password=pass123");
      }
    };
  }
}
