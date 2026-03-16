package com.kurek.fckjvm.recording.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kurek.fckjvm.recording.entity.RecordingEvent;

public interface RecordingEventRepository extends JpaRepository<RecordingEvent, UUID> {

    List<RecordingEvent> findBySessionIdOrderBySequenceNumberAsc(UUID sessionId);

    @Query("SELECT COALESCE(MAX(e.sequenceNumber), 0) FROM RecordingEvent e WHERE e.session.id = :sessionId")
    long findMaxSequenceNumber(@Param("sessionId") UUID sessionId);
}
