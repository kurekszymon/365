# Java + Spring Boot learning notes

Generated with Claude, starting from `roadmap.md`. Each file is a self-contained reference for one topic area.

## Files

| File | Topic |
|------|-------|
| `roadmap.md` | Full learning roadmap with checkboxes |
| `00-jvm.md` | JVM internals: heap, GC, classpath, JARs, threads |
| `01-language.md` | Java the language: records, optionals, streams, generics, sealed classes, annotations |
| `01b-concurrency.md` | Java concurrency: threads, executors, CompletableFuture, concurrent collections |
| `02-spring-boot.md` | Spring Boot core: DI, validation, exceptions, profiles, logging, config, actuator |
| `03-auth-security.md` | Auth & security: Spring Security, Keycloak/OIDC, CORS, CSRF |
| `04-data-and-persistence.md` | Data layer: Flyway, relationships, N+1, custom queries, transactions, pagination |
| `05-real-world.md` | Patterns: DTOs, service layer, caching, async, scheduling, events |
| `06-testing.md` | Testing: Testcontainers, @DataJpaTest, MockMvc, fixtures, contract tests |
| `07-dockerize.md` | Production: Docker, env config, observability, rate limiting, CI/CD |
| `08-advanced.md` | Advanced: WebFlux, gRPC, message queues, CQRS, GraalVM |

## How to use

Work through `roadmap.md` top-to-bottom. Each phase builds on the previous. Read the corresponding file when you reach a topic, then implement it in the `fckjvm` project.