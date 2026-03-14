# Phase 5 — Real-world patterns

## DTOs vs Entities

**Never expose JPA entities directly in REST responses.** Entities have DB concerns (lazy proxies, bidirectional references, internal fields). DTOs are your API contract.

```java
// Entity — internal, maps to DB
@Entity
@Table(name = "users")
public class User {
    @Id private UUID id;
    private String externalId;    // internal — don't expose Keycloak's ID
    private String email;
    private String displayName;
    private Instant createdAt;
    private Instant lastLoginAt;
}

// Response DTO — external, what the API returns
public record UserResponse(
    UUID id,
    String email,
    String displayName,
    Instant createdAt
) {
    // factory method — entity → DTO
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getEmail(),
            user.getDisplayName(),
            user.getCreatedAt()
        );
    }
}

// Request DTO — what the API accepts
public record CreateUserRequest(
    @NotBlank @Email String email,
    @NotBlank String displayName
) {}
```

In controller:

```java
@GetMapping("/{id}")
public UserResponse getUser(@PathVariable UUID id) {
    User user = userService.getById(id);
    return UserResponse.from(user);  // never return the entity
}

@GetMapping
public List<UserResponse> listUsers() {
    return userService.findAll().stream()
        .map(UserResponse::from)
        .toList();
}
```

For larger projects, **MapStruct** generates mapping code at compile time instead of manual `.from()` methods.

## Service layer patterns

### Thin controllers, fat services

Controllers handle HTTP concerns only. Business logic lives in services.

```java
// GOOD — controller is a thin adapter
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        User user = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(UserResponse.from(user));
    }
}

// BAD — business logic in controller
@PostMapping
public ResponseEntity<User> create(@RequestBody CreateUserRequest request) {
    if (userRepository.existsByEmail(request.email())) {
        throw new ConflictException("email taken");  // this belongs in service
    }
    User user = new User();
    user.setEmail(request.email());       // mapping belongs in service
    userRepository.save(user);
    emailService.sendWelcome(user);       // orchestration belongs in service
    return ResponseEntity.ok(user);
}
```

### Service does orchestration

```java
@Service
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional
    public User create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("Email already taken");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setDisplayName(request.displayName());
        user = userRepository.save(user);

        emailService.sendWelcome(user);
        return user;
    }
}
```

## Caching with Redis

Enable caching and use annotation-driven cache:

```java
@Configuration
@EnableCaching
public class CacheConfig {
    // RedisCacheManager is auto-configured when Redis is on classpath

    @Bean
    public RedisCacheConfiguration cacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))    // default TTL
            .disableCachingNullValues();
    }
}
```

```java
@Service
public class UserService {

    @Cacheable(value = "users", key = "#id")
    public UserResponse getById(UUID id) {
        // only executes on cache miss — result is stored in Redis
        return UserResponse.from(userRepository.findById(id).orElseThrow());
    }

    @CacheEvict(value = "users", key = "#id")
    public void update(UUID id, UpdateUserRequest request) {
        // evicts the cached entry so next read fetches fresh data
        User user = userRepository.findById(id).orElseThrow();
        user.setDisplayName(request.displayName());
        userRepository.save(user);
    }

    @CacheEvict(value = "users", allEntries = true)
    public void clearUserCache() {
        // wipe the entire "users" cache
    }
}
```

Annotations:
- `@Cacheable` — read cache first, call method on miss
- `@CachePut` — always call method, update cache with result
- `@CacheEvict` — remove from cache

**Cache DTOs, not entities** — entities have lazy-loaded proxies that can't be serialized to Redis.

## Async

### @Async — fire and forget

```java
@Configuration
@EnableAsync
public class AsyncConfig { }

@Service
public class EmailService {

    @Async  // runs in a separate thread, doesn't block the caller
    public void sendWelcome(User user) {
        // slow email sending — caller doesn't wait for this
    }
}
```

### CompletableFuture — async with result

```java
@Async
public CompletableFuture<UserStats> computeStats(UUID userId) {
    // expensive computation
    return CompletableFuture.completedFuture(stats);
}

// caller
CompletableFuture<UserStats> future = userService.computeStats(id);
UserStats stats = future.get();  // blocks until done (or use thenApply for chaining)
```

### Virtual threads (Java 21+)

Spring Boot 4 supports virtual threads — lightweight threads managed by the JVM instead of the OS. Scales to millions of concurrent threads.

```properties
spring.threads.virtual.enabled=true
```

That's it. Spring uses virtual threads for request handling. Each request gets its own virtual thread — blocking I/O (DB queries, HTTP calls) no longer wastes OS threads.

## Scheduling

```java
@Configuration
@EnableScheduling
public class ScheduleConfig { }

@Service
public class CleanupService {

    @Scheduled(fixedRate = 60_000)  // every 60 seconds
    public void cleanExpiredSessions() { ... }

    @Scheduled(cron = "0 0 3 * * *")  // daily at 3:00 AM
    public void generateDailyReport() { ... }

    @Scheduled(fixedDelay = 30_000)  // 30s after previous execution finishes
    public void processQueue() { ... }
}
```

`fixedRate` = interval between starts. `fixedDelay` = interval between end of last and start of next.

## Events

Decouple components with Spring's event system. Publisher doesn't know about listeners.

```java
// define an event
public record UserCreatedEvent(UUID userId, String email) {}

// publish
@Service
public class UserService {
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public User create(CreateUserRequest request) {
        User user = userRepository.save(mapToEntity(request));
        eventPublisher.publishEvent(new UserCreatedEvent(user.getId(), user.getEmail()));
        return user;
    }
}

// listen — any bean can listen, UserService doesn't know about these
@Component
public class WelcomeEmailListener {

    @EventListener
    public void onUserCreated(UserCreatedEvent event) {
        emailService.sendWelcome(event.email());
    }
}

@Component
public class AuditListener {

    @EventListener
    public void onUserCreated(UserCreatedEvent event) {
        auditLog.record("USER_CREATED", event.userId());
    }
}

// async listener — doesn't block the transaction
@Component
public class AnalyticsListener {

    @Async
    @EventListener
    public void onUserCreated(UserCreatedEvent event) {
        analyticsService.track("signup", event.userId());
    }
}

// transactional event listener — runs after the transaction commits
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void afterUserCreated(UserCreatedEvent event) {
    // guaranteed the user is actually persisted before this runs
}
```

Events are great for cross-cutting concerns: emails, audit logs, analytics, cache invalidation.
