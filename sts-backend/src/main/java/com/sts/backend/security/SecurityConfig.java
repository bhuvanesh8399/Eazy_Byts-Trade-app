package com.sts.backend.security;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final AuthenticationProvider authProvider;
  private final JwtAuthFilter jwtAuthFilter; // your existing JWT filter

  public SecurityConfig(AuthenticationProvider authProvider, JwtAuthFilter jwtAuthFilter) {
    this.authProvider = authProvider;
    this.jwtAuthFilter = jwtAuthFilter;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      @Qualifier("corsConfigurationSource") CorsConfigurationSource corsSource
  ) throws Exception {

    http
      .cors(c -> c.configurationSource(corsSource))
      .csrf(AbstractHttpConfigurer::disable)
      .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(auth -> auth
          .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
          .requestMatchers("/api/auth/**", "/actuator/**", "/h2-console/**").permitAll()
          .requestMatchers("/api/symbols").permitAll() // ← make symbols public in dev
          .anyRequest().authenticated()
      )
      .headers(h -> h.frameOptions(f -> f.sameOrigin()))
      // Promote ?access_token=… to Authorization BEFORE JWT filter
      .addFilterBefore(new QueryParamBearerTokenFilter(), UsernamePasswordAuthenticationFilter.class)
      .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
      .authenticationProvider(authProvider)
      // ⛔ disable HTTP Basic so the browser never shows the login popup
      .httpBasic(AbstractHttpConfigurer::disable);

    return http.build();
  }

  @Bean
  @Qualifier("corsConfigurationSource")
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOriginPatterns(List.of("http://localhost:5173", "http://localhost:5174"));
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Cache-Control"));
    cfg.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/**", cfg);
    return src;
  }
}
