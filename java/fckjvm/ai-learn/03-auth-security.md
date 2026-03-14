# Phase 3 — Auth & Security

## Spring Security basics

Spring Security is a **servlet filter chain** that intercepts every HTTP request before it reaches your controllers.

```
HTTP Request → Security Filter Chain → Controller
              ├── CORS filter
              ├── CSRF filter
              ├── Authentication filter (who are you?)
              ├── Authorization filter (are you allowed?)
              └── ... (15+ filters by default)
```

Add the dependency:

```kotlin
implementation("org.springframework.boot:spring-boot-starter-security")
```

**Warning**: adding this locks down EVERYTHING. Every endpoint returns 401 until you configure it.

### SecurityFilterChain — configuring security

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // disable for stateless APIs (explained below)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            );
        return http.build();
    }
}
```

Rules are evaluated top-to-bottom — first match wins. Be specific first, broad last.

### @PreAuthorize — method-level security

```java
@Configuration
@EnableMethodSecurity  // enable @PreAuthorize
public class SecurityConfig { ... }

@Service
public class UserService {

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(UUID id) { ... }

    @PreAuthorize("#userId == authentication.principal.id")
    public User getProfile(UUID userId) { ... }  // users can only view their own profile
}
```

### Getting the current user

```java
@GetMapping("/me")
public User getCurrentUser(@AuthenticationPrincipal Jwt jwt) {
    String externalId = jwt.getSubject();  // Keycloak's "sub" claim
    return userService.findByExternalId(externalId);
}
```

## Keycloak + OIDC

Your app is a **Resource Server** — it doesn't handle login. Keycloak handles authentication, issues JWTs, and your app validates them.

```
1. User → Keycloak login page → authenticates → gets JWT
2. User → Your API (Authorization: Bearer <jwt>) → Spring validates JWT → processes request
```

Add dependency:

```kotlin
implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
```

Configure:

```properties
# application.properties
spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8180/realms/fckjvm
# Spring fetches Keycloak's public keys from this URL and validates JWT signatures
```

Security config for JWT:

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/public/**").permitAll()
            .requestMatchers("/api/**").authenticated()
            .anyRequest().permitAll()
        )
        .oauth2ResourceServer(oauth2 -> oauth2
            .jwt(Customizer.withDefaults())  // validate JWTs against Keycloak
        );
    return http.build();
}
```

### User sync flow (using your externalId field)

```java
@Service
public class UserSyncService {
    private final UserRepository userRepository;

    public User syncFromJwt(Jwt jwt) {
        String externalId = jwt.getSubject();                    // Keycloak UUID
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("preferred_username");

        return userRepository.findByExternalId(externalId)
            .map(user -> {
                user.setLastLoginAt(Instant.now());              // returning user
                return userRepository.save(user);
            })
            .orElseGet(() -> {
                User user = new User();                          // first login
                user.setExternalId(externalId);
                user.setEmail(email);
                user.setDisplayName(name);
                return userRepository.save(user);
            });
    }
}
```

### Keycloak role mapping

Keycloak puts roles in `realm_access.roles` in the JWT. Spring doesn't read that by default — you need a converter:

```java
@Bean
public JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter grantedAuthorities = new JwtGrantedAuthoritiesConverter();

    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
        // extract roles from Keycloak's JWT structure
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        List<String> roles = (List<String>) realmAccess.get("roles");

        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
            .collect(Collectors.toList());
    });
    return converter;
}
```

Then in security config:

```java
.oauth2ResourceServer(oauth2 -> oauth2
    .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
)
```

## CORS config

Cross-Origin Resource Sharing — needed when your frontend (e.g. `localhost:3000`) calls your API (`localhost:8080`).

### Per-controller

```java
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/users")
public class UserController { ... }
```

### Global (preferred)

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:3000", "https://fckjvm.com")
            .allowedMethods("GET", "POST", "PUT", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

### With Spring Security (must be configured in the filter chain too)

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .cors(Customizer.withDefaults())  // picks up the CorsConfigurer bean
        .csrf(csrf -> csrf.disable())
        // ...
    ;
    return http.build();
}
```

## CSRF

**Cross-Site Request Forgery** — an attack where a malicious site tricks a user's browser into making requests to your API using their cookies.

### When to disable

**Stateless APIs (JWT in `Authorization` header)** → disable CSRF.
- No cookies = no CSRF risk. The browser can't auto-attach an `Authorization` header.

```java
.csrf(csrf -> csrf.disable())
```

### When it matters

**Cookie-based sessions** (traditional server-rendered apps, or if you store JWT in cookies) → keep CSRF enabled.

Spring Security generates a CSRF token, your frontend must include it in forms/requests:

```java
// Spring auto-includes token in server-rendered forms via Thymeleaf
// For SPAs, read the XSRF-TOKEN cookie and send it as X-XSRF-TOKEN header

.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
)
```

**Rule of thumb**: if your auth is purely header-based JWTs (like with Keycloak), disable CSRF. If you use cookies for auth, keep it on.
