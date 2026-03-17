package com.kurek.fckjvm.recording;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurek.fckjvm.entity.User;
import com.kurek.fckjvm.recording.dto.IngestBatchRequest;
import com.kurek.fckjvm.recording.dto.RecordedEventDto;
import com.kurek.fckjvm.recording.dto.SessionMetadataDto;
import com.kurek.fckjvm.recording.event.EventType;
import com.kurek.fckjvm.recording.repository.RecordingEventRepository;
import com.kurek.fckjvm.recording.repository.RecordingSessionRepository;
import com.kurek.fckjvm.recording.repository.RecordingSignalRepository;
import com.kurek.fckjvm.recording.service.SessionRecordingService;
import com.kurek.fckjvm.repository.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@Testcontainers
@TestPropertySource(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.security.oauth2.server.resource.autoconfigure.servlet.OAuth2ResourceServerAutoConfiguration",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class SessionRecordingIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @SuppressWarnings("resource")
    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:8-alpine"))
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @MockitoBean
    @SuppressWarnings("unused")
    private JwtDecoder jwtDecoder;

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private RecordingSessionRepository sessionRepository;

    @Autowired
    private RecordingEventRepository eventRepository;

    @Autowired
    private RecordingSignalRepository signalRepository;

    @Autowired
    private SessionRecordingService recordingService;

    @Autowired
    private UserRepository userRepository;

    @AfterEach
    void cleanup() {
        signalRepository.deleteAll();
        eventRepository.deleteAll();
        sessionRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ── Full round-trip ────────────────────────────────────
    @Test
    void ingestAndRetrieve_fullRoundTrip() throws Exception {
        UUID sessionId = UUID.randomUUID();
        long now = System.currentTimeMillis();

        var request = new IngestBatchRequest(sessionId,
                List.of(
                        new RecordedEventDto(EventType.PAGE_LOAD, now,
                                Map.of("url", "https://example.com")),
                        new RecordedEventDto(EventType.MOUSE_CLICK, now + 1000,
                                Map.of("x", 100, "y", 200, "selector", "#btn")),
                        new RecordedEventDto(EventType.SCROLL, now + 2000,
                                Map.of("scrollY", 500))),
                new SessionMetadataDto("https://example.com", "TestAgent/1.0", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/sessions/recordings/{id}", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sessionId.toString()))
                .andExpect(jsonPath("$.initialUrl").value("https://example.com"))
                .andExpect(jsonPath("$.userAgent").value("TestAgent/1.0"))
                .andExpect(jsonPath("$.screenWidth").value(1920))
                .andExpect(jsonPath("$.screenHeight").value(1080))
                .andExpect(jsonPath("$.eventCount").value(3))
                .andExpect(jsonPath("$.events", hasSize(3)))
                .andExpect(jsonPath("$.events[0].type").value("PAGE_LOAD"))
                .andExpect(jsonPath("$.events[1].type").value("MOUSE_CLICK"))
                .andExpect(jsonPath("$.events[2].type").value("SCROLL"));
    }

    // ── Multi-batch append ─────────────────────────────────
    @Test
    void multipleBatches_appendToSameSession() throws Exception {
        UUID sessionId = UUID.randomUUID();
        long now = System.currentTimeMillis();

        var batch1 = new IngestBatchRequest(sessionId,
                List.of(
                        new RecordedEventDto(EventType.PAGE_LOAD, now,
                                Map.of("url", "https://example.com")),
                        new RecordedEventDto(EventType.MOUSE_MOVE, now + 500,
                                Map.of("x", 50, "y", 50))),
                new SessionMetadataDto("https://example.com", "TestAgent/1.0", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batch1)))
                .andExpect(status().isAccepted());

        var batch2 = new IngestBatchRequest(sessionId,
                List.of(
                        new RecordedEventDto(EventType.MOUSE_CLICK, now + 3000,
                                Map.of("x", 200, "y", 300, "selector", "#link")),
                        new RecordedEventDto(EventType.SCROLL, now + 4000,
                                Map.of("scrollY", 800))),
                new SessionMetadataDto("https://example.com", "TestAgent/1.0", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batch2)))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/sessions/recordings/{id}", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventCount").value(4))
                .andExpect(jsonPath("$.events", hasSize(4)))
                .andExpect(jsonPath("$.events[0].type").value("PAGE_LOAD"))
                .andExpect(jsonPath("$.events[1].type").value("MOUSE_MOVE"))
                .andExpect(jsonPath("$.events[2].type").value("MOUSE_CLICK"))
                .andExpect(jsonPath("$.events[3].type").value("SCROLL"));

        assertThat(sessionRepository.count()).isEqualTo(1);
    }

    // ── Duration & timestamps ──────────────────────────────
    @Test
    void sessionDuration_calculatedFromEvents() throws Exception {
        UUID sessionId = UUID.randomUUID();
        long now = System.currentTimeMillis();

        var request = new IngestBatchRequest(sessionId,
                List.of(
                        new RecordedEventDto(EventType.PAGE_LOAD, now, Map.of()),
                        new RecordedEventDto(EventType.PAGE_UNLOAD, now + 5000, Map.of())),
                new SessionMetadataDto("https://example.com", "TestAgent", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/sessions/recordings/{id}", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.durationMs").value(5000))
                .andExpect(jsonPath("$.startedAt").isNotEmpty())
                .andExpect(jsonPath("$.endedAt").isNotEmpty());
    }

    // ── Signal detection: rage clicks ──────────────────────
    @Test
    void rageClickDetection_endToEnd() throws Exception {
        UUID sessionId = UUID.randomUUID();
        long now = System.currentTimeMillis();

        var request = new IngestBatchRequest(sessionId,
                List.of(
                        new RecordedEventDto(EventType.MOUSE_CLICK, now,
                                Map.of("x", 100, "y", 200, "selector", "#btn")),
                        new RecordedEventDto(EventType.MOUSE_CLICK, now + 100,
                                Map.of("x", 102, "y", 201, "selector", "#btn")),
                        new RecordedEventDto(EventType.MOUSE_CLICK, now + 200,
                                Map.of("x", 99, "y", 199, "selector", "#btn")),
                        new RecordedEventDto(EventType.MOUSE_CLICK, now + 300,
                                Map.of("x", 101, "y", 200, "selector", "#btn"))),
                new SessionMetadataDto("https://example.com/form", "TestAgent", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/sessions/recordings/{id}/signals", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[?(@.type == 'RAGE_CLICK')]").exists());

        mockMvc.perform(get("/api/sessions/recordings/{id}", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.signals[?(@.type == 'RAGE_CLICK')]").exists());
    }

    // ── Signal detection: dead clicks ──────────────────────
    @Test
    void deadClickDetection_endToEnd() throws Exception {
        UUID sessionId = UUID.randomUUID();
        long now = System.currentTimeMillis();

        var request = new IngestBatchRequest(sessionId,
                List.of(
                        new RecordedEventDto(EventType.MOUSE_CLICK, now,
                                Map.of("x", 300, "y", 400, "selector", ".inactive")),
                        new RecordedEventDto(EventType.MOUSE_MOVE, now + 2000,
                                Map.of("x", 310, "y", 420))),
                new SessionMetadataDto("https://example.com", "TestAgent", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/sessions/recordings/{id}/signals", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].type").value("DEAD_CLICK"));
    }

    // ── Pagination ─────────────────────────────────────────
    @Test
    void listSessions_paginatedResults() throws Exception {
        for (int i = 0; i < 3; i++) {
            long ts = System.currentTimeMillis() + (i * 10_000);
            var request = new IngestBatchRequest(UUID.randomUUID(),
                    List.of(new RecordedEventDto(EventType.PAGE_LOAD, ts,
                            Map.of("url", "https://example.com/page-" + i))),
                    new SessionMetadataDto("https://example.com/page-" + i, "TestAgent", 1920, 1080));

            mockMvc.perform(post("/api/sessions/recordings/ingest")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isAccepted());
        }

        mockMvc.perform(get("/api/sessions/recordings")
                .param("page", "0")
                .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    // ── Filter by signal type ──────────────────────────────
    @Test
    void filterBySignalType() throws Exception {
        long now = System.currentTimeMillis();

        // Session with rage clicks → produces RAGE_CLICK signal
        UUID rageSessionId = UUID.randomUUID();
        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new IngestBatchRequest(rageSessionId,
                        List.of(
                                new RecordedEventDto(EventType.MOUSE_CLICK, now,
                                        Map.of("x", 100, "y", 200, "selector", "#btn")),
                                new RecordedEventDto(EventType.MOUSE_CLICK, now + 100,
                                        Map.of("x", 102, "y", 201, "selector", "#btn")),
                                new RecordedEventDto(EventType.MOUSE_CLICK, now + 200,
                                        Map.of("x", 99, "y", 199, "selector", "#btn"))),
                        new SessionMetadataDto("https://example.com/rage", "TestAgent", 1920, 1080)))))
                .andExpect(status().isAccepted());

        // Session without signals
        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new IngestBatchRequest(UUID.randomUUID(),
                        List.of(new RecordedEventDto(EventType.PAGE_LOAD, now, Map.of())),
                        new SessionMetadataDto("https://example.com/normal", "TestAgent", 1920, 1080)))))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/sessions/recordings")
                .param("hasSignal", "RAGE_CLICK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(rageSessionId.toString()));
    }

    // ── Filter by date range ───────────────────────────────
    @Test
    void filterByDateRange() throws Exception {
        long now = System.currentTimeMillis();

        // Old session — 2 days ago
        long oldTs = now - 172_800_000;
        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new IngestBatchRequest(UUID.randomUUID(),
                        List.of(new RecordedEventDto(EventType.PAGE_LOAD, oldTs, Map.of())),
                        new SessionMetadataDto("https://example.com/old", "TestAgent", 1920, 1080)))))
                .andExpect(status().isAccepted());

        // Recent session — now
        UUID newSessionId = UUID.randomUUID();
        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new IngestBatchRequest(newSessionId,
                        List.of(new RecordedEventDto(EventType.PAGE_LOAD, now, Map.of())),
                        new SessionMetadataDto("https://example.com/new", "TestAgent", 1920, 1080)))))
                .andExpect(status().isAccepted());

        Instant from = Instant.ofEpochMilli(now - 3_600_000);
        Instant to = Instant.ofEpochMilli(now + 3_600_000);

        mockMvc.perform(get("/api/sessions/recordings")
                .param("from", from.toString())
                .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(newSessionId.toString()));
    }

    // ── Filter by user ─────────────────────────────────────
    @Test
    void filterByUser() throws Exception {
        User user = new User();
        user.setEmail("testuser@example.com");
        user.setDisplayName("Test User");
        user = userRepository.save(user);

        long now = System.currentTimeMillis();
        UUID sessionId = UUID.randomUUID();

        // Ingest via service directly — so we can attach the user
        recordingService.ingest(
                new IngestBatchRequest(sessionId,
                        List.of(new RecordedEventDto(EventType.PAGE_LOAD, now, Map.of())),
                        new SessionMetadataDto("https://example.com", "TestAgent", 1920, 1080)),
                user);

        // Another session without a user (via HTTP — mockUser principal is not Jwt, so user=null)
        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new IngestBatchRequest(UUID.randomUUID(),
                        List.of(new RecordedEventDto(EventType.PAGE_LOAD, now, Map.of())),
                        new SessionMetadataDto("https://example.com/anon", "TestAgent", 1920, 1080)))))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/sessions/recordings")
                .param("userId", user.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].id").value(sessionId.toString()));
    }

    // ── Error handling ─────────────────────────────────────
    @Test
    void getUnknownSession_returns404ProblemDetail() throws Exception {
        mockMvc.perform(get("/api/sessions/recordings/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail", containsString("Recording session not found")));
    }

    // ── DB state verification ──────────────────────────────
    @Test
    void eventsStoredWithCorrectSequenceNumbers() throws Exception {
        UUID sessionId = UUID.randomUUID();
        long now = System.currentTimeMillis();

        var request = new IngestBatchRequest(sessionId,
                List.of(
                        new RecordedEventDto(EventType.PAGE_LOAD, now, Map.of()),
                        new RecordedEventDto(EventType.MOUSE_CLICK, now + 100,
                                Map.of("x", 10, "y", 20, "selector", "a")),
                        new RecordedEventDto(EventType.SCROLL, now + 200, Map.of("scrollY", 100))),
                new SessionMetadataDto("https://example.com", "TestAgent", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        var events = eventRepository.findBySessionIdOrderBySequenceNumberAsc(sessionId);
        assertThat(events).hasSize(3);
        assertThat(events.get(0).getSequenceNumber()).isEqualTo(1);
        assertThat(events.get(1).getSequenceNumber()).isEqualTo(2);
        assertThat(events.get(2).getSequenceNumber()).isEqualTo(3);

        // Append another batch — sequence numbers continue
        var batch2 = new IngestBatchRequest(sessionId,
                List.of(new RecordedEventDto(EventType.PAGE_UNLOAD, now + 5000, Map.of())),
                new SessionMetadataDto("https://example.com", "TestAgent", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batch2)))
                .andExpect(status().isAccepted());

        var allEvents = eventRepository.findBySessionIdOrderBySequenceNumberAsc(sessionId);
        assertThat(allEvents).hasSize(4);
        assertThat(allEvents.get(3).getSequenceNumber()).isEqualTo(4);
    }

    @Test
    void jsonbData_persistedAndRetrievedCorrectly() throws Exception {
        UUID sessionId = UUID.randomUUID();
        long now = System.currentTimeMillis();

        Map<String, Object> clickData = Map.of("x", 150, "y", 300, "selector", "#submit-form");

        var request = new IngestBatchRequest(sessionId,
                List.of(new RecordedEventDto(EventType.MOUSE_CLICK, now, clickData)),
                new SessionMetadataDto("https://example.com", "TestAgent", 1920, 1080));

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        mockMvc.perform(get("/api/sessions/recordings/{id}", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events[0].data.x").value(150))
                .andExpect(jsonPath("$.events[0].data.y").value(300))
                .andExpect(jsonPath("$.events[0].data.selector").value("#submit-form"));
    }
}
