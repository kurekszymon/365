import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePostHog } from "@posthog/react";
import { tracking } from "../lib/tracking";
import { broadcastManager } from "../lib/broadcast";
import { seedSampleNotes } from "../lib/seedData";
import type { BroadcastMessage } from "../lib/broadcast";
import { useNotesStore } from "../lib/notesStore";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const posthog = usePostHog();
  const { notes, allTags, refreshNotes } = useNotesStore();
  const notesCount = notes.length;
  const tagsCount = allTags.length;
  const [broadcastMessages, setBroadcastMessages] = useState<
    BroadcastMessage[]
  >([]);
  const [tabId] = useState(broadcastManager.getTabId());

  const renderPayload = (payload: unknown): string => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  useEffect(() => {
    tracking.setPostHog(posthog);
    tracking.trackPageView("/", { tab_id: tabId });
    tracking.trackAppLoaded(notesCount, tagsCount);

    // Listen to all broadcast messages
    const unsubscribe = broadcastManager.on("*", (message) => {
      console.log("[Home] Received broadcast:", message);
      tracking.trackBroadcastReceived(message.type, message.tabId);

      setBroadcastMessages((prev) => [...prev.slice(-9), message]);
    });

    return () => {
      unsubscribe();
    };
  }, [posthog, tabId, notesCount, tagsCount]);

  const handleTestBroadcast = () => {
    tracking.trackButtonClick("test_broadcast", "home");
    broadcastManager.broadcast("NOTE_CREATED", {
      title: "Test Note",
      timestamp: Date.now(),
    });
    tracking.trackBroadcastSent("NOTE_CREATED", tabId);
  };

  const handleSeedData = () => {
    const added = seedSampleNotes();
    if (added) {
      tracking.trackButtonClick("seed_sample_data", "home");
      refreshNotes();
    }
  };

  return (
    <div className="home-container">
      <section className="hero-section">
        <h1>Welcome to Notes App</h1>
        <p className="subtitle">
          A simple, efficient note-taking app with real-time cross-tab sync
        </p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{notesCount}</div>
            <div className="stat-label">Total Notes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{tagsCount}</div>
            <div className="stat-label">Tags</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{broadcastMessages.length}</div>
            <div className="stat-label">Broadcast Messages</div>
          </div>
        </div>
      </section>

      {notesCount === 0 && (
        <section className="info-section">
          <h2>🎯 Quick Start</h2>
          <p>
            No notes yet? Try adding some sample notes to explore the app's
            features!
          </p>
          <button onClick={handleSeedData} className="btn btn-primary">
            Add Sample Notes
          </button>
        </section>
      )}

      <section className="info-section">
        <h2>Features</h2>
        <ul className="features-list">
          <li>✨ Create and manage notes with tags</li>
          <li>🔍 Search through your notes instantly</li>
          <li>
            🔄 Real-time sync across browser tabs using BroadcastChannel API
          </li>
          <li>📊 Analytics tracking with PostHog</li>
          <li>💾 Local storage for offline access</li>
        </ul>
      </section>

      <section className="broadcast-section">
        <div className="section-header">
          <h2>BroadcastChannel Monitor</h2>
          <button onClick={handleTestBroadcast} className="btn btn-secondary">
            Test Broadcast
          </button>
        </div>

        <div className="tab-info">
          <strong>Current Tab ID:</strong> <code>{tabId.slice(0, 8)}</code>
          <span className="status-badge">
            {broadcastManager.isSupported()
              ? "✅ Supported"
              : "❌ Not Supported"}
          </span>
        </div>

        {broadcastMessages.length > 0 ? (
          <div className="broadcast-messages">
            <h3>Recent Messages ({broadcastMessages.length})</h3>
            <div className="messages-list">
              {broadcastMessages.map((msg, idx) => (
                <div key={idx} className="message-item">
                  <div className="message-type">{msg.type}</div>
                  <div className="message-meta">
                    From: <code>{msg.tabId.slice(0, 8)}</code>
                    {" • "}
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                  {msg.payload !== null &&
                    msg.payload !== undefined &&
                    typeof msg.payload === "object" && (
                      <pre className="message-payload">
                        {renderPayload(msg.payload)}
                      </pre>
                    )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>
              No broadcast messages yet. Open this app in another tab to see
              real-time sync!
            </p>
          </div>
        )}
      </section>

      <section className="tip-section">
        <div className="tip-card">
          <h3>💡 Tip</h3>
          <p>
            Open this app in multiple browser tabs and create or edit notes.
            You'll see the changes sync in real-time across all tabs!
          </p>
        </div>
      </section>
    </div>
  );
}
