package com.kurek.fckjvm.recording.repository;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kurek.fckjvm.recording.entity.RecordingSession;
import com.kurek.fckjvm.recording.event.SignalType;

public interface RecordingSessionRepository extends JpaRepository<RecordingSession, UUID> {

    Page<RecordingSession> findByUserIdOrderByStartedAtDesc(UUID userId, Pageable pageable);

    Page<RecordingSession> findByStartedAtBetweenOrderByStartedAtDesc(
            Instant from, Instant to, Pageable pageable);

    @Query("""
            SELECT DISTINCT s FROM RecordingSession s
            JOIN s.signals sig
            WHERE sig.type = :signalType
            ORDER BY s.startedAt DESC
            """)
    Page<RecordingSession> findBySignalType(
            @Param("signalType") SignalType signalType, Pageable pageable);

    @Query("""
            SELECT DISTINCT s FROM RecordingSession s
            JOIN s.signals sig
            WHERE s.user.id = :userId
              AND sig.type = :signalType
              AND s.startedAt BETWEEN :from AND :to
            ORDER BY s.startedAt DESC
            """)
    Page<RecordingSession> findFiltered(
            @Param("userId") UUID userId,
            @Param("signalType") SignalType signalType,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable);
}
