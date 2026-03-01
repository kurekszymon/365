// PostHog tracking utility with event constants and helpers
import type { PostHog } from "posthog-js";

// Event names
export const EVENTS = {
  // Note events
  NOTE_CREATED: "note_created",
  NOTE_UPDATED: "note_updated",
  NOTE_DELETED: "note_deleted",
  NOTE_VIEWED: "note_viewed",
  NOTE_SEARCHED: "note_searched",

  // Navigation events
  PAGE_VIEWED: "page_viewed",
  ROUTE_CHANGED: "route_changed",

  // BroadcastChannel events
  BROADCAST_MESSAGE_SENT: "broadcast_message_sent",
  BROADCAST_MESSAGE_RECEIVED: "broadcast_message_received",
  TAB_OPENED: "tab_opened",
  TAB_CLOSED: "tab_closed",

  // UI interactions
  BUTTON_CLICKED: "button_clicked",
  MODAL_OPENED: "modal_opened",
  MODAL_CLOSED: "modal_closed",
  SEARCH_PERFORMED: "search_performed",
  TAG_FILTERED: "tag_filtered",

  // App events
  APP_LOADED: "app_loaded",
  ERROR_OCCURRED: "error_occurred",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export class Tracking {
  private posthog: PostHog | null = null;

  setPostHog(posthog: PostHog) {
    this.posthog = posthog;
  }

  // Generic event tracking
  track(eventName: EventName | string, properties?: Record<string, unknown>) {
    if (!this.posthog) {
      console.warn("[Tracking] PostHog not initialized");
      return;
    }

    this.posthog.capture(eventName, {
      timestamp: Date.now(),
      ...properties,
    });

    console.log("[Tracking] Event:", eventName, properties);
  }

  // Note-specific tracking
  trackNoteCreated(noteId: string, title: string, tagsCount: number) {
    this.track(EVENTS.NOTE_CREATED, {
      note_id: noteId,
      title_length: title.length,
      tags_count: tagsCount,
    });
  }

  trackNoteUpdated(noteId: string, title: string, contentLength: number) {
    this.track(EVENTS.NOTE_UPDATED, {
      note_id: noteId,
      title_length: title.length,
      content_length: contentLength,
    });
  }

  trackNoteDeleted(noteId: string) {
    this.track(EVENTS.NOTE_DELETED, {
      note_id: noteId,
    });
  }

  trackNoteViewed(noteId: string, title: string) {
    this.track(EVENTS.NOTE_VIEWED, {
      note_id: noteId,
      title,
    });
  }

  trackNoteSearched(query: string, resultsCount: number) {
    this.track(EVENTS.NOTE_SEARCHED, {
      query,
      query_length: query.length,
      results_count: resultsCount,
    });
  }

  // Navigation tracking
  trackPageView(path: string, params?: Record<string, unknown>) {
    this.track(EVENTS.PAGE_VIEWED, {
      path,
      params,
    });
  }

  trackRouteChange(from: string, to: string) {
    this.track(EVENTS.ROUTE_CHANGED, {
      from,
      to,
    });
  }

  // BroadcastChannel tracking
  trackBroadcastSent(messageType: string, tabId: string) {
    this.track(EVENTS.BROADCAST_MESSAGE_SENT, {
      message_type: messageType,
      tab_id: tabId,
    });
  }

  trackBroadcastReceived(messageType: string, fromTabId: string) {
    this.track(EVENTS.BROADCAST_MESSAGE_RECEIVED, {
      message_type: messageType,
      from_tab_id: fromTabId,
    });
  }

  trackTabOpened(tabId: string) {
    this.track(EVENTS.TAB_OPENED, {
      tab_id: tabId,
    });
  }

  trackTabClosed(tabId: string) {
    this.track(EVENTS.TAB_CLOSED, {
      tab_id: tabId,
    });
  }

  // UI interaction tracking
  trackButtonClick(buttonName: string, context?: string) {
    this.track(EVENTS.BUTTON_CLICKED, {
      button_name: buttonName,
      context,
    });
  }

  trackModalOpened(modalName: string) {
    this.track(EVENTS.MODAL_OPENED, {
      modal_name: modalName,
    });
  }

  trackModalClosed(modalName: string, duration?: number) {
    this.track(EVENTS.MODAL_CLOSED, {
      modal_name: modalName,
      duration_ms: duration,
    });
  }

  trackSearch(query: string, resultsCount: number, context?: string) {
    this.track(EVENTS.SEARCH_PERFORMED, {
      query,
      results_count: resultsCount,
      context,
    });
  }

  trackTagFilter(tag: string, notesCount: number) {
    this.track(EVENTS.TAG_FILTERED, {
      tag,
      notes_count: notesCount,
    });
  }

  // App lifecycle tracking
  trackAppLoaded(notesCount: number, tagsCount: number) {
    this.track(EVENTS.APP_LOADED, {
      notes_count: notesCount,
      tags_count: tagsCount,
    });
  }

  trackError(error: Error | string, context?: string) {
    this.track(EVENTS.ERROR_OCCURRED, {
      error_message: error instanceof Error ? error.message : error,
      error_stack: error instanceof Error ? error.stack : undefined,
      context,
    });
  }

  // Identify user (if you have user identification)
  identify(userId: string, properties?: Record<string, unknown>) {
    if (!this.posthog) {
      console.warn("[Tracking] PostHog not initialized");
      return;
    }

    this.posthog.identify(userId, properties);
  }

  // Reset user (for logout scenarios)
  reset() {
    if (!this.posthog) {
      console.warn("[Tracking] PostHog not initialized");
      return;
    }

    this.posthog.reset();
  }
}

// Singleton instance
export const tracking = new Tracking();
