package com.sts.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

/**
 * QueryParamBearerTokenFilter
 *
 * Allows clients to pass an `access_token` via query parameter instead of the
 * Authorization header. This is useful for WebSocket or browser-based clients
 * that cannot set custom headers easily.
 *
 * If a query parameter `?access_token=...` exists and the `Authorization` header
 * is missing, this filter automatically injects a synthetic header:
 *
 *     Authorization: Bearer <token>
 *
 * Compatible with Spring Security 6+ / Boot 3.3.
 */
public class QueryParamBearerTokenFilter extends OncePerRequestFilter {

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {

    String authHeader = request.getHeader("Authorization");
    String token = request.getParameter("access_token");

    if (!StringUtils.hasText(authHeader) && StringUtils.hasText(token)) {
      final String bearer = "Bearer " + token;

      HttpServletRequestWrapper wrapped = new HttpServletRequestWrapper(request) {
        @Override
        public String getHeader(String name) {
          if ("Authorization".equalsIgnoreCase(name)) return bearer;
          return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
          if ("Authorization".equalsIgnoreCase(name))
            return Collections.enumeration(List.of(bearer));
          return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
          List<String> names = Collections.list(super.getHeaderNames());
          boolean hasAuth = names.stream().anyMatch(h -> h.equalsIgnoreCase("Authorization"));
          if (!hasAuth) names.add("Authorization");
          return Collections.enumeration(names);
        }
      };

      chain.doFilter(wrapped, response);
      return;
    }

    // Proceed as-is when Authorization header already present
    chain.doFilter(request, response);
  }
}
