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
public record SearchResult(List<User> users, long totalCount) {}

// use it
SearchResult result = userService.search("alice");
result.users();      // List<User>
result.totalCount();  // long
```

## Optionals

`Optional<T>` is Java's way of saying "this might not have a value". Spring Data repos return `Optional` from `findBy*` methods.

```java
// BAD — null checks everywhere
User user = userRepository.findByEmail(email);
if (user != null) {
    return user.getDisplayName();
}
return "Unknown";

// GOOD — Optional
Optional<User> user = userRepository.findByEmail(email);
return user.map(User::getDisplayName).orElse("Unknown");
```

Common operations:

```java
Optional<User> opt = userRepository.findByEmail("alice@test.com");

// get value or throw
User user = opt.orElseThrow();                                    // NoSuchElementException
User user = opt.orElseThrow(() -> new UserNotFoundException(email)); // custom exception

// get value or default
User user = opt.orElse(defaultUser);

// get value or compute default
User user = opt.orElseGet(() -> createDefaultUser());

// transform if present
Optional<String> name = opt.map(User::getDisplayName);

// chain optionals
Optional<String> city = opt.map(User::getAddress).map(Address::getCity);

// do something if present
opt.ifPresent(u -> log.info("Found user: {}", u.getEmail()));

// do something if present, else do something else
opt.ifPresentOrElse(
    u -> log.info("Found: {}", u.getEmail()),
    () -> log.warn("User not found")
);

// filter
Optional<User> admin = opt.filter(u -> u.getRole().equals("ADMIN"));
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
List<User> users = userRepository.findAll();

// get emails of active users
List<String> emails = users.stream()
    .filter(u -> u.getLastLoginAt() != null)
    .map(User::getEmail)
    .toList();

// group by display name
Map<String, List<User>> byName = users.stream()
    .collect(Collectors.groupingBy(User::getDisplayName));

// to map (key=email, value=user)
Map<String, User> byEmail = users.stream()
    .collect(Collectors.toMap(User::getEmail, u -> u));

// joining strings
String csv = users.stream()
    .map(User::getEmail)
    .collect(Collectors.joining(", "));   // "a@b.com, c@d.com"

// flatMap — flatten nested collections
List<Order> allOrders = users.stream()
    .flatMap(u -> u.getOrders().stream()) // Stream<Order>
    .toList();
```

Method references — shorthand for lambdas:

```java
// these are equivalent:
.map(s -> s.toUpperCase())
.map(String::toUpperCase)

// instance method reference
.map(u -> u.getEmail())
.map(User::getEmail)

// constructor reference
.map(s -> new UserDto(s))
.map(UserDto::new)
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

Type parameters. You'll encounter them everywhere in Spring (`JpaRepository<User, UUID>`, `Optional<T>`, `ResponseEntity<T>`).

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

Spring examples you'll see:

```java
// Spring Data
public interface JpaRepository<T, ID> { ... }
// T = entity type, ID = primary key type

// ResponseEntity
ResponseEntity<UserDto> response = ResponseEntity.ok(new UserDto("a@b.com", "Alice"));
ResponseEntity<List<UserDto>> listResponse = ResponseEntity.ok(users);
ResponseEntity<Void> noContent = ResponseEntity.noContent().build();
```

## Annotations & reflection

Annotations are metadata. Spring reads them at startup via reflection to configure your app.

```java
// defining an annotation
@Target(ElementType.TYPE)           // can be placed on classes
@Retention(RetentionPolicy.RUNTIME) // available at runtime (Spring needs this)
public @interface MyService {
    String value() default "";
}

// using it
@MyService("userService")
public class UserService { ... }
```

What Spring does at startup:
1. Component scan — finds all classes with `@Component`, `@Service`, `@Controller`, `@Repository`, `@Configuration`
2. Reads annotations via reflection: `class.isAnnotationPresent(Service.class)`
3. Creates instances (beans) and puts them in the **Application Context** (the DI container)
4. Resolves dependencies — looks at constructor params, finds matching beans, injects them

```java
// Spring sees this:
@RestController
public class HelloController {
    private final HelloService helloService;

    public HelloController(HelloService helloService) {
        this.helloService = helloService;  // Spring injects the bean
    }
}

// Spring internally does (simplified):
HelloService helloService = new HelloService();           // create bean
HelloController controller = new HelloController(helloService); // inject
applicationContext.register(controller);                  // store in context
```

The annotation hierarchy:

```
@Component                      ← base "this is a bean" marker
├── @Service                    ← semantic: business logic
├── @Repository                 ← semantic: data access (adds exception translation)
├── @Controller / @RestController  ← semantic: HTTP endpoint
└── @Configuration              ← semantic: contains @Bean definitions
```

They're all `@Component` under the hood — the different names are for clarity and occasional framework behavior (like `@Repository`'s exception translation).

`@Bean` — manual bean registration in `@Configuration` classes:

```java
@Configuration
public class AppConfig {

    @Bean  // Spring calls this method once, stores the result as a bean
    public RestClient restClient() {
        return RestClient.builder()
            .baseUrl("https://api.example.com")
            .build();
    }
}

// now you can inject RestClient anywhere
@Service
public class ExternalApiService {
    private final RestClient restClient;

    public ExternalApiService(RestClient restClient) {
        this.restClient = restClient;  // the bean from AppConfig
    }
}
```
