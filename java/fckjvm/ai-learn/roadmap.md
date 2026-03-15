# Java + Spring Boot Roadmap

For an experienced dev (you know programming, you're learning the Java ecosystem).

## Phase 1 — Java the language (you're here-ish)
- [x] Project setup: Gradle, Spring Initializr, project structure
- [x] Controllers, Services, DI (constructor injection)
- [x] Unit tests (JUnit 5) + slice tests (@WebMvcTest + MockMvc)
- [ ] **Java records** — immutable data carriers, perfect for DTOs: `record UserDto(String email, String name) {}`
- [ ] **Optionals** — `Optional<T>` instead of null. `orElseThrow()`, `map()`, `ifPresent()`.
- [ ] **Streams API** — `list.stream().filter().map().collect()`. Functional pipelines over collections.
- [ ] **Sealed classes / pattern matching** — `switch` on types, exhaustive matching (Java 21+)
- [ ] **Generics** — `<T>`, bounded types (`<T extends Comparable<T>>`), wildcards, PECS.
- [ ] **Annotations & reflection** — understand Java annotations (`@Target`, `@Retention`), reflection API, *how* frameworks read metadata at runtime
- [ ] **Concurrency** — `synchronized`, `ExecutorService`, `CompletableFuture`, `ConcurrentHashMap`, thread safety patterns

## Phase 2 — Spring Boot core (current focus)
- [x] REST controllers + service layer
- [x] JPA / Hibernate + Postgres
- [x] Redis integration
- [x] OpenAPI / Swagger (SpringDoc)
- [ ] **How Spring uses annotations & DI** — component scan, `@Component` hierarchy, `@Bean`, the Application Context, Spring's use of generics (`JpaRepository<T, ID>`, `ResponseEntity<T>`)
- [ ] **Bean validation** — `@Valid` + `jakarta.validation` (`@NotBlank`, `@Email`, `@Size`) on DTOs
- [ ] **Exception handling** — `@ControllerAdvice` + `@ExceptionHandler` for centralized error responses
- [ ] **Profiles** — `application-dev.properties`, `application-prod.properties`, `@Profile`
- [ ] **Logging** — SLF4J + Logback (comes with Spring). `@Slf4j` (Lombok) or `LoggerFactory.getLogger()`. Kill all `System.out.println`.
- [ ] **Configuration** — `@Value("${prop}")`, `@ConfigurationProperties` for typed config classes
- [ ] **Actuator** — `/actuator/health`, `/actuator/beans`, `/actuator/mappings` — production monitoring

## Phase 3 — Auth & Security
- [ ] **Spring Security basics** — filter chain, `SecurityFilterChain` bean, `@PreAuthorize`
- [ ] **Keycloak + OIDC** — Resource server with JWT validation, `externalId` user sync
- [ ] **CORS config** — `@CrossOrigin` or global `WebMvcConfigurer`
- [ ] **CSRF** — when to disable (stateless APIs) vs when it matters (cookie-based sessions)

## Phase 4 — Data & persistence (deeper)
- [ ] **Flyway** — versioned SQL migrations (`V1__create_users.sql`). Replace `ddl-auto=update`.
- [ ] **Relationships** — `@OneToMany`, `@ManyToOne`, `@ManyToMany`, `@JoinColumn`. Understand lazy vs eager loading.
- [ ] **N+1 problem** — `@EntityGraph`, `JOIN FETCH`, `@BatchSize`. Profile with `show-sql` or p6spy.
- [ ] **Custom queries** — `@Query("SELECT u FROM User u WHERE ...")` (JPQL) or native SQL
- [ ] **Transactions** — `@Transactional`, isolation levels, when Spring opens/commits/rolls back
- [ ] **Pagination** — `Pageable` in repo methods, `Page<T>` return type

## Phase 5 — Real-world patterns
- [ ] **DTOs vs Entities** — never expose entities directly in controllers. Map with records or MapStruct.
- [ ] **Service layer patterns** — thin controllers, fat services. Orchestration vs domain logic.
- [ ] **Caching with Redis** — `@Cacheable`, `@CacheEvict`, TTL strategy
- [ ] **Async** — `@Async`, `CompletableFuture`, virtual threads (Java 21+)
- [ ] **Scheduling** — `@Scheduled` for cron jobs
- [ ] **Events** — `ApplicationEventPublisher`, `@EventListener` for decoupling

## Phase 6 — Testing (deeper)
- [ ] **Testcontainers** — spin up real Postgres/Redis in Docker for integration tests (replaces H2)
- [ ] **@DataJpaTest** — sliced test for repositories with in-memory DB
- [ ] **MockMvc vs WebTestClient** — when to use each
- [ ] **Test fixtures / factories** — reusable test data builders
- [ ] **Contract testing** — Spring Cloud Contract or Pact

## Phase 7 — Production readiness
- [ ] **Docker** — multi-stage Dockerfile for Spring Boot (`./gradlew bootBuildImage` or manual)
- [ ] **Environment config** — externalized config via env vars, Spring profiles, ConfigMaps
- [ ] **Observability** — Micrometer metrics + Prometheus + Grafana, structured logging, distributed tracing (OpenTelemetry)
- [ ] **Rate limiting** — Bucket4j or Redis-based
- [ ] **API versioning** — URL (`/v1/users`) vs header (`Accept-Version`)
- [ ] **CI/CD** — GitHub Actions: build → test → Docker image → deploy

## Phase 8 — Advanced / when you need it
- [ ] **Reactive stack** — WebFlux, R2DBC (non-blocking). Only if you need massive concurrency.
- [ ] **gRPC** — for service-to-service comms
- [ ] **Message queues** — RabbitMQ or Kafka with Spring for async processing
- [ ] **CQRS / Event sourcing** — if domain complexity demands it
- [ ] **GraalVM native image** — `./gradlew nativeCompile` for instant startup (AOT compilation)

## JVM stuff to know along the way
- **Heap & GC** — `-Xmx`, `-Xms`, G1 vs ZGC. Use `jvisualvm` or `jfr` to profile.
- **Classpath** — how Gradle resolves deps. `implementation` vs `api` vs `compileOnly` vs `runtimeOnly`.
- **JAR structure** — Spring Boot fat JAR packages everything. `java -jar app.jar` runs it.
- **Thread model** — platform threads vs virtual threads (Project Loom). Spring Boot 4 supports both.
