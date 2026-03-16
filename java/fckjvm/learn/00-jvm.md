# JVM stuff to know along the way

Not a phase — absorb these concepts gradually as you work.

## Heap & GC

The JVM manages memory automatically. You allocate objects, the garbage collector (GC) frees them.

```
JVM Memory
├── Heap (objects live here)
│   ├── Young generation (short-lived objects — most get collected here)
│   └── Old generation (long-lived objects promoted from young gen)
├── Metaspace (class metadata, replaces PermGen from Java 8)
└── Stack (per-thread, local variables, method calls)
```

### Key flags

```bash
java -Xms512m    # initial heap size (start with this much)
     -Xmx2g     # maximum heap size (never grow beyond this)
     -jar app.jar
```

Rule of thumb: set `-Xms` = `-Xmx` in production to avoid heap resizing.

### GC algorithms

| GC               | Flag                   | Best for                                     |
| ---------------- | ---------------------- | -------------------------------------------- |
| **G1** (default) | `-XX:+UseG1GC`         | General purpose, balanced throughput/latency |
| **ZGC**          | `-XX:+UseZGC`          | Low latency (<1ms pauses), large heaps       |
| **Shenandoah**   | `-XX:+UseShenandoahGC` | Similar to ZGC, OpenJDK                      |
| **Serial**       | `-XX:+UseSerialGC`     | Small heaps, single-threaded apps            |

For most Spring Boot apps, **G1 (default) is fine**. Switch to ZGC if you see GC pause spikes.

### When GC runs

GC triggers automatically — you don't call it. It runs when the JVM decides it needs memory.

```java
public class GcDemo {

    public static void main(String[] args) {
        // --- Young generation GC (Minor GC) ---
        // These strings are created in the Young Gen (Eden space).
        // They become garbage immediately after the loop
        // because nothing holds a reference to them.
        for (int i = 0; i < 100_000; i++) {
            String temp = "item-" + i;  // allocates, then immediately unreachable
        }
        // At some point here (or before), Minor GC fires — collects Eden,
        // promotes surviving objects to Survivor space. Usually < 10ms.
    }
}

// --- Old generation GC (Major/Full GC) ---
// Objects that survive several Minor GCs get promoted to Old Gen.
public class CacheDemo {
    // This cache lives as long as the object lives — ends up in Old Gen.
    private final Map<String, byte[]> longLivedCache = new ConcurrentHashMap<>();

    public void fillCache(String key) {
        // 1MB chunks added on each call — stays in Old Gen
        longLivedCache.put(key, new byte[1024 * 1024]);
        // When Old Gen fills up → Major GC fires.
        // G1 tries to do this concurrently; older collectors (Serial, Parallel)
        // stop the world for seconds.
        System.out.println("cached " + longLivedCache.size() + " entries");
    }
}
```

What's actually happening in memory:

```
Eden (Young Gen)
  → object allocated here first
  → Minor GC: unreachable objects deleted, survivors → Survivor space
  → after N minor GCs: survivors → Old Gen (promoted)

Old Gen
  → long-lived objects (caches, static fields, singletons)
  → Major GC fires when Old Gen fills up — more expensive

Metaspace
  → class definitions live here (loaded classes, annotation metadata)
  → grows as the app loads more classes at startup
  → GC rarely touches this
```

Practical triggers:
- **Minor GC**: Eden space full (happens constantly in a busy app — usually harmless)
- **Major/Full GC**: Old Gen near capacity, or you call `System.gc()` (don't)
- **OOM**: heap completely full → `java.lang.OutOfMemoryError: Java heap space`

You can force GC to observe it (never do this in production):

```java
// allocate a lot
List<byte[]> chunks = new ArrayList<>();
for (int i = 0; i < 100; i++) {
    chunks.add(new byte[1024 * 1024]);  // 100MB total
}
chunks = null;  // all 100 chunks now unreachable

System.gc();  // hint to JVM (not guaranteed) — watch GC log for the collection
```

### Reading GC logs

Enable with `-Xlog:gc*:file=gc.log:time` and you'll see lines like:

```
[2.431s] GC(3) Pause Young (Normal) 24M->8M(256M) 4.231ms
         │     │             │       │    │  │      └── pause time (stop-the-world)
         │     │             │       │    │  └── total heap size
         │     │             │       │    └── heap after GC
         │     │             │       └── heap before GC
         │     │             └── reason
         │     └── GC type (Young = Minor, Mixed/Full = Major)
         └── time since JVM start

[14.012s] GC(12) Pause Full (System.gc()) 180M->45M(256M) 312.445ms
                              └── someone called System.gc() — 312ms pause, bad
```

What to watch for:
- **Young GC < 10ms** — totally normal, ignore
- **Full GC > 100ms** — investigate. Probably heap too small or a leak
- **Frequent Full GCs** — heap is undersized or there's a memory leak
- **Heap after GC growing over time** (8M → 12M → 18M → 25M...) — classic leak signal

### Common memory leaks in Java apps

```java
// LEAK 1: unbounded cache with no eviction
public class BadCache {
    private final Map<String, Object> cache = new HashMap<>();  // grows forever

    public Object get(String key) {
        return cache.computeIfAbsent(key, k -> expensiveComputation(k));
        // fix: use Caffeine with maximumSize, or a cache library with TTL
    }
}

// LEAK 2: collections that grow without bound
public class LeakyHistory {
    private final List<String> history = new ArrayList<>();  // unbounded

    public void record(String event) {
        history.add(event);  // never cleared
        // fix: use a bounded collection (e.g. LinkedList with size check), or persist to DB
    }
}

// LEAK 3: ThreadLocal not cleaned up (especially with thread pools)
private static final ThreadLocal<Map<String, String>> ctx = new ThreadLocal<>();

public void handle(String userId) {
    ctx.set(Map.of("userId", userId));
    try {
        // ... do work
    } finally {
        ctx.remove();  // MUST remove — thread gets reused in the pool
    }
}
```

The practical debugging path:
1. Watch GC logs — heap-after-GC trending up?
2. Take a heap dump: `jcmd <pid> GC.heap_dump /tmp/dump.hprof`
3. Open in Eclipse MAT or VisualVM — shows what objects hold all the memory
4. Find the dominator tree — the object retaining the most memory is your leak

### Monitoring

```bash
# enable GC logging
java -Xlog:gc*:file=gc.log:time -jar app.jar

# connect to running JVM
jconsole                    # GUI — heap, threads, MBeans
jvisualvm                   # GUI — profiling, heap dumps, thread dumps
jcmd <pid> GC.heap_info     # CLI — heap summary
jcmd <pid> Thread.print     # CLI — thread dump
```

### JFR — Java Flight Recorder (production-safe profiling)

```bash
# record 60s of runtime data
jcmd <pid> JFR.start duration=60s filename=recording.jfr

# open in JDK Mission Control (jmc) for analysis
```

JFR has near-zero overhead — safe to run in production. Shows: allocations, GC pauses, lock contention, I/O waits, hot methods.

## Classpath

How Java finds classes at runtime. Gradle builds the classpath from your dependencies.

### Gradle dependency scopes

```kotlin
dependencies {
    implementation("...")      // compile + runtime (your app code sees it)
    api("...")                 // compile + runtime + exposed to consumers (library projects only)
    compileOnly("...")         // compile only, not in runtime JAR (e.g. Lombok — generates code at compile)
    runtimeOnly("...")         // runtime only, not visible at compile (e.g. JDBC driver — used via reflection)
    annotationProcessor("...")  // runs during compilation (e.g. Lombok, MapStruct)
    testImplementation("...")  // test compile + runtime
    testRuntimeOnly("...")     // test runtime only
}
```

### Inspecting dependencies

```bash
# full dependency tree
./gradlew dependencies --configuration runtimeClasspath

# find where a specific dependency comes from
./gradlew dependencyInsight --dependency jackson-core

# check for version conflicts
./gradlew dependencies | grep -i "CONFLICT"
```

### Version conflicts

When two libraries need different versions of the same dependency, Gradle picks the highest version by default. Override with:

```kotlin
configurations.all {
    resolutionStrategy {
        force("com.fasterxml.jackson.core:jackson-databind:2.18.0")
    }
}
```

Or exclude a transitive dependency:

```kotlin
implementation("some-library") {
    exclude(group = "commons-logging")  // we use SLF4J instead
}
```

## JAR structure

### Regular JAR

```
mylib.jar
├── META-INF/MANIFEST.MF
└── com/kurek/fckjvm/
    ├── FckjvmApplication.class
    └── ...
```

### Spring Boot fat JAR (what `bootJar` produces)

```
fckjvm-0.0.1-SNAPSHOT.jar
├── META-INF/MANIFEST.MF          (Main-Class: Spring Boot launcher)
├── BOOT-INF/
│   ├── classes/                   (your compiled code)
│   │   └── com/kurek/fckjvm/...
│   └── lib/                       (ALL dependency JARs — hundreds of them)
│       ├── spring-boot-4.0.3.jar
│       ├── hibernate-core-7.0.x.jar
│       └── ...
└── org/springframework/boot/loader/  (Spring's custom classloader)
```

The fat JAR is self-contained — `java -jar app.jar` works anywhere with a JVM. No need to install dependencies separately.

```bash
# build it
./gradlew bootJar
# output: build/libs/fckjvm-0.0.1-SNAPSHOT.jar

# run it
java -jar build/libs/fckjvm-0.0.1-SNAPSHOT.jar

# inspect contents
jar tf build/libs/fckjvm-0.0.1-SNAPSHOT.jar | head -30
```

## Thread model

### Platform threads (traditional)

1 Java thread = 1 OS thread. Heavy (~1MB stack each). Web servers create a thread pool (e.g. Tomcat's default: 200 threads) → each request gets a thread → if all 200 are busy, requests queue.

```
Request → thread pool (200 threads) → handler → service → DB call (thread blocks)
```

Problem: if you have slow I/O (DB, HTTP calls), threads sit idle waiting. 200 threads = 200 concurrent requests max.

### Virtual threads (Project Loom, Java 21+)

Lightweight threads managed by the JVM. Millions possible. When a virtual thread blocks on I/O, the JVM parks it and reuses the carrier (OS) thread.

```java
// create virtual threads directly
Thread.startVirtualThread(() -> {
    // this runs on a virtual thread
    var result = slowHttpCall();  // blocks, but carrier thread is freed
});

// or use the executor
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> slowDbQuery());
    executor.submit(() -> slowHttpCall());
}
```

```
Request → virtual thread → handler → service → DB call (virtual thread parks, OS thread freed)
                                                        → DB responds → virtual thread resumes
```

Same blocking code, massively better concurrency. No reactive/async needed. Spring Boot can use virtual threads for all request handling — covered in Phase 5.

### When to use which

| Scenario                   | Use                                                |
| -------------------------- | -------------------------------------------------- |
| Default web app (Java 21+) | Virtual threads (enable in your framework)         |
| CPU-bound computation      | Platform threads (virtual threads don't help here) |
| Need reactive backpressure | Reactive stack (e.g. WebFlux)                      |
| Legacy Java < 21           | Platform threads                                   |

### Thread debugging

```bash
# dump all threads
jcmd <pid> Thread.print

# or in code
Thread.getAllStackTraces().forEach((thread, stack) -> {
    System.out.println(thread.getName() + " - " + thread.getState());
});
```

In web frameworks with actuator endpoints (e.g. Spring Boot):

```properties
management.endpoints.web.exposure.include=threaddump
# GET /actuator/threaddump
```
