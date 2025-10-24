package com.sts.backend.ws;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class QuoteWebSocketHandler extends TextWebSocketHandler {

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    Object jwt = session.getAttributes().get("jwt");
    if (jwt == null || jwt.toString().isBlank()) {
      // Safe across framework versions:
      session.close(CloseStatus.POLICY_VIOLATION);
      return;
    }
    // TODO: validate with your JwtService; if invalid -> session.close(CloseStatus.POLICY_VIOLATION);
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    // Temporary echo so you can test quickly
    session.sendMessage(message);
  }
}
