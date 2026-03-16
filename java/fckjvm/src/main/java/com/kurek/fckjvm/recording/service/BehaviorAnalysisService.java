package com.kurek.fckjvm.recording.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;

import com.kurek.fckjvm.recording.dto.RecordedEventDto;
import com.kurek.fckjvm.recording.entity.RecordingSession;
import com.kurek.fckjvm.recording.entity.RecordingSignal;
import com.kurek.fckjvm.recording.event.EventType;
import com.kurek.fckjvm.recording.event.SignalType;

/**
 * Detects behavioral signals from raw session events.
 *
 * Runs synchronously during ingest. Each detect method scans the incoming batch
 * and produces signals when thresholds are exceeded.
 */
@Service
public class BehaviorAnalysisService {

    // ── Rage Click thresholds ──────────────────────────────
    private static final int RAGE_CLICK_COUNT = 3;
    private static final long RAGE_CLICK_WINDOW_MS = 800;
    private static final double RAGE_CLICK_RADIUS_PX = 30.0;

    // ── Dead Click threshold ───────────────────────────────
    private static final long DEAD_CLICK_MUTATION_TIMEOUT_MS = 1000;

    // ── Thrashing Cursor thresholds ────────────────────────
    private static final int THRASH_REVERSAL_COUNT = 5;
    private static final long THRASH_WINDOW_MS = 500;

    // ── Excessive Scroll thresholds ────────────────────────
    private static final double EXCESSIVE_SCROLL_DISTANCE_PX = 3000.0;
    private static final long EXCESSIVE_SCROLL_WINDOW_MS = 1500;

    // ── Quick Back threshold ───────────────────────────────
    private static final long QUICK_BACK_WINDOW_MS = 3000;

    /**
     * Analyze a batch of events and return all detected signals.
     */
    public List<RecordingSignal> analyze(RecordingSession session, List<RecordedEventDto> events) {
        List<RecordingSignal> signals = new ArrayList<>();
        signals.addAll(detectRageClicks(session, events));
        signals.addAll(detectDeadClicks(session, events));
        signals.addAll(detectThrashingCursor(session, events));
        signals.addAll(detectExcessiveScroll(session, events));
        signals.addAll(detectQuickBacks(session, events));
        return signals;
    }

    /**
     * Rage Click: ≥3 clicks within 800ms in a ≤30px radius.
     */
    private List<RecordingSignal> detectRageClicks(RecordingSession session, List<RecordedEventDto> events) {
        List<RecordingSignal> signals = new ArrayList<>();
        List<RecordedEventDto> clicks = events.stream()
                .filter(e -> e.type() == EventType.MOUSE_CLICK)
                .toList();

        for (int i = 0; i <= clicks.size() - RAGE_CLICK_COUNT; i++) {
            RecordedEventDto anchor = clicks.get(i);
            double anchorX = toDouble(anchor.data(), "x");
            double anchorY = toDouble(anchor.data(), "y");
            int count = 1;

            for (int j = i + 1; j < clicks.size(); j++) {
                RecordedEventDto candidate = clicks.get(j);
                long dt = candidate.timestamp() - anchor.timestamp();
                if (dt > RAGE_CLICK_WINDOW_MS) {
                    break;
                }

                double dx = toDouble(candidate.data(), "x") - anchorX;
                double dy = toDouble(candidate.data(), "y") - anchorY;
                if (Math.sqrt(dx * dx + dy * dy) <= RAGE_CLICK_RADIUS_PX) {
                    count++;
                }
            }

            if (count >= RAGE_CLICK_COUNT) {
                RecordingSignal signal = new RecordingSignal();
                signal.setSession(session);
                signal.setType(SignalType.RAGE_CLICK);
                signal.setTimestamp(anchor.timestamp());
                signal.setMetadata(Map.of(
                        "x", anchorX,
                        "y", anchorY,
                        "clickCount", count,
                        "selector", Objects.toString(anchor.data().get("selector"), "")
                ));
                signals.add(signal);
                // skip ahead to avoid duplicate signals for overlapping windows
                i += count - 1;
            }
        }
        return signals;
    }

    /**
     * Dead Click: click with no DOM mutation (INCREMENTAL_SNAPSHOT) within
     * 1000ms.
     */
    private List<RecordingSignal> detectDeadClicks(RecordingSession session, List<RecordedEventDto> events) {
        List<RecordingSignal> signals = new ArrayList<>();

        for (int i = 0; i < events.size(); i++) {
            RecordedEventDto event = events.get(i);
            if (event.type() != EventType.MOUSE_CLICK) {
                continue;
            }

            boolean mutationFollowed = false;
            for (int j = i + 1; j < events.size(); j++) {
                RecordedEventDto next = events.get(j);
                if (next.timestamp() - event.timestamp() > DEAD_CLICK_MUTATION_TIMEOUT_MS) {
                    break;
                }
                if (next.type() == EventType.INCREMENTAL_SNAPSHOT) {
                    mutationFollowed = true;
                    break;
                }
            }

            if (!mutationFollowed) {
                RecordingSignal signal = new RecordingSignal();
                signal.setSession(session);
                signal.setType(SignalType.DEAD_CLICK);
                signal.setTimestamp(event.timestamp());
                signal.setMetadata(Map.of(
                        "x", toDouble(event.data(), "x"),
                        "y", toDouble(event.data(), "y"),
                        "selector", Objects.toString(event.data().get("selector"), "")
                ));
                signals.add(signal);
            }
        }
        return signals;
    }

    /**
     * Thrashing Cursor: ≥5 direction reversals within 500ms. A reversal = the
     * sign of dx or dy flips between consecutive moves.
     */
    private List<RecordingSignal> detectThrashingCursor(RecordingSession session, List<RecordedEventDto> events) {
        List<RecordingSignal> signals = new ArrayList<>();
        List<RecordedEventDto> moves = events.stream()
                .filter(e -> e.type() == EventType.MOUSE_MOVE)
                .toList();

        if (moves.size() < 3) {
            return signals;
        }

        for (int windowStart = 0; windowStart < moves.size() - 2; windowStart++) {
            int reversals = 0;
            double prevDx = 0, prevDy = 0;
            long windowStartTs = moves.get(windowStart).timestamp();

            for (int i = windowStart + 1; i < moves.size(); i++) {
                RecordedEventDto curr = moves.get(i);
                if (curr.timestamp() - windowStartTs > THRASH_WINDOW_MS) {
                    break;
                }

                RecordedEventDto prev = moves.get(i - 1);
                double dx = toDouble(curr.data(), "x") - toDouble(prev.data(), "x");
                double dy = toDouble(curr.data(), "y") - toDouble(prev.data(), "y");

                if (i > windowStart + 1) {
                    if ((dx * prevDx < 0) || (dy * prevDy < 0)) {
                        reversals++;
                    }
                }
                prevDx = dx;
                prevDy = dy;
            }

            if (reversals >= THRASH_REVERSAL_COUNT) {
                RecordingSignal signal = new RecordingSignal();
                signal.setSession(session);
                signal.setType(SignalType.THRASHING_CURSOR);
                signal.setTimestamp(windowStartTs);
                signal.setMetadata(Map.of("reversals", reversals));
                signals.add(signal);
                // skip past this window
                windowStart += THRASH_REVERSAL_COUNT;
            }
        }
        return signals;
    }

    /**
     * Excessive Scroll: ≥3000px of scroll distance within 1500ms.
     */
    private List<RecordingSignal> detectExcessiveScroll(RecordingSession session, List<RecordedEventDto> events) {
        List<RecordingSignal> signals = new ArrayList<>();
        List<RecordedEventDto> scrolls = events.stream()
                .filter(e -> e.type() == EventType.SCROLL)
                .toList();

        if (scrolls.size() < 2) {
            return signals;
        }

        for (int windowStart = 0; windowStart < scrolls.size() - 1; windowStart++) {
            double totalDistance = 0;
            long windowStartTs = scrolls.get(windowStart).timestamp();

            for (int i = windowStart + 1; i < scrolls.size(); i++) {
                RecordedEventDto curr = scrolls.get(i);
                if (curr.timestamp() - windowStartTs > EXCESSIVE_SCROLL_WINDOW_MS) {
                    break;
                }

                RecordedEventDto prev = scrolls.get(i - 1);
                double dy = Math.abs(toDouble(curr.data(), "scrollY") - toDouble(prev.data(), "scrollY"));
                totalDistance += dy;
            }

            if (totalDistance >= EXCESSIVE_SCROLL_DISTANCE_PX) {
                RecordingSignal signal = new RecordingSignal();
                signal.setSession(session);
                signal.setType(SignalType.EXCESSIVE_SCROLL);
                signal.setTimestamp(windowStartTs);
                signal.setMetadata(Map.of("distancePx", totalDistance));
                signals.add(signal);
                windowStart += scrolls.size() / 2; // coarse skip
            }
        }
        return signals;
    }

    /**
     * Quick Back: navigate away then back to the same URL within 3000ms.
     */
    private List<RecordingSignal> detectQuickBacks(RecordingSession session, List<RecordedEventDto> events) {
        List<RecordingSignal> signals = new ArrayList<>();
        List<RecordedEventDto> navs = events.stream()
                .filter(e -> e.type() == EventType.URL_CHANGE)
                .toList();

        for (int i = 0; i < navs.size() - 2; i++) {
            String urlA = Objects.toString(navs.get(i).data().get("url"), "");
            String urlB = Objects.toString(navs.get(i + 1).data().get("url"), "");
            String urlC = Objects.toString(navs.get(i + 2).data().get("url"), "");

            long dt = navs.get(i + 2).timestamp() - navs.get(i).timestamp();

            if (urlA.equals(urlC) && !urlA.equals(urlB) && dt <= QUICK_BACK_WINDOW_MS) {
                RecordingSignal signal = new RecordingSignal();
                signal.setSession(session);
                signal.setType(SignalType.QUICK_BACK);
                signal.setTimestamp(navs.get(i).timestamp());
                signal.setMetadata(Map.of(
                        "originalUrl", urlA,
                        "navigatedTo", urlB,
                        "elapsedMs", dt
                ));
                signals.add(signal);
                i += 2;
            }
        }
        return signals;
    }

    private static double toDouble(Map<String, Object> data, String key) {
        Object val = data == null ? null : data.get(key);
        if (val instanceof Number n) {
            return n.doubleValue();
        }
        return 0.0;
    }
}
