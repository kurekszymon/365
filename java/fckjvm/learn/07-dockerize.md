# Phase 7 — Production readiness

## Docker

### Multi-stage Dockerfile

```dockerfile
# stage 1 — build
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon    # cache deps layer
COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# stage 2 — runtime (smaller image, no build tools)
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```bash
docker build -t fckjvm .
docker run -p 8080:8080 --net=host fckjvm
```

### Spring Boot's built-in image builder (alternative)

```bash
./gradlew bootBuildImage
# creates an OCI image using Cloud Native Buildpacks — no Dockerfile needed
# uses layered JARs for better caching
```

### docker-compose with the app

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/fckjvm
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      SPRING_DATA_REDIS_HOST: redis

  postgres:
    image: postgres:17
    # ...

  redis:
    image: redis:8-alpine
    # ...
```

## Environment config

Spring resolves properties in this order (later wins):

```
1. application.properties (in JAR)
2. application-{profile}.properties
3. Environment variables
4. Command-line args
```

### Environment variables override properties

Property `spring.datasource.url` → env var `SPRING_DATASOURCE_URL`

Rule: uppercase, dots become underscores, hyphens become underscores.

```bash
# override any property via env
SPRING_DATASOURCE_URL=jdbc:postgresql://prod-db:5432/fckjvm \
SPRING_PROFILES_ACTIVE=prod \
java -jar app.jar
```

### Kubernetes ConfigMap/Secret

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fckjvm-config
data:
  SPRING_PROFILES_ACTIVE: "prod"
  SPRING_DATASOURCE_URL: "jdbc:postgresql://db:5432/fckjvm"
---
apiVersion: v1
kind: Secret
metadata:
  name: fckjvm-secrets
stringData:
  SPRING_DATASOURCE_PASSWORD: "supersecret"
```

## Observability

Three pillars: metrics, logs, traces.

### Metrics — Micrometer + Prometheus

```kotlin
implementation("org.springframework.boot:spring-boot-starter-actuator")
implementation("io.micrometer:micrometer-registry-prometheus")
```

```properties
management.endpoints.web.exposure.include=health,prometheus
management.prometheus.metrics.export.enabled=true
```

Now `/actuator/prometheus` exposes all metrics in Prometheus format. Scrape with Prometheus, visualize with Grafana.

Custom metrics:

```java
@Service
public class UserService {
    private final Counter userCreatedCounter;

    public UserService(MeterRegistry registry) {
        this.userCreatedCounter = Counter.builder("users.created")
            .description("Number of users created")
            .register(registry);
    }

    public User create(CreateUserRequest request) {
        User user = userRepository.save(mapToEntity(request));
        userCreatedCounter.increment();
        return user;
    }
}
```

### Structured logging

Replace plain text logs with JSON for log aggregation (ELK, Loki):

```xml
<!-- src/main/resources/logback-spring.xml -->
<configuration>
    <springProfile name="prod">
        <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
        </appender>
        <root level="INFO">
            <appender-ref ref="STDOUT"/>
        </root>
    </springProfile>
</configuration>
```

Add MDC (Mapped Diagnostic Context) for request tracing:

```java
// automatically adds requestId to every log line in this request
@Component
public class RequestIdFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        MDC.put("requestId", UUID.randomUUID().toString());
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}
```

### Distributed tracing — OpenTelemetry

```kotlin
implementation("io.micrometer:micrometer-tracing-bridge-otel")
implementation("io.opentelemetry:opentelemetry-exporter-otlp")
```

Propagates trace IDs across service calls. View in Jaeger or Grafana Tempo.

## Rate limiting

### Bucket4j (in-memory, simple)

```kotlin
implementation("com.bucket4j:bucket4j-core:8.14.0")
```

```java
@RestController
public class ApiController {

    // 10 requests per minute
    private final Bucket bucket = Bucket.builder()
        .addLimit(BandwidthBuilder.builder()
            .capacity(10)
            .refillGreedy(10, Duration.ofMinutes(1))
            .build())
        .build();

    @GetMapping("/api/limited")
    public ResponseEntity<String> limited() {
        if (bucket.tryConsume(1)) {
            return ResponseEntity.ok("OK");
        }
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
    }
}
```

### Redis-based (distributed, per-user)

```java
@Service
public class RateLimiter {
    private final StringRedisTemplate redis;

    public boolean isAllowed(String key, int maxRequests, Duration window) {
        String redisKey = "ratelimit:" + key;
        Long count = redis.opsForValue().increment(redisKey);
        if (count == 1) {
            redis.expire(redisKey, window);
        }
        return count <= maxRequests;
    }
}
```

## API versioning

### URL-based (most common, simplest)

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 { ... }

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 { ... }
```

### Header-based

```java
@GetMapping(value = "/api/users", headers = "X-API-Version=1")
public List<UserResponseV1> getUsersV1() { ... }

@GetMapping(value = "/api/users", headers = "X-API-Version=2")
public List<UserResponseV2> getUsersV2() { ... }
```

URL-based is pragmatic and easy to understand. Use it unless you have a strong reason not to.

## CI/CD — GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '25'

      - uses: gradle/actions/setup-gradle@v4

      - name: Build & Test
        run: ./gradlew build

      - name: Build Docker image
        if: github.ref == 'refs/heads/main'
        run: docker build -t fckjvm:${{ github.sha }} .

      # push to registry, deploy, etc.
```
