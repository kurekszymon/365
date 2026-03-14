# PostgreSQL vs Redis — when to use what

## The one-liner
**Postgres = source of truth (persistent, relational). Redis = fast ephemeral layer (cache, sessions, pub/sub).**

## What goes where

| Data                                   | Store    | Why                                                   |
| -------------------------------------- | -------- | ----------------------------------------------------- |
| Users, orders, products                | Postgres | Relational, needs ACID, queried with complex filters  |
| Sessions / auth tokens                 | Redis    | Short-lived, accessed every request, needs to be fast |
| Cache (e.g. "user profile for UUID X") | Redis    | Avoid hitting Postgres repeatedly for the same read   |
| Rate limiting counters                 | Redis    | Atomic increments, auto-expiry with TTL               |
| Real-time leaderboards / counters      | Redis    | Sorted sets, O(log N) operations                      |
| Job queues                             | Redis    | Lists with LPUSH/BRPOP, or use Redis Streams          |
| Full-text search, reporting, joins     | Postgres | Redis can't do relational queries                     |
| Anything that must survive a restart   | Postgres | Redis *can* persist but it's not its strength         |

## Mental model

```
Client → Spring Boot → Redis (cache hit?) → yes → return
                            ↓ no
                        Postgres (query) → store in Redis → return
```

The pattern: **read from Redis first, fall back to Postgres, write-through or write-behind to keep Redis warm.**

## How they work differently

### Postgres
- **Disk-based** relational DB. Data organized in tables with schemas.
- Supports transactions (ACID), joins, indexes, constraints, foreign keys.
- Query language: SQL.
- Latency: ~1-10ms per query (depends on indexes, data size).

### Redis
- **In-memory** key-value store. Data structures: strings, hashes, lists, sets, sorted sets, streams.
- No schemas, no joins. You design around access patterns.
- Latency: ~0.1-0.5ms (it's RAM).
- Data expires automatically with TTL — `SET key value EX 3600` (1 hour).
- Single-threaded event loop — no locking issues, atomic operations by default.

## In Spring Boot

### Redis with `spring-boot-starter-data-redis`

Spring gives you two abstractions:

**1. `RedisTemplate` — low-level, direct key-value ops:**
```java
@Autowired
private StringRedisTemplate redisTemplate;

// write
redisTemplate.opsForValue().set("user:123:name", "Alice", Duration.ofMinutes(30));

// read
String name = redisTemplate.opsForValue().get("user:123:name"); // null if expired

// delete
redisTemplate.delete("user:123:name");

// atomic increment (rate limiting)
redisTemplate.opsForValue().increment("rate:ip:192.168.1.1");
redisTemplate.expire("rate:ip:192.168.1.1", Duration.ofMinutes(1));
```

**2. `@Cacheable` — annotation-driven caching (recommended start):**
```java
@Configuration
@EnableCaching
public class CacheConfig {
    // Spring auto-configures RedisCacheManager when Redis is on classpath
}

@Service
public class UserService {

    @Cacheable(value = "users", key = "#id")       // checks Redis first
    public User getUser(UUID id) {
        return userRepository.findById(id).orElseThrow(); // only hits Postgres on cache miss
    }

    @CacheEvict(value = "users", key = "#id")      // invalidate on write
    public void updateUser(UUID id, UserDto dto) {
        // ...
    }
}
```

Spring serializes the return value to Redis as the cache. Next call with same key skips the method body entirely.

**3. Spring Session with Redis (for Keycloak later):**
```properties
# stores HTTP sessions in Redis instead of server memory
spring.session.store-type=redis
spring.session.redis.namespace=fckjvm:sessions
```
This means sessions survive app restarts and work across multiple instances (horizontal scaling).

## Common patterns

### Cache-aside (most common)
1. Check Redis for cached value
2. Cache miss → query Postgres → store result in Redis with TTL
3. On write → update Postgres → evict/update Redis

### Session store
- Keycloak authenticates → Spring stores session in Redis
- Every subsequent request reads session from Redis (sub-ms)
- Session expires via Redis TTL, no need to manage cleanup

### Rate limiting
```
Key:  "ratelimit:{userId}:{minute}"
Value: counter (INCR)
TTL:  60 seconds
```
Check if counter > threshold → reject. Redis handles expiry automatically.

## What NOT to do
- Don't use Redis as your primary database (data loss risk on crash, no relational queries)
- Don't cache everything — cache hot reads, not data that changes every request
- Don't skip TTLs — stale cache is worse than no cache
- Don't store large blobs in Redis — it's RAM, keep values small

## Reads
- Redis data types: https://redis.io/docs/latest/develop/data-types/
- Spring Data Redis: https://docs.spring.io/spring-data/redis/reference/
- Spring Cache abstraction: https://docs.spring.io/spring-boot/reference/io/caching.html
- Redis persistence (RDB vs AOF): https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
