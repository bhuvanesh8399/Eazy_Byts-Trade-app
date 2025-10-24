package com.sts.backend.api.dto;

import java.time.Instant;
public record OrderDTO(
    long id,
    String symbol,
    String side,      // BUY | SELL
    String type,      // MARKET | LIMIT
    int qty,
    Double limitPrice,
    String status,    // FILLED | OPEN | REJECTED
    Instant createdAt
) {}
