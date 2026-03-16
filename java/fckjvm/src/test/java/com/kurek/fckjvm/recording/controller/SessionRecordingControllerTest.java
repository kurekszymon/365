package com.kurek.fckjvm.recording.controller;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kurek.fckjvm.entity.User;
import com.kurek.fckjvm.recording.dto.IngestBatchRequest;
import com.kurek.fckjvm.recording.dto.RecordedEventDto;
import com.kurek.fckjvm.recording.dto.SessionMetadataDto;
import com.kurek.fckjvm.recording.dto.SessionRecordingResponse;
import com.kurek.fckjvm.recording.dto.SessionSignalDto;
import com.kurek.fckjvm.recording.event.EventType;
import com.kurek.fckjvm.recording.event.SignalType;
import com.kurek.fckjvm.recording.service.SessionRecordingService;
import com.kurek.fckjvm.service.UserSyncService;

@WebMvcTest(SessionRecordingController.class)
@WithMockUser
@TestPropertySource(properties
        = "spring.autoconfigure.exclude=org.springframework.boot.security.oauth2.server.resource.autoconfigure.servlet.OAuth2ResourceServerAutoConfiguration"
)
class SessionRecordingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private SessionRecordingService recordingService;

    @MockitoBean
    private UserSyncService userSyncService;

    @Test
    void ingest_returns202() throws Exception {
        when(userSyncService.syncFromJwt(any())).thenReturn(new User());

        var request = new IngestBatchRequest(
                UUID.randomUUID(),
                List.of(new RecordedEventDto(EventType.MOUSE_CLICK, System.currentTimeMillis(),
                        Map.of("x", 100, "y", 200, "selector", "#btn"))),
                new SessionMetadataDto("https://example.com", "TestAgent", 1920, 1080)
        );

        mockMvc.perform(post("/api/sessions/recordings/ingest")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());

        verify(recordingService).ingest(any(), any());
    }

    @Test
    void getSession_returnsSessionWithEvents() throws Exception {
        UUID sessionId = UUID.randomUUID();
        var response = new SessionRecordingResponse(
                sessionId, null, "https://example.com", "TestAgent",
                1920, 1080, Instant.now(), Instant.now(), 5000, 3,
                List.of(new RecordedEventDto(EventType.PAGE_LOAD, System.currentTimeMillis(), Map.of())),
                List.of(new SessionSignalDto(SignalType.RAGE_CLICK, System.currentTimeMillis(),
                        Map.of("x", 100.0, "y", 200.0)))
        );

        when(recordingService.getSession(sessionId)).thenReturn(response);

        mockMvc.perform(get("/api/sessions/recordings/{id}", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sessionId.toString()))
                .andExpect(jsonPath("$.events").isArray())
                .andExpect(jsonPath("$.signals[0].type").value("RAGE_CLICK"));
    }

    @Test
    void getSignals_returnsSignalsForSession() throws Exception {
        UUID sessionId = UUID.randomUUID();
        var signals = List.of(
                new SessionSignalDto(SignalType.DEAD_CLICK, System.currentTimeMillis(),
                        Map.of("selector", "#broken"))
        );

        when(recordingService.getSignals(sessionId)).thenReturn(signals);

        mockMvc.perform(get("/api/sessions/recordings/{id}/signals", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("DEAD_CLICK"));
    }
}
