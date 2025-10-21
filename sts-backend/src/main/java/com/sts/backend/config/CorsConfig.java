package com.sts.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();

        // The frontend origin(s) you allow
        cfg.setAllowedOrigins(List.of(
                "http://localhost:5174"   // Vite default port
                // add more origins here if needed
        ));

        // Methods your API supports
        cfg.setAllowedMethods(List.of(
                HttpMethod.GET.name(),
                HttpMethod.POST.name(),
                HttpMethod.PUT.name(),
                HttpMethod.PATCH.name(),
                HttpMethod.DELETE.name(),
                HttpMethod.OPTIONS.name()
        ));

        // Headers the client may send (Authorization triggers a preflight)
        cfg.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "X-Requested-With",
                "Origin"
        ));

        // If you ever send cookies from the browser (not needed for Bearer tokens)
        cfg.setAllowCredentials(false);

        // Headers that the browser is allowed to read from the response
        cfg.setExposedHeaders(List.of(
                "Authorization",
                "Content-Type"
        ));

        // Preflight cache duration
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // apply CORS to all endpoints
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
