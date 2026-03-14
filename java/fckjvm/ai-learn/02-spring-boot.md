# Phase 2 — Spring Boot core

The framework fundamentals. You have controllers/services/repos already — this covers the remaining core features.

## Bean validation

Validate incoming data declaratively instead of manual `if` checks.

```java
// DTO with validation constraints
public record CreateUserRequest(
    @NotBlank(message = "email is required")
    @Email(message = "must be a valid email")
    String email,

    @NotBlank
    @Size(min = 2, max = 50, message = "name must be 2-50 chars")
    String displayName
) {}
```

Wire it up in the controller with `@Valid`:

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody CreateUserRequest request) {
        // if validation fails, Spring returns 400 before this code runs
        User user = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
}
```

Common constraints (`jakarta.validation.constraints`):

```java
@NotNull              // not null (any type)
@NotBlank             // not null, not empty, not whitespace (String only)
@NotEmpty             // not null, not empty (String, Collection, Map, Array)
@Size(min=, max=)     // length/size bounds
@Email                // email format
@Min(0) @Max(100)     // numeric bounds
@Pattern(regexp="")   // regex match
@Past @Future         // date constraints
@Positive             // > 0
```

To get validation errors as structured JSON (instead of Spring's default ugly response), combine with `@ControllerAdvice` — see next section.

## Exception handling

Centralized error handling with `@ControllerAdvice`. One class handles exceptions from ALL controllers.

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    // handle specific exception
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(UserNotFoundException ex) {
        return ResponseEntity.status(404)
            .body(new ErrorResponse(404, ex.getMessage()));
    }

    // handle validation errors from @Valid
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
            .body(new ErrorResponse(400, message));
    }

    // catch-all fallback
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(500)
            .body(new ErrorResponse(500, "Internal server error"));
    }
}

// simple error response record
public record ErrorResponse(int status, String message) {}

// custom exception
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String email) {
        super("User not found: " + email);
    }
}
```

Now your service can just throw:

```java
@Service
public class UserService {
    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new UserNotFoundException(email));
        // returns 404 JSON: {"status": 404, "message": "User not found: alice@test.com"}
    }
}
```

## Profiles

Different config per environment. Spring loads `application-{profile}.properties` on top of base `application.properties`.

```
src/main/resources/
├── application.properties            # base (always loaded)
├── application-dev.properties        # local development
└── application-prod.properties       # production
```

```properties
# application.properties (shared)
spring.application.name=fckjvm

# application-dev.properties
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=update
spring.datasource.url=jdbc:postgresql://localhost:5432/fckjvm

# application-prod.properties
spring.jpa.show-sql=false
spring.jpa.hibernate.ddl-auto=none
spring.datasource.url=${DATABASE_URL}
```

Activate a profile:

```bash
# env var (most common in prod)
SPRING_PROFILES_ACTIVE=prod ./gradlew bootRun

# command line
./gradlew bootRun --args='--spring.profiles.active=dev'

# in application.properties (default profile)
spring.profiles.active=dev
```

Profile-conditional beans:

```java
@Configuration
public class StorageConfig {

    @Bean
    @Profile("dev")
    public StorageService localStorage() {
        return new LocalFileStorageService();
    }

    @Bean
    @Profile("prod")
    public StorageService s3Storage() {
        return new S3StorageService();
    }
}
```

## Logging

Spring Boot uses **SLF4J** (API) + **Logback** (implementation) by default. Already on your classpath.

```java
// option 1 — manual logger
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    public User getByEmail(String email) {
        log.info("Looking up user: {}", email);           // {} = placeholder (no string concat)
        log.debug("Cache miss for email={}", email);       // only shows if level is DEBUG
        log.warn("User not found: {}", email);
        log.error("Failed to fetch user", exception);      // pass exception as last arg for stack trace
    }
}

// option 2 — Lombok (you have it already)
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class UserService {
    // `log` field is auto-generated
    public User getByEmail(String email) {
        log.info("Looking up user: {}", email);
    }
}
```

Log levels (from most to least verbose): `TRACE` → `DEBUG` → `INFO` → `WARN` → `ERROR`

Configure in `application.properties`:

```properties
# set root level
logging.level.root=INFO

# set specific package level
logging.level.com.kurek.fckjvm=DEBUG
logging.level.org.hibernate.SQL=DEBUG          # see SQL queries
logging.level.org.hibernate.orm.jdbc.bind=TRACE # see bound parameters

# log to file
logging.file.name=app.log
```

**Kill all `System.out.println`** — it's unstructured, can't be filtered by level, doesn't include timestamps or class names.

## Configuration

### `@Value` — inject single properties

```java
@Service
public class EmailService {

    @Value("${app.email.from:noreply@fckjvm.com}")  // default after colon
    private String fromAddress;

    @Value("${app.email.enabled:true}")
    private boolean enabled;
}
```

```properties
# application.properties
app.email.from=hello@fckjvm.com
app.email.enabled=true
```

### `@ConfigurationProperties` — typed config classes (preferred for groups)

```java
@ConfigurationProperties(prefix = "app.email")
public record EmailProperties(
    String from,
    boolean enabled,
    int maxRetries
) {}
```

```properties
app.email.from=hello@fckjvm.com
app.email.enabled=true
app.email.max-retries=3
```

Enable it:

```java
@SpringBootApplication
@ConfigurationPropertiesScan  // scans for @ConfigurationProperties classes
public class FckjvmApplication { ... }
```

Inject and use:

```java
@Service
public class EmailService {
    private final EmailProperties emailProperties;

    public EmailService(EmailProperties props) {
        this.emailProperties = props;
    }

    public void send() {
        if (emailProperties.enabled()) {
            // send from emailProperties.from()
        }
    }
}
```

`@ConfigurationProperties` > `@Value` because:
- Type-safe
- Grouped logically
- Validated with `@Valid`
- Easy to test (construct the record directly)

## Actuator

Production monitoring endpoints. Add the dependency:

```kotlin
// build.gradle.kts
implementation("org.springframework.boot:spring-boot-starter-actuator")
```

```properties
# application.properties — expose specific endpoints
management.endpoints.web.exposure.include=health,info,beans,mappings,env,metrics
```

Key endpoints:

| Endpoint                                 | What it shows                                         |
| ---------------------------------------- | ----------------------------------------------------- |
| `/actuator/health`                       | App status (UP/DOWN), DB connectivity, disk space     |
| `/actuator/beans`                        | Every bean in the context — type, scope, dependencies |
| `/actuator/mappings`                     | All HTTP routes mapped to controller methods          |
| `/actuator/env`                          | All config properties and their sources               |
| `/actuator/metrics`                      | JVM metrics, HTTP request stats, custom metrics       |
| `/actuator/metrics/http.server.requests` | Request count, latency per endpoint                   |

Custom health indicator:

```java
@Component
public class RedisHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        // check Redis connectivity
        try {
            redisTemplate.getConnectionFactory().getConnection().ping();
            return Health.up().withDetail("redis", "connected").build();
        } catch (Exception e) {
            return Health.down().withException(e).build();
        }
    }
}
```

**In production**: expose only `/actuator/health` publicly. Put the rest behind auth or an internal network.
