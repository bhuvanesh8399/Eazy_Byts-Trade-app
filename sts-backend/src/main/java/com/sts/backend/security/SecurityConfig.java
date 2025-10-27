package com.sts.backend.security;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import com.sts.backend.repository.UserRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * SecurityConfig — central security configuration
 *
 * Features:
 *  • JWT-based stateless authentication
 *  • CORS configuration for dev/prod
 *  • QueryParamBearerTokenFilter (for WebSocket / browser auth)
 *  • Disables form login, CSRF, HTTP Basic
 *  • H2 console + actuator + /api/auth public endpoints
 */

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final AuthenticationProvider authProvider;
  private final JwtService jwt;
  private final UserRepository userRepository;

  public SecurityConfig(AuthenticationProvider authProvider, JwtService jwt, UserRepository userRepository) {
    this.authProvider = authProvider;
    this.jwt = jwt;
    this.userRepository = userRepository;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      @Qualifier("corsConfigurationSource") CorsConfigurationSource corsSource
  ) throws Exception {

    // Construct JWT filter dynamically
    JwtAuthFilter jwtAuthFilter = new JwtAuthFilter(jwt, userRepository);

    http
      // --- CORS / CSRF / Sessions ---
      .cors(c -> c.configurationSource(corsSource))
      .csrf(AbstractHttpConfigurer::disable)
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

      // --- Headers ---
      .headers(h -> h.frameOptions(f -> f.sameOrigin()))

      // --- Authorization Rules ---
      .authorizeHttpRequests(auth -> auth
          .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
          .requestMatchers("/api/auth/**").permitAll() // Allow authentication endpoints
          .requestMatchers("/api/health/**").permitAll() // Allow health check
          // Allow /api/me to pass through controller which returns 401 if unauthenticated
          .requestMatchers("/api/me").permitAll()
          .requestMatchers("/api/portfolio/**").authenticated() // Require authentication for portfolio
          .requestMatchers("/api/orders/**").authenticated() // Require authentication for orders
          .requestMatchers("/api/watchlist/**").authenticated() // Require authentication for watchlist
          .requestMatchers("/api/quotes/**").authenticated() // Require authentication for quotes
          .requestMatchers("/api/stream/**").authenticated() // Require authentication for streams
          .requestMatchers("/actuator/**", "/h2-console/**").permitAll()
          .requestMatchers("/ws/**").authenticated() // Require authentication for WebSocket
          .anyRequest().authenticated()
      )

      // --- Authentication setup ---
      .httpBasic(AbstractHttpConfigurer::disable)
      .formLogin(AbstractHttpConfigurer::disable)
      .logout(Customizer.withDefaults())

      // --- Filters (QueryParam then JWT) ---
      .addFilterBefore(new QueryParamBearerTokenFilter(), UsernamePasswordAuthenticationFilter.class)
      .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
      .authenticationProvider(authProvider);

    return http.build();
  }

  @Bean
  @Qualifier("corsConfigurationSource")
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOriginPatterns(List.of(
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://eazy-byts-trade-app.vercel.app"
    ));
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Cache-Control"));
    cfg.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/**", cfg);
    return src;
  }
}
