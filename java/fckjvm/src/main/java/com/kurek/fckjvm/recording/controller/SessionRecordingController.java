package com.kurek.fckjvm.recording.controller;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kurek.fckjvm.entity.User;
import com.kurek.fckjvm.recording.dto.IngestBatchRequest;
import com.kurek.fckjvm.recording.dto.SessionRecordingResponse;
import com.kurek.fckjvm.recording.dto.SessionSignalDto;
import com.kurek.fckjvm.recording.dto.SessionSummaryDto;
import com.kurek.fckjvm.recording.event.SignalType;
import com.kurek.fckjvm.recording.service.SessionRecordingService;
import com.kurek.fckjvm.service.UserSyncService;

@RestController
@RequestMapping("/api/sessions/recordings")
public class SessionRecordingController {

    private final SessionRecordingService recordingService;
    private final UserSyncService userSyncService;

    public SessionRecordingController(SessionRecordingService recordingService,
            UserSyncService userSyncService) {
        this.recordingService = recordingService;
        this.userSyncService = userSyncService;
    }

    /**
     * Ingest a batch of recording events. Called repeatedly by the frontend SDK
     * (every 2-5s).
     */
    @PostMapping("/ingest")
    public ResponseEntity<Void> ingest(@RequestBody IngestBatchRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = null;
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            user = userSyncService.syncFromJwt(jwt);
        }
        recordingService.ingest(request, user);
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    /**
     * Get full session recording for replay — all events + detected signals.
     */
    @GetMapping("/{sessionId}")
    public SessionRecordingResponse getSession(@PathVariable UUID sessionId) {
        return recordingService.getSession(sessionId);
    }

    /**
     * List sessions with optional filters.
     */
    @GetMapping
    public Page<SessionSummaryDto> listSessions(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) SignalType hasSignal,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            Pageable pageable) {
        return recordingService.listSessions(userId, hasSignal, from, to, pageable);
    }

    /**
     * Get behavioral signals detected for a specific session.
     */
    @GetMapping("/{sessionId}/signals")
    public List<SessionSignalDto> getSignals(@PathVariable UUID sessionId) {
        return recordingService.getSignals(sessionId);
    }
}
