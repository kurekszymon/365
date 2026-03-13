# java


# 13.03 — PostgreSQL + Hibernate / JPA

## What was added
- `spring-boot-starter-data-jpa` — pulls in Hibernate (the ORM) + Spring Data JPA (the repository abstraction)
- `postgresql` driver — JDBC driver so Java can talk to Postgres
- `User` entity in `entity/` — mapped to `users` table, ready for Keycloak's `sub` claim via `externalId`
- `UserRepository` interface — Spring generates the SQL implementation at runtime

## Setup: start Postgres locally
```bash
# docker one-liner (or use your local install)
docker run -d --name fckjvm-pg -p 5432:5432 \
  -e POSTGRES_DB=fckjvm \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:17
```
Then `./gradlew bootRun` — Hibernate auto-creates the `users` table from the entity annotations.

## JPA / Hibernate — how it works

### Entity → Table mapping
```
@Entity              = "this class maps to a DB table"
@Table(name="users") = "specifically the 'users' table"
@Id                  = "this field is the primary key"
@GeneratedValue      = "DB/Hibernate generates the value"
@Column(...)         = constraints: unique, nullable, updatable
```
Hibernate reads these annotations and generates DDL + SQL at runtime.

### ddl-auto modes (spring.jpa.hibernate.ddl-auto)
| Value         | What it does                               | Use when          |
| ------------- | ------------------------------------------ | ----------------- |
| `none`        | Do nothing                                 | Production        |
| `validate`    | Check schema matches entities, fail if not | CI / staging      |
| `update`      | ALTER tables to match entities             | Local dev         |
| `create`      | DROP + CREATE on every startup             | Throwaway tests   |
| `create-drop` | Same as create, DROP on shutdown           | Integration tests |

**In production: use `none` + Flyway or Liquibase for versioned migrations.**

### Spring Data JPA — the repository pattern
```java
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email); // Spring writes the SQL
}
```
Method naming convention → auto-generated queries:
- `findByEmail(String email)` → `SELECT * FROM users WHERE email = ?`
- `findByDisplayNameContaining(String s)` → `... WHERE display_name LIKE %s%`
- `findByCreatedAtAfter(Instant t)` → `... WHERE created_at > ?`
- `existsByEmail(String email)` → `SELECT count(*) > 0 ...`
- `deleteByExternalId(String id)` → `DELETE FROM users WHERE external_id = ?`

Full reference: https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html

### What you get for free from JpaRepository
```java
userRepository.save(user);           // INSERT or UPDATE (upsert by ID)
userRepository.findById(uuid);       // SELECT by PK
userRepository.findAll();            // SELECT *
userRepository.count();              // SELECT count(*)
userRepository.delete(user);         // DELETE
userRepository.existsById(uuid);     // SELECT exists
```

## Reads for deeper understanding
1. **JPA annotations** — https://jakarta.ee/specifications/persistence/3.2/
2. **Spring Data JPA docs** — https://docs.spring.io/spring-data/jpa/reference/
3. **Hibernate user guide** — https://docs.jboss.org/hibernate/orm/7.0/userguide/html_single/Hibernate_User_Guide.html
4. **N+1 problem** — the #1 performance gotcha with ORMs. When you load a list of entities that have relationships, Hibernate fires 1 query for the list + N queries for each related entity. Fix with `@EntityGraph` or `JOIN FETCH` in JPQL.
5. **Flyway** (for later) — https://documentation.red-gate.com/fd/quickstart-how-flyway-works-184127223.html

## Keycloak prep — what `externalId` is for
When you add Keycloak + OIDC later, the flow will be:
1. User authenticates via Keycloak → your app receives a JWT
2. JWT contains `sub` claim (Keycloak's user ID, a UUID string)
3. Your app looks up `userRepository.findByExternalId(jwt.sub)`
4. If not found → create new User with that externalId (first login)
5. If found → update `lastLoginAt` and proceed

This keeps your user table as the **local source of truth** for app-specific data, while Keycloak owns authentication.

# 11.03
- app is now seperated to controller/service folders, which is preferred according to Sonnet - will do some additional research over next few days on how to structure Spring Boot project
- entities should be stored under `model/` and JPA repos should be placed under `repository`
- to enable hot reloading - `spring-boot-devtools` are needed. run `gradlew bootRun` and `gradlew classes -t` in seperate terminal
- add unit tests with JUnit for Service, use WebMvcTest and Mockito to test controllers. run tests with `gradlew test`
