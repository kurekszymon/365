# Phase 9 — Session recordings (PostHog/Clarity clone)

What we built and why every piece exists. This doc walks through the recording module and explains the Java/Spring/Hibernate concepts it uses.

## What was built

A backend system that receives streams of browser events from a frontend SDK, stores them, detects behavioral signals (rage clicks, dead clicks, etc.), and serves them back for session replay. Think PostHog Session Replay or Microsoft Clarity — but just the backend.

### Package layout

```
com.kurek.fckjvm.recording
├── event/                  ← shared contract (enums frontend + backend both use)
│   ├── EventType.java      ← all possible event types the SDK can send
│   └── SignalType.java     ← behavioral signals the backend detects
├── dto/                    ← data transfer objects (API request/response shapes)
│   ├── IngestBatchRequest   ← what the SDK POSTs
│   ├── RecordedEventDto     ← single event within a batch
│   ├── SessionMetadataDto   ← browser/page context
│   ├── SessionRecordingResponse  ← full session for replay
│   ├── SessionSummaryDto    ← lightweight list item
│   └── SessionSignalDto     ← detected behavioral signal
├── entity/                 ← JPA entities (database tables)
│   ├── RecordingSession     ← the session itself
│   ├── RecordingEvent       ← individual events within a session
│   └── RecordingSignal      ← detected signals
├── repository/             ← Spring Data JPA repositories (database access)
├── service/                ← business logic
│   ├── SessionRecordingService   ← ingest, retrieve, list
│   └── BehaviorAnalysisService   ← signal detection algorithms
└── controller/             ← REST endpoints
    ├── SessionRecordingController
    └── RecordingExceptionHandler
```

This follows **package-by-feature** — everything related to recordings is inside `recording/`. The rest of the app (`controller/`, `service/`, `entity/`) uses **package-by-layer**. Feature packaging scales better as the app grows because related code stays together. You don't have to dig through 30 files in a single `service/` package.

## Why records for DTOs

```java
public record RecordedEventDto(
        EventType type,
        long timestamp,
        Map<String, Object> data
) {}
```

Java `record` (since Java 16) is a class that is:
- **Immutable** — fields are `final`, no setters
- **Auto-generated**: constructor, `equals()`, `hashCode()`, `toString()`, getters (called `type()` not `getType()`)
- **Concise** — replaces 40 lines of boilerplate Lombok `@Value` or manual POJO

We use records for DTOs because DTOs should be **immutable data carriers**. They come in from JSON, get read, that's it. Nobody should mutate a request halfway through processing.

Entities (`RecordingSession`, `RecordingEvent`) use **classes with Lombok** instead because Hibernate needs:
- A no-arg constructor (`@NoArgsConstructor`)
- Setters (to hydrate fields from the database)
- Mutable state (dirty checking — Hibernate compares current vs. original values)

**Rule of thumb**: records for DTOs, Lombok classes for JPA entities.

## Entity annotations explained

### `@OneToMany` and `@OrderBy` on RecordingSession

`RecordingSession` has two child collections, both annotated with `@OrderBy`:

```java
@OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("sequenceNumber ASC")
private List<RecordingEvent> events = new ArrayList<>();

@OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("timestamp ASC")
private List<RecordingSignal> signals = new ArrayList<>();
```

Unpacking every part:

**`@OneToMany`** — one session has many events. This is and Hibernate relationship mapping. In the database, the FK lives on the `recording_events` table (`session_id` column), not on `recording_sessions`.

**`mappedBy = "session"`** — tells Hibernate: "the `RecordingEvent.session` field owns the foreign key." Without `mappedBy`, Hibernate creates a join table (`recording_sessions_recording_events`) which you don't want. The side with `@ManyToOne` owns the relationship, the `@OneToMany` side just mirrors it.

**`cascade = CascadeType.ALL`** — when you delete a session, Hibernate cascades the DELETE to its events and signals. `ALL` = `PERSIST + MERGE + REMOVE + REFRESH + DETACH`.

Note: `ingest()` does **not** use cascade to persist events — it calls `eventRepository.save(entity)` directly for each event. Cascade is mainly relied on for DELETE here: removing a session removes all its events and signals without extra repository calls.

**`orphanRemoval = true`** — if you remove an event from the list (`session.getEvents().remove(event)`), Hibernate DELETE-s the row from the database. Without it, the event would just have its FK set to null (orphaned row).

**`@OrderBy("sequenceNumber ASC")`** — Hibernate adds `ORDER BY sequence_number ASC` to the SQL whenever it loads the events collection. This guarantees replay order. It's a JPA annotation (not JPQL) — it goes on the collection field. Alternative: `@OrderColumn` which manages an index column automatically, but we control sequencing ourselves.

### Why `@ManyToOne(fetch = FetchType.LAZY)` on the child side

```java
// In RecordingEvent:
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "session_id", nullable = false)
private RecordingSession session;
```

**`FetchType.LAZY`** — when you load a `RecordingEvent`, it does NOT immediately load the parent `RecordingSession`. It creates a **Hibernate proxy** (a fake subclass) that only hits the database when you call `event.getSession().getInitialUrl()`.

Why this matters: if you load 10,000 events, you don't want 10,000 extra SELECT queries to load the same session over and over.

`@ManyToOne` defaults to `EAGER` in JPA spec. Always override to `LAZY`. This is the #1 Hibernate performance rule.

**`@JoinColumn(name = "session_id")`** — the FK column name in the `recording_events` table. Without it, Hibernate uses `session_id` by convention anyway, but being explicit is better for readability.

### Session ID owned by the client

`RecordingSession` has no `@GeneratedValue` on its `@Id`:

```java
@Id
private UUID id;
```

The ID comes from the SDK's `IngestBatchRequest.sessionId()` and is set directly: `session.setId(request.sessionId())`. The client generates the UUID, not the database. This enables the upsert pattern in `ingest()` — `findById` → create if absent — and guarantees idempotency on retry: re-delivering the same batch with the same `sessionId` finds the existing session instead of creating a duplicate.

### JSONB columns

```java
@JdbcTypeCode(SqlTypes.JSON)
@Column(columnDefinition = "jsonb")
private Map<String, Object> data;
```

This stores the event payload as a PostgreSQL `jsonb` column. Why not separate columns? Because every event type has a different shape:

- `MOUSE_CLICK`: `{ "x": 120, "y": 340, "selector": "#btn" }`
- `SCROLL`: `{ "scrollY": 2400 }`
- `JS_ERROR`: `{ "message": "...", "stack": "..." }`

Modeling this with columns would mean a table with 50 nullable columns, most of which are null for any given row. JSONB is the right call here — Postgres can index inside JSONB (`CREATE INDEX ON ... USING GIN (data)`), and Hibernate maps it to `Map<String, Object>` seamlessly.

`@JdbcTypeCode(SqlTypes.JSON)` tells Hibernate 6+ to use the JSON JDBC type. `columnDefinition = "jsonb"` ensures the DDL generates `jsonb` and not `json` (jsonb is binary, indexed, and faster).

## Repository JPQL queries explained

### Derived query methods

`RecordingSessionRepository` has three derived methods:

```java
Page<RecordingSession> findByUserIdOrderByStartedAtDesc(UUID userId, Pageable pageable);

Page<RecordingSession> findByStartedAtBetweenOrderByStartedAtDesc(
        Instant from, Instant to, Pageable pageable);
```

Spring Data reads the method name and generates the SQL. `findByUserIdOrderByStartedAtDesc` translates to:
```sql
SELECT * FROM recording_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?
```

Convention: `findBy` + field path + `OrderBy` + field + `Desc/Asc`. Spring parses this at startup — if a field name doesn't match, the app fails to start (which is actually a good thing — catches typos early).

`findByStartedAtBetweenOrderByStartedAtDesc` is used in `listSessions()` when only a date range is provided (no `userId`, no `signalType`).

`Pageable` is Spring's abstraction for offset + limit + sort. The controller receives `?page=0&size=20&sort=startedAt,desc` and Spring auto-resolves it.

`RecordingEventRepository` has a custom aggregate query:

```java
@Query("SELECT COALESCE(MAX(e.sequenceNumber), 0) FROM RecordingEvent e WHERE e.session.id = :sessionId")
long findMaxSequenceNumber(@Param("sessionId") UUID sessionId);
```

`ingest()` calls this to find the highest sequence number already stored, then assigns `seqBase + 1`, `seqBase + 2`, etc. to the incoming batch. `COALESCE(..., 0)` handles the first batch (no events yet → MAX returns null → falls back to 0). This makes appends idempotent across multiple SDK calls.

`RecordingSignalRepository` exposes a single method:

```java
List<RecordingSignal> findBySessionIdOrderByTimestampAsc(UUID sessionId);
```

It's called in three places: `getSession()`, `getSignals()`, and `toSummary()`. The last one is worth watching — `toSummary()` is called inside `page.map(...)` in `listSessions()`, which means one extra SELECT per session in the page. With a default page size of 20 that's 20 extra queries. This is a deliberate simplicity trade-off; if it becomes a bottleneck, replace with a single JOIN query.

### `@Query` with JPQL

```java
@Query("""
        SELECT DISTINCT s FROM RecordingSession s
        JOIN s.signals sig
        WHERE sig.type = :signalType
        ORDER BY s.startedAt DESC
        """)
Page<RecordingSession> findBySignalType(
        @Param("signalType") SignalType signalType, Pageable pageable);
```

Why we need `@Query` here: Spring Data derived queries can't express "find sessions that have at least one signal of type X." That requires a JOIN across the relationship, which derived method names can't do.

**JPQL vs SQL**: JPQL uses **entity names and field names**, not table/column names:
- `RecordingSession` not `recording_sessions`
- `s.signals` not `JOIN recording_signals ON ...`
- `sig.type` not `sig.type::text`

Hibernate translates this to SQL at runtime. The advantage: if you rename a column, Hibernate's mapping handles it — the JPQL stays the same.

**`DISTINCT`** — a session might have 5 `RAGE_CLICK` signals. Without `DISTINCT`, you'd get that session 5 times in results.

**`@Param("signalType")`** — binds the method parameter to the `:signalType` placeholder in the query. This is a **parameterized query** — Hibernate uses prepared statements, which prevents SQL injection. Never concatenate user input into query strings.

### The filtered query

```java
@Query("""
        SELECT DISTINCT s FROM RecordingSession s
        JOIN s.signals sig
        WHERE s.user.id = :userId
          AND sig.type = :signalType
          AND s.startedAt BETWEEN :from AND :to
        ORDER BY s.startedAt DESC
        """)
Page<RecordingSession> findFiltered(
        @Param("userId") UUID userId,
        @Param("signalType") SignalType signalType,
        @Param("from") Instant from,
        @Param("to") Instant to,
        Pageable pageable);
```

`s.user.id` — Hibernate traverses the `@ManyToOne` relationship. In SQL this becomes `WHERE s.user_id = ?` — Hibernate is smart enough to NOT join the users table since you only need the FK.

`BETWEEN :from AND :to` — date range filter. `Instant` maps to `TIMESTAMPTZ` in Postgres.

## `@Transactional` in the service

```java
@Transactional
public void ingest(IngestBatchRequest request, User user) { ... }

@Transactional(readOnly = true)
public SessionRecordingResponse getSession(UUID sessionId) { ... }
```

**`@Transactional`** wraps the method in a database transaction. If anything throws a `RuntimeException`, all changes (inserts, updates) are rolled back. This matters for ingest — you don't want to store half a batch of events.

**`readOnly = true`** — tells Hibernate: "this transaction only reads data." Hibernate skips **dirty checking** (comparing every loaded entity's current state vs. its original snapshot). With 10,000 events, that's a meaningful optimization.

Hibernate dirty checking: every time you load an entity, Hibernate takes a snapshot. At flush time, it compares every field of every loaded entity to its snapshot. If any field changed, it generates an UPDATE. `readOnly = true` disables this whole mechanism.

## Behavioral analysis — pure Java

`BehaviorAnalysisService` is a plain `@Service` with no database access. It takes raw event DTOs and returns signal entities. This is important design:

- **Testable without Spring context** — the unit test (`BehaviorAnalysisServiceTest`) is plain JUnit, no `@SpringBootTest`, no mocks, runs in milliseconds
- **No side effects** — it's a pure function: events in → signals out
- **Swappable** — you could replace the implementation without touching the service or controller

### Sliding window pattern

Each detection algorithm uses a **sliding window**:

```java
for (int i = 0; i <= clicks.size() - RAGE_CLICK_COUNT; i++) {
    RecordedEventDto anchor = clicks.get(i);
    for (int j = i + 1; j < clicks.size(); j++) {
        RecordedEventDto candidate = clicks.get(j);
        long dt = candidate.timestamp() - anchor.timestamp();
        if (dt > RAGE_CLICK_WINDOW_MS) break;  // window exceeded, stop
        // ... check spatial constraint ...
    }
}
```

Start at each event, look forward within a time window, count matches. `break` when the window expires. This is O(n·k) where k is the typical window size, not O(n²) — the inner loop usually breaks early.

## Controller patterns

### `ProblemDetail` for error responses

`RecordingExceptionHandler` is scoped to the recording package only:

```java
@RestControllerAdvice(basePackageClasses = SessionRecordingController.class)
public class RecordingExceptionHandler {

    @ExceptionHandler(SessionNotFoundException.class)
    public ProblemDetail handleNotFound(SessionNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }
}
```

`basePackageClasses = SessionRecordingController.class` tells Spring to apply this advice only to controllers in the same package as `SessionRecordingController`. Without it, `@RestControllerAdvice` is global — it would catch `SessionNotFoundException` thrown anywhere in the app.

`ProblemDetail` is a Spring 6+ implementation of [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) — a standard JSON shape for API errors:
```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Recording session not found: 550e8400-..."
}
```

Better than returning a bare string or a custom error DTO — any HTTP client can parse this.

### `SecurityContextHolder` instead of `@AuthenticationPrincipal`

```java
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
    user = userSyncService.syncFromJwt(jwt);
}
```

We use `SecurityContextHolder` instead of `@AuthenticationPrincipal Jwt jwt` because in a `@WebMvcTest` with the OAuth2 auto-config excluded (which is required because the test slice can't wire the JWT decoder), Spring tries to data-bind the `Jwt` parameter from the request body, which fails. `SecurityContextHolder` works in all contexts.

The `instanceof Jwt jwt` is Java 16+ **pattern matching** — it checks the type AND casts in one expression, replacing:
```java
if (auth.getPrincipal() instanceof Jwt) {
    Jwt jwt = (Jwt) auth.getPrincipal();
}
```

## Index annotations

```java
@Table(name = "recording_sessions", indexes = {
    @Index(name = "idx_recording_session_user", columnList = "user_id"),
    @Index(name = "idx_recording_session_started", columnList = "started_at")
})
```

Since we use `ddl-auto=update`, Hibernate creates these indexes automatically. In production with Flyway, you'd write the `CREATE INDEX` yourself — but the annotation still serves as documentation of what you expect to be indexed.

Why these indexes:
- `user_id` — filtering sessions by user is a primary query pattern
- `started_at` — sorting/filtering by date is the other primary pattern
- `session_id + sequence_number` on events — replaying events in order for a given session
- `type` on signals — `findBySignalType()` filters `WHERE sig.type = ?` across all sessions; without this index that's a full table scan on `recording_signals`

Without indexes, these queries do full table scans. With millions of events, that's the difference between 2ms and 20 seconds.

## Good practices demonstrated

| Practice                            | Where                         | Why                                                       |
| ----------------------------------- | ----------------------------- | --------------------------------------------------------- |
| Feature packaging                   | `recording/` package          | Related code together, scales better than layer packaging |
| Records for DTOs                    | `dto/` package                | Immutable, concise, no Lombok needed                      |
| Lombok for entities                 | `entity/` package             | Hibernate needs mutability                                |
| `FetchType.LAZY` everywhere         | All `@ManyToOne`              | Prevents N+1 queries                                      |
| `@Transactional(readOnly = true)`   | Read methods                  | Skips dirty checking                                      |
| Parameterized JPQL                  | Repository queries            | Prevents SQL injection                                    |
| JSONB for flexible schemas          | `data` and `metadata` columns | Avoids 50-column tables                                   |
| Pure logic in services              | `BehaviorAnalysisService`     | Testable without Spring                                   |
| `ProblemDetail` errors              | Exception handler             | RFC 7807 standard                                         |
| `CascadeType.ALL` + `orphanRemoval` | Parent-child relationships    | Lifecycle managed by parent                               |
| Sliding time windows                | Signal detection              | Efficient O(n·k) algorithms                               |
