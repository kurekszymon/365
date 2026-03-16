package com.kurek.fckjvm.recording.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.kurek.fckjvm.recording.dto.RecordedEventDto;
import com.kurek.fckjvm.recording.entity.RecordingSession;
import com.kurek.fckjvm.recording.entity.RecordingSignal;
import com.kurek.fckjvm.recording.event.EventType;
import com.kurek.fckjvm.recording.event.SignalType;

class BehaviorAnalysisServiceTest {

    private final BehaviorAnalysisService service = new BehaviorAnalysisService();

    private RecordingSession session() {
        var s = new RecordingSession();
        s.setId(UUID.randomUUID());
        s.setStartedAt(Instant.now());
        return s;
    }

    // ── Rage Click ─────────────────────────────────────────
    @Test
    void detectsRageClick_threeClicksWithinWindowAndRadius() {
        long base = System.currentTimeMillis();
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.MOUSE_CLICK, base, Map.of("x", 100, "y", 200, "selector", "#btn")),
                new RecordedEventDto(EventType.MOUSE_CLICK, base + 200, Map.of("x", 105, "y", 202, "selector", "#btn")),
                new RecordedEventDto(EventType.MOUSE_CLICK, base + 400, Map.of("x", 98, "y", 198, "selector", "#btn"))
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().anyMatch(s -> s.getType() == SignalType.RAGE_CLICK));
    }

    @Test
    void noRageClick_clicksTooFarApart() {
        long base = System.currentTimeMillis();
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.MOUSE_CLICK, base, Map.of("x", 100, "y", 200, "selector", "")),
                new RecordedEventDto(EventType.MOUSE_CLICK, base + 200, Map.of("x", 500, "y", 600, "selector", "")),
                new RecordedEventDto(EventType.MOUSE_CLICK, base + 400, Map.of("x", 100, "y", 200, "selector", ""))
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().noneMatch(s -> s.getType() == SignalType.RAGE_CLICK));
    }

    @Test
    void noRageClick_clicksTooSlowly() {
        long base = System.currentTimeMillis();
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.MOUSE_CLICK, base, Map.of("x", 100, "y", 200, "selector", "")),
                new RecordedEventDto(EventType.MOUSE_CLICK, base + 500, Map.of("x", 102, "y", 201, "selector", "")),
                new RecordedEventDto(EventType.MOUSE_CLICK, base + 1200, Map.of("x", 101, "y", 199, "selector", ""))
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().noneMatch(s -> s.getType() == SignalType.RAGE_CLICK));
    }

    // ── Dead Click ─────────────────────────────────────────
    @Test
    void detectsDeadClick_noMutationAfterClick() {
        long base = System.currentTimeMillis();
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.MOUSE_CLICK, base, Map.of("x", 50, "y", 50, "selector", "#dead")),
                new RecordedEventDto(EventType.MOUSE_MOVE, base + 500, Map.of("x", 55, "y", 55))
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().anyMatch(s -> s.getType() == SignalType.DEAD_CLICK));
    }

    @Test
    void noDeadClick_mutationFollowsClick() {
        long base = System.currentTimeMillis();
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.MOUSE_CLICK, base, Map.of("x", 50, "y", 50, "selector", "#live")),
                new RecordedEventDto(EventType.INCREMENTAL_SNAPSHOT, base + 200, Map.of())
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().noneMatch(s -> s.getType() == SignalType.DEAD_CLICK));
    }

    // ── Thrashing Cursor ───────────────────────────────────
    @Test
    void detectsThrashingCursor_manyReversals() {
        long base = System.currentTimeMillis();
        // Zigzag pattern: left-right-left-right-left-right-left
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.MOUSE_MOVE, base, Map.of("x", 100, "y", 100)),
                new RecordedEventDto(EventType.MOUSE_MOVE, base + 50, Map.of("x", 120, "y", 100)),
                new RecordedEventDto(EventType.MOUSE_MOVE, base + 100, Map.of("x", 100, "y", 100)),
                new RecordedEventDto(EventType.MOUSE_MOVE, base + 150, Map.of("x", 120, "y", 100)),
                new RecordedEventDto(EventType.MOUSE_MOVE, base + 200, Map.of("x", 100, "y", 100)),
                new RecordedEventDto(EventType.MOUSE_MOVE, base + 250, Map.of("x", 120, "y", 100)),
                new RecordedEventDto(EventType.MOUSE_MOVE, base + 300, Map.of("x", 100, "y", 100))
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().anyMatch(s -> s.getType() == SignalType.THRASHING_CURSOR));
    }

    // ── Excessive Scroll ───────────────────────────────────
    @Test
    void detectsExcessiveScroll_fastLargeScroll() {
        long base = System.currentTimeMillis();
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.SCROLL, base, Map.of("scrollY", 0)),
                new RecordedEventDto(EventType.SCROLL, base + 300, Map.of("scrollY", 1000)),
                new RecordedEventDto(EventType.SCROLL, base + 600, Map.of("scrollY", 2000)),
                new RecordedEventDto(EventType.SCROLL, base + 900, Map.of("scrollY", 3500))
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().anyMatch(s -> s.getType() == SignalType.EXCESSIVE_SCROLL));
    }

    // ── Quick Back ─────────────────────────────────────────
    @Test
    void detectsQuickBack_navigateAwayAndReturn() {
        long base = System.currentTimeMillis();
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.URL_CHANGE, base, Map.of("url", "https://example.com/a")),
                new RecordedEventDto(EventType.URL_CHANGE, base + 1000, Map.of("url", "https://example.com/b")),
                new RecordedEventDto(EventType.URL_CHANGE, base + 2000, Map.of("url", "https://example.com/a"))
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().anyMatch(s -> s.getType() == SignalType.QUICK_BACK));
    }

    @Test
    void noQuickBack_returnTooSlow() {
        long base = System.currentTimeMillis();
        List<RecordedEventDto> events = List.of(
                new RecordedEventDto(EventType.URL_CHANGE, base, Map.of("url", "https://example.com/a")),
                new RecordedEventDto(EventType.URL_CHANGE, base + 2000, Map.of("url", "https://example.com/b")),
                new RecordedEventDto(EventType.URL_CHANGE, base + 5000, Map.of("url", "https://example.com/a"))
        );

        List<RecordingSignal> signals = service.analyze(session(), events);
        assertTrue(signals.stream().noneMatch(s -> s.getType() == SignalType.QUICK_BACK));
    }
}
