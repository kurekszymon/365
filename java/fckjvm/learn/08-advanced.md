# Phase 8 — Advanced (when you need it)

These are tools for specific problems. Don't reach for them until the simpler approach breaks.

## Reactive stack — WebFlux + R2DBC

Non-blocking, event-driven. Single thread handles thousands of connections (like Node.js). Use when: proxy services, streaming APIs, very high concurrency with I/O-bound work.

```kotlin
// replaces spring-boot-starter-webmvc
implementation("org.springframework.boot:spring-boot-starter-webflux")
implementation("org.springframework.boot:spring-boot-starter-data-r2dbc")
implementation("org.postgresql:r2dbc-postgresql")
```

```java
// reactive controller — returns Mono (0 or 1) or Flux (0 to N)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/{id}")
    public Mono<User> getUser(@PathVariable UUID id) {
        return userRepository.findById(id);  // non-blocking
    }

    @GetMapping
    public Flux<User> listUsers() {
        return userRepository.findAll();  // streams results
    }
}

// reactive repository
public interface UserRepository extends ReactiveCrudRepository<User, UUID> {
    Mono<User> findByEmail(String email);
}
```

**Don't use WebFlux unless you need it.** The programming model is harder to debug, stack traces are useless, and blocking anywhere in the chain kills performance. Virtual threads (Phase 5) solve most concurrency needs with simpler code.

## gRPC

Binary protocol, code-generated clients/servers from `.proto` files. Faster than REST for service-to-service communication.

```protobuf
// user.proto
syntax = "proto3";
package com.kurek.fckjvm;

service UserService {
  rpc GetUser (GetUserRequest) returns (UserResponse);
  rpc ListUsers (Empty) returns (stream UserResponse);
}

message GetUserRequest {
  string id = 1;
}

message UserResponse {
  string id = 1;
  string email = 2;
  string display_name = 3;
}
```

```kotlin
implementation("net.devh:grpc-spring-boot-starter:3.1.0.RELEASE")
```

```java
@GrpcService
public class UserGrpcService extends UserServiceGrpc.UserServiceImplBase {

    @Override
    public void getUser(GetUserRequest request, StreamObserver<UserResponse> observer) {
        User user = userRepository.findById(UUID.fromString(request.getId())).orElseThrow();
        observer.onNext(UserResponse.newBuilder()
            .setId(user.getId().toString())
            .setEmail(user.getEmail())
            .build());
        observer.onCompleted();
    }
}
```

Use when: internal microservice calls, streaming data, polyglot services (proto generates clients for any language).

## Message queues — RabbitMQ / Kafka

Async communication between services. Decouple producers from consumers.

### RabbitMQ (traditional message broker)

```kotlin
implementation("org.springframework.boot:spring-boot-starter-amqp")
```

```java
// send
@Service
public class OrderService {
    private final RabbitTemplate rabbitTemplate;

    public void placeOrder(Order order) {
        orderRepository.save(order);
        rabbitTemplate.convertAndSend("orders.exchange", "order.created", order);
    }
}

// receive
@Component
public class OrderProcessor {

    @RabbitListener(queues = "order.processing")
    public void process(Order order) {
        // runs when a message arrives — separate from the HTTP request
        paymentService.charge(order);
        inventoryService.reserve(order);
    }
}
```

### Kafka (distributed log, high throughput)

```kotlin
implementation("org.springframework.kafka:spring-kafka")
```

```java
// produce
kafkaTemplate.send("user-events", userId, new UserCreatedEvent(userId, email));

// consume
@KafkaListener(topics = "user-events", groupId = "notification-service")
public void onUserEvent(UserCreatedEvent event) {
    notificationService.sendWelcome(event.email());
}
```

**RabbitMQ** = traditional queues, routing, task distribution. Good default.
**Kafka** = append-only log, replay events, high throughput, event sourcing. Use when you need event history or extreme scale.

## CQRS / Event sourcing

**CQRS** — separate read and write models:

```java
// write side — commands
@Service
public class OrderCommandService {
    public void placeOrder(PlaceOrderCommand cmd) {
        // validates, saves to write DB (normalized)
        // publishes OrderPlacedEvent
    }
}

// read side — queries (optimized, maybe denormalized, maybe different DB)
@Service
public class OrderQueryService {
    public OrderSummary getOrderSummary(UUID orderId) {
        // reads from a read-optimized view/table
    }
}
```

**Event sourcing** — store events, not state. Current state = replay of all events.

```
OrderPlaced → ItemAdded → ItemAdded → ItemRemoved → OrderPaid → OrderShipped
```

Don't use unless: complex domain with audit requirements, need to replay history, multiple views of same data. Adds significant complexity.

## GraalVM native image

Compile your Spring Boot app to a native binary. Instant startup (~50ms), lower memory.

```kotlin
plugins {
    id("org.graalvm.buildtools.native") version "0.10.4"
}
```

```bash
./gradlew nativeCompile
# produces build/native/nativeCompile/fckjvm — a single binary, no JVM needed

./build/native/nativeCompile/fckjvm
# starts in ~50ms instead of ~2-3 seconds
```

Trade-offs:
- **Pro**: instant startup, low memory (great for serverless/Lambda, CLI tools)
- **Con**: longer build times (minutes), no runtime reflection (Spring AOT handles most of it), some libraries don't support it
- **When**: serverless functions, CLI tools, microservices where startup time matters
- **Skip when**: traditional long-running servers (startup time doesn't matter), using reflection-heavy libraries
