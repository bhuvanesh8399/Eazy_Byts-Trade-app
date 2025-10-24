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

public class QueryParamBearerTokenFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String auth = req.getHeader("Authorization");
    String token = req.getParameter("access_token");
    if ((auth == null || auth.isBlank()) && token != null && !token.isBlank()) {
      final String bearer = "Bearer " + token;
      HttpServletRequestWrapper wrapped = new HttpServletRequestWrapper(req) {
        @Override public String getHeader(String name) {
          if ("Authorization".equalsIgnoreCase(name)) return bearer;
          return super.getHeader(name);
        }
        @Override public Enumeration<String> getHeaders(String name) {
          if ("Authorization".equalsIgnoreCase(name)) return Collections.enumeration(List.of(bearer));
          return super.getHeaders(name);
        }
        @Override public Enumeration<String> getHeaderNames() {
          List<String> names = Collections.list(super.getHeaderNames());
          if (names.stream().noneMatch(h -> h.equalsIgnoreCase("Authorization"))) names.add("Authorization");
          return Collections.enumeration(names);
        }
      };
      chain.doFilter(wrapped, res);
      return;
    }
    chain.doFilter(req, res);
  }
}
