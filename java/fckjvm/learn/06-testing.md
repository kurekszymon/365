# Phase 6 — Testing (deeper)

## Testcontainers

Spin up real Docker containers (Postgres, Redis, Kafka) for integration tests. No more H2 quirks.

Add dependency:

```kotlin
testImplementation("org.springframework.boot:spring-boot-testcontainers")
testImplementation("org.testcontainers:postgresql")
```

```java
@SpringBootTest
@Testcontainers
class UserServiceIntegrationTest {

    @Container
    @ServiceConnection  // Spring auto-configures datasource from this container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void createUserPersistsToDatabase() {
        var request = new CreateUserRequest("alice@test.com", "Alice");
        User user = userService.create(request);

        assertThat(user.getId()).isNotNull();
        assertThat(userRepository.findByEmail("alice@test.com")).isPresent();
    }

    @Test
    void createDuplicateEmailThrows() {
        var request = new CreateUserRequest("alice@test.com", "Alice");
        userService.create(request);

        assertThatThrownBy(() -> userService.create(request))
            .isInstanceOf(ConflictException.class);
    }
}
```

`@ServiceConnection` is Spring Boot 3.1+ magic — detects the container type and sets `spring.datasource.url`, `username`, `password` automatically.

### Shared container for speed

```java
// one container reused across all test classes
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {

    @Bean
    @ServiceConnection
    public PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>("postgres:17");
    }
}

// use in tests
@SpringBootTest
@Import(TestcontainersConfig.class)
class SomeTest { ... }
```

## @DataJpaTest

Sliced test — only loads JPA components (repositories, entities, Hibernate). No web layer, no services.

```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;  // JPA helper for test setup

    @Test
    void findByEmailReturnsUser() {
        // given
        User user = new User();
        user.setEmail("alice@test.com");
        user.setDisplayName("Alice");
        entityManager.persistAndFlush(user);

        // when
        Optional<User> found = userRepository.findByEmail("alice@test.com");

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getDisplayName()).isEqualTo("Alice");
    }

    @Test
    void findByEmailReturnsEmptyForUnknown() {
        assertThat(userRepository.findByEmail("nobody@test.com")).isEmpty();
    }
}
```

By default uses an embedded DB (H2). Combine with Testcontainers for real Postgres:

```java
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    // now tests run against real Postgres
}
```

## MockMvc vs WebTestClient

### MockMvc — servlet-based, synchronous (what you're using)

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private UserService userService;

    @Test
    void getUser() throws Exception {
        when(userService.getById(any())).thenReturn(someUser());

        mockMvc.perform(get("/api/users/{id}", userId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("alice@test.com"));
    }
}
```

### WebTestClient — reactive-style, fluent API (works for both MVC and WebFlux)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserControllerIntegrationTest {
    @Autowired private WebTestClient webTestClient;

    @Test
    void getUser() {
        webTestClient.get().uri("/api/users/{id}", userId)
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.email").isEqualTo("alice@test.com");
    }
}
```

**Use MockMvc** for unit-style controller tests (`@WebMvcTest`). **Use WebTestClient** for full integration tests that need a running server.

## Test fixtures / factories

Reusable test data builders to avoid repeating setup in every test.

```java
// test helper — lives in src/test/java
public class TestFixtures {

    public static User aUser() {
        User user = new User();
        user.setEmail("test@example.com");
        user.setDisplayName("Test User");
        user.setExternalId("ext-" + UUID.randomUUID());
        return user;
    }

    public static User aUser(String email) {
        User user = aUser();
        user.setEmail(email);
        return user;
    }

    public static CreateUserRequest aCreateUserRequest() {
        return new CreateUserRequest("new@example.com", "New User");
    }
}

// usage in tests
@Test
void findByEmail() {
    entityManager.persistAndFlush(TestFixtures.aUser("alice@test.com"));
    assertThat(userRepository.findByEmail("alice@test.com")).isPresent();
}
```

Builder pattern for more complex entities:

```java
public class UserBuilder {
    private String email = "test@example.com";
    private String displayName = "Test User";
    private String externalId = UUID.randomUUID().toString();

    public UserBuilder email(String email) { this.email = email; return this; }
    public UserBuilder displayName(String name) { this.displayName = name; return this; }

    public User build() {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setExternalId(externalId);
        return user;
    }

    public static UserBuilder aUser() { return new UserBuilder(); }
}

// usage
User admin = UserBuilder.aUser().email("admin@test.com").displayName("Admin").build();
```

## Contract testing

Ensure your API contract doesn't break for consumers. Most useful in microservice architectures.

### Spring Cloud Contract

Provider defines contracts, Spring generates tests + stubs:

```groovy
// contract definition (Groovy DSL)
Contract.make {
    request {
        method 'GET'
        url '/api/users/123'
    }
    response {
        status 200
        body([
            id: "123",
            email: "alice@test.com"
        ])
        headers {
            contentType(applicationJson())
        }
    }
}
```

Spring generates a test that hits your controller and verifies the response matches. Consumer team gets a stub JAR with WireMock stubs.

### Pact (alternative)

Consumer-driven: frontend team writes the contract, backend team verifies it.

For most projects, **skip contract testing until you have multiple teams consuming your API**. Unit + integration tests cover single-team projects fine.
