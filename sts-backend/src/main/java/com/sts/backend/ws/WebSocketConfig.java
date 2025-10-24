package com.sts.backend.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

  private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
  private final QuoteWebSocketHandler quoteHandler; // your text/binary handler

  public WebSocketConfig(JwtHandshakeInterceptor interceptor, QuoteWebSocketHandler handler) {
    this.jwtHandshakeInterceptor = interceptor;
    this.quoteHandler = handler;
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry
      .addHandler(quoteHandler, "/ws/quotes")
      .addInterceptors(jwtHandshakeInterceptor)
      .setAllowedOriginPatterns("http://localhost:5173", "http://localhost:5174");
  }
}
