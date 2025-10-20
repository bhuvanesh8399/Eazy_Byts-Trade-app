package com.sts.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sts.backend.domain.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    default Optional<User> findByUsernameOrEmail(String input) {
        return input.contains("@") ? findByEmail(input) : findByUsername(input);
    }
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}
