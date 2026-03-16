package com.kurek.fckjvm.recording.service;

import java.util.UUID;

public class SessionNotFoundException extends RuntimeException {

    public SessionNotFoundException(UUID sessionId) {
        super("Recording session not found: " + sessionId);
    }
}
