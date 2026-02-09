// BroadcastChannel manager for cross-tab communication with PostHog tracking

export type BroadcastMessage = {
  type:
    | "NOTE_CREATED"
    | "NOTE_UPDATED"
    | "NOTE_DELETED"
    | "TAB_OPENED"
    | "TAB_CLOSED";
  payload?: unknown;
  timestamp: number;
  tabId: string;
};

class BroadcastManager {
  private channel: BroadcastChannel | null = null;
  private readonly channelName = "notes-app-channel";
  private tabId: string;
  private listeners: Map<string, Set<(message: BroadcastMessage) => void>> =
    new Map();

  constructor() {
    this.tabId = crypto.randomUUID();
    this.init();
  }

  private init() {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(this.channelName);

      this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        console.log("[BroadcastChannel] Received message:", event.data);

        if (event.data.tabId === this.tabId) {
          // don't process messages from the same tab
          return;
        }

        const typeListeners = this.listeners.get(event.data.type);
        if (typeListeners) {
          typeListeners.forEach((callback) => callback(event.data));
        }

        const wildcardListeners = this.listeners.get("*");
        if (wildcardListeners) {
          wildcardListeners.forEach((callback) => callback(event.data));
        }
      };

      this.broadcast("TAB_OPENED", { tabId: this.tabId });

      window.addEventListener("beforeunload", () => {
        this.broadcast("TAB_CLOSED", { tabId: this.tabId });
      });
    } else {
      console.warn(
        "[BroadcastChannel] BroadcastChannel API is not supported in this browser",
      );
    }
  }

  broadcast(type: BroadcastMessage["type"], payload?: unknown) {
    if (!this.channel) {
      console.warn("[BroadcastChannel] Channel not initialized");
      return;
    }

    const message: BroadcastMessage = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: this.tabId,
    };

    console.log("[BroadcastChannel] Broadcasting:", message);
    this.channel.postMessage(message);
  }

  on(
    type: BroadcastMessage["type"] | "*",
    callback: (message: BroadcastMessage) => void,
  ) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  close() {
    if (this.channel) {
      this.broadcast("TAB_CLOSED", { tabId: this.tabId });
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }

  getTabId() {
    return this.tabId;
  }

  isSupported() {
    return typeof BroadcastChannel !== "undefined";
  }
}

export const broadcastManager = new BroadcastManager();
