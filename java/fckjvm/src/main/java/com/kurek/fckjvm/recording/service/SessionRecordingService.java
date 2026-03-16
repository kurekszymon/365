package com.kurek.fckjvm.recording.service;

import com.kurek.fckjvm.recording.dto.*;
import com.kurek.fckjvm.recording.entity.RecordingEvent;
import com.kurek.fckjvm.recording.entity.RecordingSession;
import com.kurek.fckjvm.recording.entity.RecordingSignal;
import com.kurek.fckjvm.recording.event.SignalType;
import com.kurek.fckjvm.recording.repository.RecordingEventRepository;
import com.kurek.fckjvm.recording.repository.RecordingSessionRepository;
import com.kurek.fckjvm.recording.repository.RecordingSignalRepository;
import com.kurek.fckjvm.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SessionRecordingService {

    private final RecordingSessionRepository sessionRepository;
    private final RecordingEventRepository eventRepository;
    private final RecordingSignalRepository signalRepository;
    private final BehaviorAnalysisService behaviorAnalysis;

    public SessionRecordingService(RecordingSessionRepository sessionRepository,
            RecordingEventRepository eventRepository,
            RecordingSignalRepository signalRepository,
            BehaviorAnalysisService behaviorAnalysis) {
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
        this.signalRepository = signalRepository;
        this.behaviorAnalysis = behaviorAnalysis;
    }

    /**
     * Ingest a batch of events. Creates the session on first batch, appends
     * events and runs behavioral analysis on subsequent batches.
     */
    @Transactional
    public void ingest(IngestBatchRequest request, User user) {
        RecordingSession session = sessionRepository.findById(request.sessionId())
                .orElseGet(() -> createSession(request, user));

        long seqBase = eventRepository.findMaxSequenceNumber(request.sessionId());

        List<RecordedEventDto> eventDtos = request.events();
        for (int i = 0; i < eventDtos.size(); i++) {
            RecordedEventDto dto = eventDtos.get(i);
            RecordingEvent entity = new RecordingEvent();
            entity.setSession(session);
            entity.setSequenceNumber(seqBase + i + 1);
            entity.setType(dto.type());
            entity.setTimestamp(dto.timestamp());
            entity.setData(dto.data());
            eventRepository.save(entity);
        }

        // Update session bookkeeping
        if (!eventDtos.isEmpty()) {
            long lastTs = eventDtos.getLast().timestamp();
            session.setEndedAt(Instant.ofEpochMilli(lastTs));
            session.setDurationMs(lastTs - session.getStartedAt().toEpochMilli());
        }
        session.setEventCount(session.getEventCount() + eventDtos.size());

        // Run behavioral analysis on the incoming batch
        List<RecordingSignal> newSignals = behaviorAnalysis.analyze(session, eventDtos);
        signalRepository.saveAll(newSignals);

        sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public SessionRecordingResponse getSession(UUID sessionId) {
        RecordingSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SessionNotFoundException(sessionId));

        List<RecordingEvent> events = eventRepository.findBySessionIdOrderBySequenceNumberAsc(sessionId);
        List<RecordingSignal> signals = signalRepository.findBySessionIdOrderByTimestampAsc(sessionId);

        return new SessionRecordingResponse(
                session.getId(),
                session.getUser() != null ? session.getUser().getId() : null,
                session.getInitialUrl(),
                session.getUserAgent(),
                session.getScreenWidth(),
                session.getScreenHeight(),
                session.getStartedAt(),
                session.getEndedAt(),
                session.getDurationMs(),
                session.getEventCount(),
                events.stream().map(e -> new RecordedEventDto(e.getType(), e.getTimestamp(), e.getData())).toList(),
                signals.stream().map(s -> new SessionSignalDto(s.getType(), s.getTimestamp(), s.getMetadata())).toList()
        );
    }

    @Transactional(readOnly = true)
    public Page<SessionSummaryDto> listSessions(UUID userId, SignalType signalType,
            Instant from, Instant to, Pageable pageable) {
        Page<RecordingSession> page;

        if (userId != null && signalType != null && from != null && to != null) {
            page = sessionRepository.findFiltered(userId, signalType, from, to, pageable);
        } else if (signalType != null) {
            page = sessionRepository.findBySignalType(signalType, pageable);
        } else if (userId != null) {
            page = sessionRepository.findByUserIdOrderByStartedAtDesc(userId, pageable);
        } else if (from != null && to != null) {
            page = sessionRepository.findByStartedAtBetweenOrderByStartedAtDesc(from, to, pageable);
        } else {
            page = sessionRepository.findAll(pageable);
        }

        return page.map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public List<SessionSignalDto> getSignals(UUID sessionId) {
        if (!sessionRepository.existsById(sessionId)) {
            throw new SessionNotFoundException(sessionId);
        }
        return signalRepository.findBySessionIdOrderByTimestampAsc(sessionId)
                .stream()
                .map(s -> new SessionSignalDto(s.getType(), s.getTimestamp(), s.getMetadata()))
                .toList();
    }

    // ── Private helpers ────────────────────────────────────
    private RecordingSession createSession(IngestBatchRequest request, User user) {
        RecordingSession session = new RecordingSession();
        session.setId(request.sessionId());
        session.setUser(user);

        SessionMetadataDto meta = request.metadata();
        if (meta != null) {
            session.setInitialUrl(meta.url());
            session.setUserAgent(meta.userAgent());
            session.setScreenWidth(meta.screenWidth());
            session.setScreenHeight(meta.screenHeight());
        }

        if (!request.events().isEmpty()) {
            session.setStartedAt(Instant.ofEpochMilli(request.events().getFirst().timestamp()));
        } else {
            session.setStartedAt(Instant.now());
        }
        session.setEventCount(0);

        return sessionRepository.save(session);
    }

    private SessionSummaryDto toSummary(RecordingSession session) {
        List<SignalType> signalTypes = signalRepository
                .findBySessionIdOrderByTimestampAsc(session.getId())
                .stream()
                .map(RecordingSignal::getType)
                .distinct()
                .toList();

        return new SessionSummaryDto(
                session.getId(),
                session.getUser() != null ? session.getUser().getId() : null,
                session.getInitialUrl(),
                session.getStartedAt(),
                session.getEndedAt(),
                session.getDurationMs(),
                session.getEventCount(),
                signalTypes
        );
    }
}
