package com.kurek.fckjvm.recording.dto;

import java.util.Map;

import com.kurek.fckjvm.recording.event.SignalType;

/**
 * A behavioral signal detected by the backend analysis pipeline.
 */
public record SessionSignalDto(
        SignalType type,
        long timestamp,
        Map<String, Object> metadata
        ) {

}
