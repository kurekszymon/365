# Phase 4 — Data & persistence (deeper)

## Flyway

Versioned SQL migrations. Replaces `ddl-auto=update` with explicit, tracked schema changes.

Add dependency:

```kotlin
implementation("org.flywaydb:flyway-core")
implementation("org.flywaydb:flyway-database-postgresql")
```

Create migration files in `src/main/resources/db/migration/`:

```sql
-- V1__create_users.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

-- V2__add_user_role.sql
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'USER';
```

Naming convention: `V{version}__{description}.sql` (double underscore).

```properties
# application.properties
spring.jpa.hibernate.ddl-auto=none   # Flyway manages the schema now
spring.flyway.enabled=true           # default is true if Flyway is on classpath
```

Flyway runs migrations on startup, tracks applied migrations in a `flyway_schema_history` table. Never edit an applied migration — create a new one.

## Relationships

### @ManyToOne / @OneToMany (most common)

```java
@Entity
@Table(name = "posts")
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String title;
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)  // many posts belong to one user
    @JoinColumn(name = "author_id")     // FK column in posts table
    private User author;
}

@Entity
@Table(name = "users")
public class User {
    // ... existing fields ...

    @OneToMany(mappedBy = "author")  // "author" is the field name in Post
    private List<Post> posts = new ArrayList<>();
}
```

### Lazy vs Eager loading

```java
@ManyToOne(fetch = FetchType.LAZY)   // DEFAULT for @ManyToOne — loads when accessed
@ManyToOne(fetch = FetchType.EAGER)  // loads immediately with parent query — usually bad

@OneToMany(fetch = FetchType.LAZY)   // DEFAULT for @OneToMany
```

**Rule: always use LAZY.** Eager causes uncontrolled extra queries. Load relationships explicitly when you need them (see N+1 below).

### @ManyToMany

```java
@Entity
public class User {
    @ManyToMany
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();
}

@Entity
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String name;

    @ManyToMany(mappedBy = "roles")
    private Set<User> users = new HashSet<>();
}
```

Creates a join table `user_roles(user_id, role_id)` automatically.

## N+1 problem

The #1 performance killer with ORMs.

```java
// this looks innocent
List<Post> posts = postRepository.findAll();        // 1 query: SELECT * FROM posts
for (Post post : posts) {
    System.out.println(post.getAuthor().getName());  // N queries: SELECT * FROM users WHERE id = ?
}
// Total: 1 + N queries. With 1000 posts = 1001 queries.
```

### Fix 1: @EntityGraph

```java
public interface PostRepository extends JpaRepository<Post, UUID> {

    @EntityGraph(attributePaths = {"author"})  // JOIN FETCH in one query
    List<Post> findAll();
}
```

### Fix 2: JPQL with JOIN FETCH

```java
@Query("SELECT p FROM Post p JOIN FETCH p.author")
List<Post> findAllWithAuthors();
```

### Fix 3: @BatchSize (lazy but batched)

```java
@OneToMany(mappedBy = "author")
@BatchSize(size = 25)  // loads authors in batches of 25 instead of 1-by-1
private List<Post> posts;
```

### How to detect: enable SQL logging and count queries

```properties
spring.jpa.show-sql=true
# or use a library like p6spy for formatted output with timing
```

## Custom queries

### JPQL (Java Persistence Query Language)

Queries use **entity class names and field names**, not table/column names:

```java
public interface UserRepository extends JpaRepository<User, UUID> {

    // JPQL — references User entity and email field
    @Query("SELECT u FROM User u WHERE u.email LIKE %:domain")
    List<User> findByEmailDomain(@Param("domain") String domain);

    // update query
    @Modifying
    @Query("UPDATE User u SET u.lastLoginAt = :now WHERE u.externalId = :extId")
    int updateLastLogin(@Param("extId") String externalId, @Param("now") Instant now);
}
```

### Native SQL

```java
@Query(value = "SELECT * FROM users WHERE created_at > :since", nativeQuery = true)
List<User> findRecentNative(@Param("since") Instant since);
```

Use native when you need Postgres-specific features (CTEs, window functions, `jsonb` operators).

### Projections — query partial data

```java
// interface-based projection
public interface UserSummary {
    String getEmail();
    String getDisplayName();
}

// Spring fills in the interface from the query result
List<UserSummary> findByDisplayNameContaining(String name);
```

## Transactions

`@Transactional` wraps a method in a database transaction. Spring opens a transaction before the method, commits after, or rolls back on exception.

```java
@Service
public class TransferService {

    @Transactional  // all-or-nothing: both updates succeed or both roll back
    public void transfer(UUID fromId, UUID toId, BigDecimal amount) {
        Account from = accountRepository.findById(fromId).orElseThrow();
        Account to = accountRepository.findById(toId).orElseThrow();

        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));

        accountRepository.save(from);
        accountRepository.save(to);
        // if save(to) throws, save(from) is also rolled back
    }
}
```

Key behaviors:
- **Default**: rolls back on `RuntimeException`, commits on checked exceptions
- **Read-only optimization**: `@Transactional(readOnly = true)` — hints to Hibernate to skip dirty-checking
- **Propagation**: default is `REQUIRED` — joins existing transaction or creates new one
- Spring uses **proxies** — `@Transactional` only works on public methods called from outside the class

```java
// WRONG — calling a @Transactional method from the same class bypasses the proxy
@Service
public class UserService {
    public void doStuff() {
        this.updateUser();  // @Transactional is IGNORED here
    }

    @Transactional
    public void updateUser() { ... }
}
```

## Pagination

Spring Data makes pagination trivial.

```java
public interface UserRepository extends JpaRepository<User, UUID> {
    Page<User> findByDisplayNameContaining(String name, Pageable pageable);
}

// in service
Pageable pageable = PageRequest.of(0, 20, Sort.by("createdAt").descending());
Page<User> page = userRepository.findByDisplayNameContaining("alice", pageable);

page.getContent();      // List<User> (the data)
page.getTotalElements(); // total count across all pages
page.getTotalPages();    // total pages
page.getNumber();        // current page number (0-based)
page.hasNext();          // boolean
```

In controller — Spring auto-resolves `Pageable` from query params:

```java
@GetMapping("/api/users")
public Page<User> listUsers(Pageable pageable) {
    return userRepository.findAll(pageable);
}
// GET /api/users?page=0&size=20&sort=createdAt,desc
```
