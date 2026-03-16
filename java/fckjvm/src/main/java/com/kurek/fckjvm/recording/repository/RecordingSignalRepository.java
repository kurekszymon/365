package com.kurek.fckjvm.recording.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kurek.fckjvm.recording.entity.RecordingSignal;

public interface RecordingSignalRepository extends JpaRepository<RecordingSignal, UUID> {

    List<RecordingSignal> findBySessionIdOrderByTimestampAsc(UUID sessionId);
}
