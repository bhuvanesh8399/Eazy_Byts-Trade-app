package com.sts.backend.security;

import com.sts.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service("appUserDetailsService")
public class AppUserDetailsService implements UserDetailsService {
    private final UserRepository repo;

    public AppUserDetailsService(UserRepository repo) {
        this.repo = repo;
    }

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        return repo.findByUsername(usernameOrEmail)
                .or(() -> repo.findByEmail(usernameOrEmail.toLowerCase()))
                .map(u -> (UserDetails) u)   // your User implements UserDetails
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
