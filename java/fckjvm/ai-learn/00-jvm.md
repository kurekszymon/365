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

1 Java thread = 1 OS thread. Heavy (~1MB stack each). Spring Boot default: Tomcat creates a thread pool (default 200 threads) → each request gets a thread → if all 200 are busy, requests queue.

```
Request → Tomcat thread pool (200 threads) → controller → service → DB call (thread blocks)
```

Problem: if you have slow I/O (DB, HTTP calls), threads sit idle waiting. 200 threads = 200 concurrent requests max.

### Virtual threads (Project Loom, Java 21+)

Lightweight threads managed by the JVM. Millions possible. When a virtual thread blocks on I/O, the JVM parks it and reuses the carrier (OS) thread.

```properties
# enable in Spring Boot — that's it
spring.threads.virtual.enabled=true
```

```
Request → virtual thread → controller → service → DB call (virtual thread parks, OS thread freed)
                                                          → DB responds → virtual thread resumes
```

Same blocking code, massively better concurrency. No reactive/async needed.

### When to use which

| Scenario                   | Use                                                |
| -------------------------- | -------------------------------------------------- |
| Default Spring Boot app    | Virtual threads (just enable the flag)             |
| CPU-bound computation      | Platform threads (virtual threads don't help here) |
| Need reactive backpressure | WebFlux                                            |
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

In Spring Boot actuator:

```properties
management.endpoints.web.exposure.include=threaddump
# GET /actuator/threaddump
```
