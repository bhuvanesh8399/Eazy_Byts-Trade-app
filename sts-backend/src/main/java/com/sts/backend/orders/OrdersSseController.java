package com.sts.backend.orders;

import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/orders")
@Profile("dev")
public class OrdersSseController {

  private final AtomicLong seq = new AtomicLong(1);
  private final List<OrderDto> store = new CopyOnWriteArrayList<>();
  private final Map<Long, OrderDto> byId = new ConcurrentHashMap<>();

  // Initialize with demo orders
  public OrdersSseController() {
    initializeDemoOrders();
  }

  private void initializeDemoOrders() {
    Instant now = Instant.now();
    // Add a few demo orders
    OrderDto o1 = new OrderDto(seq.get(), "AAPL", "BUY", "LIMIT", 10, 
        new BigDecimal("173.50"), "FILLED", now.minusSeconds(3600));
    store.add(o1);
    byId.put(o1.id(), o1);

    OrderDto o2 = new OrderDto(seq.get(), "GOOGL", "SELL", "LIMIT", 5, 
        new BigDecimal("128.40"), "FILLED", now.minusSeconds(7200));
    store.add(o2);
    byId.put(o2.id(), o2);

    OrderDto o3 = new OrderDto(seq.get(), "TSLA", "BUY", "MARKET", 2, 
        new BigDecimal("251.67"), "PENDING", now.minusSeconds(1800));
    store.add(o3);
    byId.put(o3.id(), o3);
  }

  // GET /api/orders?limit=100
  @GetMapping
  public List<OrderDto> list(@RequestParam(name = "limit", required = false) Integer limit) {
    List<OrderDto> all = new ArrayList<>(store);
    all.sort(Comparator.comparing(OrderDto::createdAt).reversed());
    if (limit != null && limit > 0 && limit < all.size()) return all.subList(0, limit);
    return all;
  }

  // POST /api/orders  (what your UI calls)
  @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public OrderDto create(@RequestBody CreateOrderReq req) {
    OrderDto o = new OrderDto(
        seq.getAndIncrement(),
        req.symbol(), req.side(), req.type(),
        req.qty(), req.limitPrice(),
        "ACCEPTED",
        Instant.now()
    );
    store.add(0, o);
    byId.put(o.id(), o);
    return o;
  }

  // DELETE /api/orders/{id}
  @DeleteMapping("/{id}")
  public void cancel(@PathVariable long id) {
    store.removeIf(o -> o.id() == id);
    byId.remove(id);
  }

  // Optional: SSE stream used by your frontend as a fallback
  @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter stream() {
    SseEmitter emitter = new SseEmitter(0L);
    // simple heartbeat to keep the stream open
    new Thread(() -> {
      try {
        while (true) {
          emitter.send(SseEmitter.event().name("ping").data("ok"));
          Thread.sleep(10_000);
        }
      } catch (Exception ignored) {
        emitter.complete();
      }
    }, "orders-sse-heartbeat").start();
    return emitter;
  }

  /* DTOs */
  public record CreateOrderReq(String symbol, String side, String type, int qty, BigDecimal limitPrice) {}
  public record OrderDto(long id, String symbol, String side, String type, int qty,
                         BigDecimal limitPrice, String status, Instant createdAt) {}
}
