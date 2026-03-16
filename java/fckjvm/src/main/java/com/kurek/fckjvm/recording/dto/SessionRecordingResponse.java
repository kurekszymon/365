package com.kurek.fckjvm.recording.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Full session response including metadata and all events for replay.
 */
public record SessionRecordingResponse(
        UUID id,
        UUID userId,
        String initialUrl,
        String userAgent,
        int screenWidth,
        int screenHeight,
        Instant startedAt,
        Instant endedAt,
        long durationMs,
        int eventCount,
        List<RecordedEventDto> events,
        List<SessionSignalDto> signals
        ) {

}
