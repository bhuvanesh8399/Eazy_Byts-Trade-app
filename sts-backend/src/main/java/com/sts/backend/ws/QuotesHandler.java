package com.sts.backend.ws;

import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.Instant;
import java.util.concurrent.ThreadLocalRandom;

public class QuotesHandler extends TextWebSocketHandler {
  @Override
  public void afterConnectionEstablished(WebSocketSession session) {}

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) {}

  // You can push fake quotes from somewhere else; kept minimal for compile.
  public static String fakeQuote(String symbol) {
    double p = 100 + ThreadLocalRandom.current().nextDouble() * 50;
    return "{\"type\":\"QUOTE\",\"symbol\":\""+symbol+"\",\"price\":"+String.format("%.2f",p)+",\"ts\":\""+ Instant.now() +"\"}";
  }
}
