package com.kurek.fckjvm.recording.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.kurek.fckjvm.recording.event.SignalType;

/**
 * Summary view of a session for list/search results (no events payload).
 */
public record SessionSummaryDto(
        UUID id,
        UUID userId,
        String initialUrl,
        Instant startedAt,
        Instant endedAt,
        long durationMs,
        int eventCount,
        List<SignalType> detectedSignals
        ) {

}
