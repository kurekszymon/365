package com.kurek.fckjvm.recording.event;

/**
 * Shared event type contract between frontend SDK and backend. Frontend sends
 * raw events; backend detects BEHAVIORAL signals.
 */
public enum EventType {
    // ── Snapshot ────────────────────────────────────────────
    FULL_SNAPSHOT,
    INCREMENTAL_SNAPSHOT,
    // ── Interaction ────────────────────────────────────────
    MOUSE_MOVE,
    MOUSE_CLICK,
    MOUSE_DOWN,
    MOUSE_UP,
    SCROLL,
    INPUT,
    TOUCH_START,
    TOUCH_MOVE,
    TOUCH_END,
    FOCUS,
    BLUR,
    // ── Navigation ─────────────────────────────────────────
    PAGE_LOAD,
    PAGE_UNLOAD,
    VISIBILITY_CHANGE,
    URL_CHANGE,
    // ── Viewport ───────────────────────────────────────────
    VIEWPORT_RESIZE,
    MEDIA_QUERY_CHANGE,
    // ── Performance ────────────────────────────────────────
    PERFORMANCE_ENTRY,
    NETWORK_REQUEST,
    // ── Error ──────────────────────────────────────────────
    JS_ERROR,
    UNHANDLED_REJECTION,
    RESOURCE_ERROR,
    // ── Custom (app-defined) ───────────────────────────────
    CUSTOM
}
