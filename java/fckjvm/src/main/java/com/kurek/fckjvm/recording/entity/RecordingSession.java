package com.kurek.fckjvm.recording.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.kurek.fckjvm.entity.User;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "recording_sessions", indexes = {
    @Index(name = "idx_recording_session_user", columnList = "user_id"),
    @Index(name = "idx_recording_session_started", columnList = "started_at")
})
@Getter
@Setter
@NoArgsConstructor
public class RecordingSession {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Instant startedAt;

    private Instant endedAt;

    private long durationMs;

    @Column(nullable = false)
    private int eventCount;

    @Column(length = 2048)
    private String initialUrl;

    @Column(length = 512)
    private String userAgent;

    private int screenWidth;
    private int screenHeight;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceNumber ASC")
    private List<RecordingEvent> events = new ArrayList<>();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("timestamp ASC")
    private List<RecordingSignal> signals = new ArrayList<>();
}
