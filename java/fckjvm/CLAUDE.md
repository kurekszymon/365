# CLAUDE.md — Spring Boot 4 project notes

## Stack
- Spring Boot 4.0.3, Spring Framework 7, Spring Security 7.0.3
- Java 25, Gradle (Kotlin DSL), Lombok
- Postgres 17, Redis 8, Keycloak 26 — all via `docker-compose.yml`

## Spring Boot 4 package relocations
SB4 split `spring-boot-autoconfigure` into per-module jars. Old `org.springframework.boot.autoconfigure.*` paths no longer work.

| Class                                   | Spring Boot 3 package                          | Spring Boot 4 package                                                              |
| --------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `DataSourceAutoConfiguration`           | `o.s.b.autoconfigure.jdbc`                     | `o.s.b.jdbc.autoconfigure`                                                         |
| `HibernateJpaAutoConfiguration`         | `o.s.b.autoconfigure.orm.jpa`                  | `o.s.b.hibernate.autoconfigure`                                                    |
| `JpaRepositoriesAutoConfiguration`      | `o.s.b.autoconfigure.data.jpa`                 | `o.s.b.data.jpa.autoconfigure` → renamed to `DataJpaRepositoriesAutoConfiguration` |
| `RedisAutoConfiguration`                | `o.s.b.autoconfigure.data.redis`               | `o.s.b.data.redis.autoconfigure` → renamed to `DataRedisAutoConfiguration`         |
| `OAuth2ResourceServerAutoConfiguration` | `o.s.b.autoconfigure.security.oauth2.resource` | `o.s.b.security.oauth2.server.resource.autoconfigure.servlet`                      |
| `WebMvcTest`                            | `o.s.b.test.autoconfigure.web.servlet`         | `o.s.b.webmvc.test.autoconfigure`                                                  |
| `MockitoBean`                           | `o.s.b.test.mock.mockito`                      | `o.s.test.context.bean.override.mockito` (moved to Spring Framework)               |

## Spring Security 7 — unchanged paths
These did NOT move:
- `org.springframework.security.web.SecurityFilterChain`
- `org.springframework.security.config.annotation.web.configuration.EnableWebSecurity`
- `org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity`
- `org.springframework.security.config.http.SessionCreationPolicy`
- `org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter`
- `org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter`

## Testing notes
- `@WebMvcTest` slices can't wire OAuth2 resource server auto-config — exclude via `@TestPropertySource` on each `@WebMvcTest` class
- `src/test/resources/application.properties` **replaces** (not merges with) `src/main/resources/application.properties` — must re-declare datasource/redis/jwt config there
- `@WithMockUser` (from `spring-security-test`) fakes auth for controller tests
- `@SpringBootTest` boots full context — needs Docker infra running (`docker compose up -d`)
- `HelloServiceTest` is plain JUnit, no Spring context

## Build & run
```sh
docker compose up -d          # postgres, redis, keycloak
./gradlew bootRun             # app on :8080
./gradlew test                # requires docker compose running
```

## Third-party deps not in Spring BOM
- `org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.2` — needs explicit version
