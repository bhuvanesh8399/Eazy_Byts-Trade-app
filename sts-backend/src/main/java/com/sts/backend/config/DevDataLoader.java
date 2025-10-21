package com.sts.backend.config;

import com.sts.backend.domain.Role;
import com.sts.backend.domain.User;
import com.sts.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

@Profile("dev")
@Configuration
public class DevDataLoader {
    @Bean
    CommandLineRunner seed(UserRepository repo, PasswordEncoder encoder) {
        return args -> {
            if (repo.findByUsername("demo").isEmpty()) {
                var u = new User();
                u.setUsername("demo");
                u.setEmail("demo@gmail.com");
                u.setPassword(encoder.encode("Abcdef1!"));
                u.setRole(Role.USER); // <-- IMPORTANT
                repo.save(u);
            }
        };
    }
}
