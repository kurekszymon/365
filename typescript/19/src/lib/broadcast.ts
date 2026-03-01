// BroadcastChannel manager for cross-tab communication

type NoteCreatedMessage = {
  type: "NOTE_CREATED";
  payload: { noteId: string; title: string; tagsCount: number };
};

type NoteUpdatedMessage = {
  type: "NOTE_UPDATED";
  payload: { noteId: string; title: string; contentLength: number };
};

type NoteDeletedMessage = {
  type: "NOTE_DELETED";
  payload: { noteId: string };
};

type TabOpenedMessage = {
  type: "TAB_OPENED";
  payload: { tabId: string };
};

type TabClosedMessage = {
  type: "TAB_CLOSED";
  payload: { tabId: string };
};

type BroadcastPayload =
  | NoteCreatedMessage
  | NoteUpdatedMessage
  | NoteDeletedMessage
  | TabOpenedMessage
  | TabClosedMessage;

export type BroadcastMessage = BroadcastPayload & {
  timestamp: number;
  tabId: string;
};

export type BroadcastMessageType = BroadcastMessage["type"];

type PayloadForType<T extends BroadcastMessageType> = Extract<
  BroadcastPayload,
  { type: T }
>["payload"];

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

  broadcast<T extends BroadcastMessageType>(
    type: T,
    payload: PayloadForType<T>,
  ) {
    if (!this.channel) {
      console.warn("[BroadcastChannel] Channel not initialized");
      return;
    }

    const message = {
      type,
      payload,
      timestamp: Date.now(),
      tabId: this.tabId,
    } as BroadcastMessage;

    console.log("[BroadcastChannel] Broadcasting:", message);
    this.channel.postMessage(message);
  }

  on<T extends BroadcastMessageType>(
    type: T,
    callback: (message: Extract<BroadcastMessage, { type: T }>) => void,
  ): () => void;
  on(type: "*", callback: (message: BroadcastMessage) => void): () => void;
  on(
    type: BroadcastMessageType | "*",
    callback: (message: BroadcastMessage) => void,
  ) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

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
