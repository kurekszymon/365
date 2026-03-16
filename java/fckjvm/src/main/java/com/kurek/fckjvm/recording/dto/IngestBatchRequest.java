package com.kurek.fckjvm.recording.dto;

import java.util.List;
import java.util.UUID;

/**
 * Batch of events sent by the frontend SDK in a single HTTP request. The SDK
 * should batch events (e.g. every 2-5 seconds) to reduce overhead.
 */
public record IngestBatchRequest(
        UUID sessionId,
        List<RecordedEventDto> events,
        SessionMetadataDto metadata
        ) {

}
