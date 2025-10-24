package com.sts.backend.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ErrorResponseException.class)
  ResponseEntity<Map<String,Object>> handleKnown(ErrorResponseException ex, HttpServletRequest req) {
    HttpStatus status = (HttpStatus) ex.getStatusCode();
    return ResponseEntity.status(status).body(Map.of(
        "timestamp", Instant.now().toString(),
        "status", status.value(),
        "error", status.getReasonPhrase(),
        "message", ex.getMessage(),
        "path", req.getRequestURI()
    ));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String,Object>> handleUnknown(Exception ex, HttpServletRequest req) {
    ex.printStackTrace();
    HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
    return ResponseEntity.status(status).body(Map.of(
        "timestamp", Instant.now().toString(),
        "status", status.value(),
        "error", status.getReasonPhrase(),
        "message", ex.getClass().getSimpleName() + ": " + (ex.getMessage() == null ? "(no message)" : ex.getMessage()),
        "path", req.getRequestURI()
    ));
  }
}
