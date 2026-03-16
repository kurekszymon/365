# Phase 1 — Java the language

You know programming. This is about Java's specific tools and idioms.

## Java records

Records are immutable data classes. One line replaces a class with fields, constructor, getters, `equals()`, `hashCode()`, `toString()`.

```java
// old way — 40 lines of boilerplate
public class UserDto {
    private final String email;
    private final String name;

    public UserDto(String email, String name) {
        this.email = email;
        this.name = name;
    }

    public String email() { return email; }
    public String name() { return name; }
    // + equals, hashCode, toString...
}

// record — one line
public record UserDto(String email, String name) {}
```

Key facts:
- Fields are `final` — no setters, immutable by design
- Accessors are `email()` not `getEmail()` (no `get` prefix)
- You can add custom constructors for validation:

```java
public record UserDto(String email, String name) {
    // compact constructor — runs before field assignment
    public UserDto {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("email required");
        }
    }
}
```

- Records can implement interfaces but can't extend classes
- Perfect for: DTOs, API responses, value objects, method return types when you need multiple values

```java
// returning multiple values
public record PageResult<T>(List<T> items, long totalCount) {}

// use it
PageResult<String> result = search("alice");
result.items();       // List<String>
result.totalCount();  // long
```

## Optionals

`Optional<T>` is Java's way of saying "this might not have a value". Any method that might not return a result should return `Optional<T>` instead of null.

```java
// BAD — null checks everywhere
String value = map.get("key");
if (value != null) {
    return value.toUpperCase();
}
return "UNKNOWN";

// GOOD — Optional
Optional<String> value = Optional.ofNullable(map.get("key"));
return value.map(String::toUpperCase).orElse("UNKNOWN");
```

Creating Optionals:

```java
Optional<String> present = Optional.of("hello");          // must be non-null
Optional<String> maybe   = Optional.ofNullable(getValue()); // null-safe
Optional<String> empty   = Optional.empty();
```

Common operations:

```java
Optional<String> opt = Optional.of("hello");

// get value or throw
String val = opt.orElseThrow();                                        // NoSuchElementException
String val = opt.orElseThrow(() -> new IllegalStateException("missing")); // custom exception

// get value or default
String val = opt.orElse("fallback");

// get value or compute default (lazy)
String val = opt.orElseGet(() -> computeDefault());

// transform if present
Optional<Integer> len = opt.map(String::length);

// chain optionals
Optional<String> city = getUser().map(User::getAddress).map(Address::getCity);

// do something if present
opt.ifPresent(v -> System.out.println("Got: " + v));

// do something if present, else do something else
opt.ifPresentOrElse(
    v -> System.out.println("Found: " + v),
    () -> System.out.println("Not found")
);

// filter
Optional<String> long_ = opt.filter(s -> s.length() > 3);
```

Rules:
- **Never** call `.get()` without checking — use `orElseThrow()` instead
- **Never** use Optional as a field type or method parameter — it's for return types only
- **Don't** do `if (opt.isPresent()) opt.get()` — use `map`/`orElseThrow` instead

## Streams API

Functional pipelines over collections. Like JS `array.map().filter()` but more powerful.

```java
List<String> names = List.of("Alice", "Bob", "Charlie", "Anna");

// filter + map + collect
List<String> result = names.stream()
    .filter(n -> n.startsWith("A"))       // Alice, Anna
    .map(String::toUpperCase)             // ALICE, ANNA
    .sorted()                             // ALICE, ANNA
    .toList();                            // List<String>

// find first match
Optional<String> first = names.stream()
    .filter(n -> n.length() > 4)
    .findFirst();                         // Optional["Alice"]

// check conditions
boolean anyMatch = names.stream().anyMatch(n -> n.equals("Bob"));  // true
boolean allLong  = names.stream().allMatch(n -> n.length() > 2);   // true

// count
long count = names.stream().filter(n -> n.startsWith("A")).count(); // 2

// reduce
int totalLength = names.stream()
    .mapToInt(String::length)
    .sum();                               // 19
```

With objects:

```java
List<Person> people = List.of(
    new Person("Alice", 30, "NYC"),
    new Person("Bob", 25, "LA"),
    new Person("Charlie", 35, "NYC")
);

// get names of people over 28
List<String> names = people.stream()
    .filter(p -> p.age() > 28)
    .map(Person::name)
    .toList();

// group by city
Map<String, List<Person>> byCity = people.stream()
    .collect(Collectors.groupingBy(Person::city));

// to map (key=name, value=person)
Map<String, Person> byName = people.stream()
    .collect(Collectors.toMap(Person::name, p -> p));

// joining strings
String csv = people.stream()
    .map(Person::name)
    .collect(Collectors.joining(", "));   // "Alice, Bob, Charlie"

// flatMap — flatten nested collections
List<String> allHobbies = people.stream()
    .flatMap(p -> p.hobbies().stream())   // Stream<String>
    .toList();
```

Method references — shorthand for lambdas:

```java
// these are equivalent:
.map(s -> s.toUpperCase())
.map(String::toUpperCase)

// instance method reference
.map(p -> p.name())
.map(Person::name)

// constructor reference
.map(s -> new StringBuilder(s))
.map(StringBuilder::new)
```

## Sealed classes & pattern matching

Sealed classes restrict which classes can extend them. Combined with pattern matching, you get exhaustive `switch`.

```java
// define a closed hierarchy
public sealed interface ApiResponse permits Success, NotFound, Error {}
public record Success(Object data) implements ApiResponse {}
public record NotFound(String message) implements ApiResponse {}
public record Error(int code, String message) implements ApiResponse {}

// pattern matching switch — compiler ensures all cases are covered
public String handle(ApiResponse response) {
    return switch (response) {
        case Success s   -> "OK: " + s.data();
        case NotFound nf -> "404: " + nf.message();
        case Error e     -> e.code() + ": " + e.message();
        // no default needed — sealed, so compiler knows all cases
    };
}
```

With guards:

```java
return switch (response) {
    case Error e when e.code() >= 500 -> "Server error: " + e.message();
    case Error e                      -> "Client error: " + e.message();
    case Success s                    -> "OK";
    case NotFound nf                  -> "Not found";
};
```

Pattern matching for `instanceof` (no more cast-after-check):

```java
// old
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// new — variable bound in the check
if (obj instanceof String s) {
    System.out.println(s.length());
}
```

## Generics

Type parameters. You'll encounter them everywhere: `List<T>`, `Optional<T>`, `Map<K,V>`, framework APIs.

```java
// generic class
public class Box<T> {
    private T value;

    public Box(T value) { this.value = value; }
    public T get() { return value; }
}

Box<String> strBox = new Box<>("hello");
Box<Integer> intBox = new Box<>(42);
```

Bounded types — restrict what `T` can be:

```java
// T must implement Comparable
public <T extends Comparable<T>> T max(T a, T b) {
    return a.compareTo(b) >= 0 ? a : b;
}

max("apple", "banana"); // "banana"
max(1, 2);              // 2
```

Wildcards — used in method parameters:

```java
// ? extends — read-only (covariant): "anything that IS a Number"
public double sum(List<? extends Number> numbers) {
    return numbers.stream().mapToDouble(Number::doubleValue).sum();
}
sum(List.of(1, 2, 3));       // List<Integer> works
sum(List.of(1.5, 2.5));      // List<Double> works

// ? super — write-only (contravariant): "anything that is a PARENT of Integer"
public void addNumbers(List<? super Integer> list) {
    list.add(1);
    list.add(2);
}
```

The rule: **PECS** — Producer Extends, Consumer Super.
- Reading from it? `? extends T`
- Writing to it? `? super T`

Real-world generic patterns:

```java
// generic method — infer T from arguments
public <T> List<T> repeat(T item, int count) {
    return Collections.nCopies(count, item);
}
List<String> xs = repeat("hello", 3);  // T inferred as String

// multiple bounds
public <T extends Comparable<T> & Serializable> T clamp(T val, T min, T max) {
    if (val.compareTo(min) < 0) return min;
    if (val.compareTo(max) > 0) return max;
    return val;
}
```

You'll encounter generics everywhere in frameworks: `List<T>`, `Map<K,V>`, `Optional<T>`, `CompletableFuture<T>`. Understanding them makes library APIs readable.

## Annotations & reflection

Annotations are metadata you attach to code. The language provides the mechanism; frameworks like Spring use it heavily.

### Defining annotations

```java
@Target(ElementType.TYPE)           // where it can go: TYPE, METHOD, FIELD, PARAMETER...
@Retention(RetentionPolicy.RUNTIME) // when it's available: SOURCE, CLASS, or RUNTIME
public @interface Cacheable {
    String value() default "";       // annotation element (accessed as .value())
    int ttlSeconds() default 60;
}

// using it
@Cacheable(value = "users", ttlSeconds = 300)
public class UserService { ... }
```

`@Retention` levels:
- `SOURCE` — discarded by compiler (e.g. `@Override`, `@SuppressWarnings`)
- `CLASS` — in bytecode but not available at runtime (default)
- `RUNTIME` — available via reflection (required for frameworks to read them)

`@Target` options: `TYPE`, `METHOD`, `FIELD`, `PARAMETER`, `CONSTRUCTOR`, `LOCAL_VARIABLE`, `ANNOTATION_TYPE`

### Reading annotations with reflection

```java
// check if a class has an annotation
if (UserService.class.isAnnotationPresent(Cacheable.class)) {
    Cacheable c = UserService.class.getAnnotation(Cacheable.class);
    System.out.println(c.value());       // "users"
    System.out.println(c.ttlSeconds());  // 300
}

// inspect methods
for (Method method : UserService.class.getDeclaredMethods()) {
    if (method.isAnnotationPresent(Deprecated.class)) {
        System.out.println(method.getName() + " is deprecated");
    }
}
```

### Reflection basics

Reflection lets you inspect and manipulate classes, methods, and fields at runtime:

```java
Class<?> clazz = Class.forName("com.example.UserService");

// create instance
Object instance = clazz.getDeclaredConstructor().newInstance();

// call method by name
Method method = clazz.getMethod("getById", UUID.class);
Object result = method.invoke(instance, someId);

// access private field
Field field = clazz.getDeclaredField("cache");
field.setAccessible(true);  // bypass private
Object value = field.get(instance);
```

Reflection is slow and bypasses compile-time safety. You almost never write reflection code yourself — but understanding it explains *how* frameworks work. Spring reads `@Service`, `@Controller`, etc. via reflection at startup to discover and wire your beans. This mechanism is covered in Phase 2.
