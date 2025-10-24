package com.sts.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

/**
 * If a request comes with ?access_token=... and WITHOUT an Authorization header,
 * this filter injects Authorization: Bearer <token> so your JWT filter can authenticate it.
 * Useful for SSE (EventSource) and other GETs where you pass tokens as query params.
 */
public class QueryParamBearerTokenFilter extends OncePerRequestFilter {

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {

    String auth = request.getHeader("Authorization");
    String token = request.getParameter("access_token");

    if ((auth == null || auth.isBlank()) && token != null && !token.isBlank()) {
      final String bearer = "Bearer " + token;

      HttpServletRequestWrapper wrapped = new HttpServletRequestWrapper(request) {
        @Override
        public String getHeader(String name) {
          if ("Authorization".equalsIgnoreCase(name)) return bearer;
          return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
          if ("Authorization".equalsIgnoreCase(name)) {
            return Collections.enumeration(List.of(bearer));
          }
          return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
          List<String> names = Collections.list(super.getHeaderNames());
          if (!names.stream().anyMatch(h -> h.equalsIgnoreCase("Authorization"))) {
            names.add("Authorization");
          }
          return Collections.enumeration(names);
        }
      };

      chain.doFilter(wrapped, response);
      return;
    }

    chain.doFilter(request, response);
  }
}
