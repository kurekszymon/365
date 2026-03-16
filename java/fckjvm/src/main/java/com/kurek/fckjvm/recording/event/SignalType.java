package com.kurek.fckjvm.recording.event;

/**
 * Behavioral signals detected server-side from raw events. These are NEVER sent
 * by the frontend — only computed by the backend.
 */
public enum SignalType {
    /**
     * ≥3 clicks within 800ms in a ≤30px radius
     */
    RAGE_CLICK,
    /**
     * Click with no DOM mutation within 1000ms
     */
    DEAD_CLICK,
    /**
     * ≥5 direction reversals within 500ms in mouse movement
     */
    THRASHING_CURSOR,
    /**
     * ≥3000px scroll distance within 1500ms
     */
    EXCESSIVE_SCROLL,
    /**
     * Navigate away and back to same URL within 3000ms
     */
    QUICK_BACK
}
