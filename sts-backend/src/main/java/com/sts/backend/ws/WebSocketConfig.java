package com.sts.backend.ws;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * WebSocketConfig — registers and secures your WS endpoints.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

  private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
  private final QuoteWebSocketHandler quoteWebSocketHandler;

  public WebSocketConfig(JwtHandshakeInterceptor jwtHandshakeInterceptor,
                         QuoteWebSocketHandler quoteWebSocketHandler) {
    this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
    this.quoteWebSocketHandler = quoteWebSocketHandler;
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry
        .addHandler(quoteWebSocketHandler, "/ws/quotes")
        .addInterceptors(jwtHandshakeInterceptor)
        .setAllowedOriginPatterns(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "https://eazy-byts-trade-app.vercel.app"
        );
  }
}
