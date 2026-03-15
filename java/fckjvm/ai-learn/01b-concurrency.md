# Phase 1b — Java concurrency

Concurrency is core Java, not a framework feature. Spring's `@Async` and virtual threads build on these primitives.

## Threads basics

```java
// create and start a thread
Thread thread = new Thread(() -> {
    System.out.println("Running on: " + Thread.currentThread().getName());
});
thread.start();  // non-blocking — returns immediately
thread.join();   // blocks until thread finishes

// virtual thread (Java 21+)
Thread.startVirtualThread(() -> {
    System.out.println("Virtual: " + Thread.currentThread().isVirtual());
});
```

## synchronized — mutual exclusion

Prevents multiple threads from accessing shared state simultaneously.

```java
public class Counter {
    private int count = 0;

    // only one thread can execute this at a time (per instance)
    public synchronized void increment() {
        count++;  // not atomic without synchronization
    }

    public synchronized int getCount() {
        return count;
    }
}

// or use a synchronized block for finer control
public void update(String key, String value) {
    synchronized (this) {  // lock on `this` — same as synchronized method
        map.put(key, value);
    }
}
```

Problems with `synchronized`:
- Blocks waiting threads entirely (no timeout)
- Can deadlock if locks are acquired in different orders
- Coarse-grained — locks the whole method/block

## Atomic classes — lock-free thread safety

For simple counters/flags, `java.util.concurrent.atomic` avoids locking entirely.

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicBoolean;

AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();          // atomic ++counter
counter.getAndAdd(5);               // atomic fetch-and-add
counter.compareAndSet(5, 10);       // CAS — only sets if current value is 5

AtomicBoolean flag = new AtomicBoolean(false);
flag.set(true);

AtomicReference<String> ref = new AtomicReference<>("initial");
ref.compareAndSet("initial", "updated");
```

Use atomics when you just need a thread-safe counter or flag. Use `synchronized`/locks when you need multi-step atomic operations.

## ExecutorService — thread pools

Don't create threads manually. Use executors to manage a pool.

```java
import java.util.concurrent.*;

// fixed pool — reuses N threads
ExecutorService pool = Executors.newFixedThreadPool(4);

// submit tasks (returns Future)
Future<String> future = pool.submit(() -> {
    Thread.sleep(1000);
    return "done";
});

// get result (blocks until complete)
String result = future.get();                    // blocks forever
String result = future.get(5, TimeUnit.SECONDS); // blocks with timeout

// submit fire-and-forget
pool.execute(() -> System.out.println("no return value"));

// ALWAYS shut down when done
pool.shutdown();                     // no new tasks, finish existing
pool.awaitTermination(10, TimeUnit.SECONDS);
```

Common pool types:

```java
Executors.newFixedThreadPool(4);          // 4 threads, tasks queue when all busy
Executors.newCachedThreadPool();          // grows as needed, reuses idle threads (60s timeout)
Executors.newSingleThreadExecutor();      // 1 thread, tasks execute sequentially
Executors.newVirtualThreadPerTaskExecutor(); // Java 21+ — one virtual thread per task
```

**In real apps**: prefer `newVirtualThreadPerTaskExecutor()` for I/O-bound work (Java 21+), or `newFixedThreadPool()` for CPU-bound work.

## CompletableFuture — async pipelines

Like JS `Promise`. Chain transformations, combine results, handle errors — all non-blocking.

```java
import java.util.concurrent.CompletableFuture;

// start async work
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    return fetchFromDb();  // runs on ForkJoinPool.commonPool() by default
});

// chain transformations (like .then() in JS)
CompletableFuture<Integer> result = future
    .thenApply(s -> s.toUpperCase())        // transform value
    .thenApply(String::length);             // chain another transform

// side effects (no return value)
future.thenAccept(s -> System.out.println("Got: " + s));

// compose with another async operation (like flatMap)
CompletableFuture<String> chained = future
    .thenCompose(userId -> fetchUserDetails(userId));  // returns another CompletableFuture
```

### Combining multiple futures

```java
CompletableFuture<String> userFuture = CompletableFuture.supplyAsync(() -> fetchUser());
CompletableFuture<String> orderFuture = CompletableFuture.supplyAsync(() -> fetchOrders());

// combine two results
CompletableFuture<String> combined = userFuture.thenCombine(orderFuture,
    (user, orders) -> user + " has " + orders);

// wait for all to complete
CompletableFuture<Void> all = CompletableFuture.allOf(userFuture, orderFuture);
all.join();  // blocks until both done

// wait for first to complete
CompletableFuture<Object> any = CompletableFuture.anyOf(userFuture, orderFuture);
```

### Error handling

```java
CompletableFuture<String> result = CompletableFuture.supplyAsync(() -> {
        if (true) throw new RuntimeException("boom");
        return "ok";
    })
    .exceptionally(ex -> "fallback: " + ex.getMessage())  // like .catch()
    .thenApply(String::toUpperCase);

// or handle both success and failure
future.handle((value, exception) -> {
    if (exception != null) return "error";
    return value.toUpperCase();
});
```

### Run on a specific executor

```java
ExecutorService myPool = Executors.newFixedThreadPool(4);

CompletableFuture.supplyAsync(() -> slowWork(), myPool)
    .thenApplyAsync(result -> moreWork(result), myPool);  // also on myPool
```

## Concurrent collections

Thread-safe collections from `java.util.concurrent`. Use instead of `synchronized` + regular collections.

```java
// ConcurrentHashMap — thread-safe map, fine-grained locking
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
map.put("key", 1);
map.computeIfAbsent("key", k -> expensiveCompute(k));  // atomic compute-if-absent
map.merge("key", 1, Integer::sum);                      // atomic merge

// CopyOnWriteArrayList — safe for reads, copies on write (good for read-heavy, write-rare)
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
list.add("item");  // creates a new internal array copy

// BlockingQueue — producer-consumer pattern
BlockingQueue<String> queue = new LinkedBlockingQueue<>(100);  // bounded
queue.put("task");      // blocks if full
String task = queue.take();  // blocks if empty

// ConcurrentLinkedQueue — non-blocking, unbounded
ConcurrentLinkedQueue<String> q = new ConcurrentLinkedQueue<>();
q.offer("item");
String item = q.poll();   // null if empty
```

### When to use what

| Need | Use |
|------|-----|
| Thread-safe map | `ConcurrentHashMap` |
| Thread-safe list (mostly reads) | `CopyOnWriteArrayList` |
| Producer-consumer pattern | `BlockingQueue` |
| Thread-safe counter | `AtomicInteger` / `AtomicLong` |
| Thread-safe set | `ConcurrentHashMap.newKeySet()` |
| Immutable (no concurrency issue) | `List.of()`, `Map.of()`, `Collections.unmodifiable*()` |

## Locks — finer control than synchronized

`java.util.concurrent.locks` offers more flexible locking.

```java
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

// ReentrantLock — like synchronized but with tryLock, timeout
ReentrantLock lock = new ReentrantLock();

lock.lock();
try {
    // critical section
} finally {
    lock.unlock();  // ALWAYS unlock in finally
}

// try with timeout — avoid deadlocks
if (lock.tryLock(2, TimeUnit.SECONDS)) {
    try {
        // got the lock
    } finally {
        lock.unlock();
    }
} else {
    // couldn't get lock in time — handle gracefully
}

// ReadWriteLock — multiple readers OR one writer
ReadWriteLock rwLock = new ReentrantReadWriteLock();

// many threads can read concurrently
rwLock.readLock().lock();
try { /* read */ } finally { rwLock.readLock().unlock(); }

// only one thread can write (blocks all readers too)
rwLock.writeLock().lock();
try { /* write */ } finally { rwLock.writeLock().unlock(); }
```

## Common patterns

### Thread-safe lazy initialization (double-checked locking)

```java
public class Singleton {
    private static volatile Singleton instance;  // volatile = visibility guarantee

    public static Singleton getInstance() {
        if (instance == null) {                  // first check (no lock)
            synchronized (Singleton.class) {
                if (instance == null) {           // second check (with lock)
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}

// simpler alternative — enum singleton
public enum Singleton {
    INSTANCE;
    public void doWork() { ... }
}
```

### Producer-consumer with BlockingQueue

```java
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(50);

// producer thread
executor.submit(() -> {
    while (running) {
        Task task = generateTask();
        queue.put(task);  // blocks if queue is full (backpressure)
    }
});

// consumer threads
for (int i = 0; i < 4; i++) {
    executor.submit(() -> {
        while (running) {
            Task task = queue.take();  // blocks if queue is empty
            process(task);
        }
    });
}
```

## Key gotchas

- **`volatile`** — guarantees visibility across threads but NOT atomicity. Use for flags, not counters.
- **`HashMap` is not thread-safe** — use `ConcurrentHashMap` or synchronize externally.
- **`ArrayList` is not thread-safe** — use `CopyOnWriteArrayList`, `Collections.synchronizedList()`, or synchronize.
- **Don't call `thread.stop()`** — it's deprecated and unsafe. Use a volatile boolean flag to signal stopping.
- **`Future.get()` blocks** — prefer `CompletableFuture` with `thenApply`/`thenCompose` for non-blocking chains.
- **Thread pool sizing** — CPU-bound: `Runtime.getRuntime().availableProcessors()` threads. I/O-bound: more threads (or virtual threads).
