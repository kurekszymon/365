package com.kurek.fckjvm.recording.dto;

/**
 * Metadata sent with each event batch — describes the browser/page context.
 */
public record SessionMetadataDto(
        String url,
        String userAgent,
        int screenWidth,
        int screenHeight
        ) {

}
