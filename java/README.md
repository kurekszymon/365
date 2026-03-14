# java

# 14.03 — Redis + docker-compose
- added `spring-boot-starter-data-redis` — gives `RedisTemplate` and `@Cacheable` support
- `docker-compose.yml` — spins up Postgres 17 + Redis 8 (`docker compose up -d`)
- see `postgres-v-redis.md` for when to use each, caching patterns, and Spring integration examples
- Postgres = source of truth (relational, ACID). Redis = fast ephemeral layer (cache, sessions, rate limiting)
- for Keycloak later: sessions will go in Redis, user records in Postgres

# 13.03 — PostgreSQL + Hibernate / JPA
- added `spring-boot-starter-data-jpa` (Hibernate + Spring Data) and `postgresql` driver
- `User` entity in `entity/` → `users` table, with `externalId` field prepped for Keycloak's `sub` claim
- `UserRepository` interface — Spring generates SQL from method names (`findByEmail`, `findByExternalId`)
- `ddl-auto=update` for dev — auto-creates/alters tables. Use `none` + Flyway in prod
- `show-sql=true` to see generated SQL in console
- key reads: [Spring Data JPA query methods](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html), [Hibernate user guide](https://docs.jboss.org/hibernate/orm/7.0/userguide/html_single/Hibernate_User_Guide.html)
- watch out for the **N+1 problem** — fix with `@EntityGraph` or `JOIN FETCH`

# 11.03
- app is now seperated to controller/service folders, which is preferred according to Sonnet - will do some additional research over next few days on how to structure Spring Boot project
- entities should be stored under `model/` and JPA repos should be placed under `repository`
- to enable hot reloading - `spring-boot-devtools` are needed. run `gradlew bootRun` and `gradlew classes -t` in seperate terminal
- add unit tests with JUnit for Service, use WebMvcTest and Mockito to test controllers. run tests with `gradlew test`
