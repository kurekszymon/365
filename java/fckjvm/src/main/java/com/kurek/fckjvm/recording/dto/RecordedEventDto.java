package com.kurek.fckjvm.recording.dto;

import java.util.Map;

import com.kurek.fckjvm.recording.event.EventType;

/**
 * A single recorded event from the frontend SDK. The {@code data} map is
 * event-type-specific — see PRD for schemas per type.
 */
public record RecordedEventDto(
        EventType type,
        long timestamp,
        Map<String, Object> data
        ) {

}
