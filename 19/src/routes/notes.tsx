import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { usePostHog } from "@posthog/react";
import { notesStore, type Note } from "../lib/notes";
import { tracking } from "../lib/tracking";
import { broadcastManager } from "../lib/broadcast";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
});

function NotesPage() {
  const posthog = usePostHog();
  const [notes, setNotes] = useState<Note[]>(notesStore.getAllNotes());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>(notesStore.getAllTags());

  useEffect(() => {
    tracking.setPostHog(posthog);
    tracking.trackPageView("/notes");

    // Listen for note changes from other tabs
    const unsubscribe = broadcastManager.on("*", (message) => {
      if (message.type.startsWith("NOTE_")) {
        setNotes(notesStore.getAllNotes());
        setAllTags(notesStore.getAllTags());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [posthog]);

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (selectedTag) {
      result = notesStore.getNotesByTag(selectedTag);
    }

    if (searchQuery.trim()) {
      result = notesStore.searchNotes(searchQuery);
    }

    return result;
  }, [searchQuery, selectedTag, notes]);

  useEffect(() => {
    if (selectedTag) {
      tracking.trackTagFilter(selectedTag, filteredNotes.length);
    }
    if (searchQuery.trim()) {
      tracking.trackSearch(searchQuery, filteredNotes.length, "notes_page");
    }
  }, [selectedTag, searchQuery, filteredNotes.length]);

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      const deleted = notesStore.deleteNote(noteId);
      if (deleted) {
        tracking.trackNoteDeleted(noteId);
        broadcastManager.broadcast("NOTE_DELETED", { noteId });
        setNotes(notesStore.getAllNotes());
        setAllTags(notesStore.getAllTags());
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedTag(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="notes-page">
      <div className="page-header">
        <h1>All Notes</h1>
        <Link to="/new" className="btn btn-primary">
          + Create New Note
        </Link>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search notes by title, content, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {(searchQuery || selectedTag) && (
            <button onClick={handleClearSearch} className="btn btn-text">
              Clear
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="tags-filter">
            <span className="filter-label">Filter by tag:</span>
            <div className="tags-list">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setSelectedTag(selectedTag === tag ? null : tag)
                  }
                  className={`tag ${selectedTag === tag ? "tag-active" : ""}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="notes-stats">
        Showing {filteredNotes.length} of {notes.length} notes
      </div>

      {filteredNotes.length > 0 ? (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <div key={note.id} className="note-card">
              <div className="note-card-header">
                <Link
                  to={`/notes/$noteId`}
                  params={{ noteId: note.id }}
                  className="note-title"
                >
                  {note.title}
                </Link>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="btn btn-icon btn-danger"
                  title="Delete note"
                >
                  🗑️
                </button>
              </div>

              <div className="note-card-content">
                {note.content.length > 150
                  ? note.content.substring(0, 150) + "..."
                  : note.content || "No content"}
              </div>

              {note.tags.length > 0 && (
                <div className="note-tags">
                  {note.tags.map((tag) => (
                    <span key={tag} className="tag tag-small">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="note-card-footer">
                <span className="note-date">
                  Updated: {formatDate(note.updatedAt)}
                </span>
                <Link
                  to={`/notes/$noteId`}
                  params={{ noteId: note.id }}
                  className="btn btn-text btn-sm"
                >
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {searchQuery || selectedTag ? (
            <>
              <h2>No notes found</h2>
              <p>Try adjusting your search or filter criteria</p>
              <button onClick={handleClearSearch} className="btn btn-primary">
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h2>No notes yet</h2>
              <p>Create your first note to get started!</p>
              <Link to="/new" className="btn btn-primary">
                Create Note
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
