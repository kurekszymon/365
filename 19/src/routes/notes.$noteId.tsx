import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePostHog } from "@posthog/react";
import { notesStore, type Note } from "../lib/notes";
import { tracking } from "../lib/tracking";
import { broadcastManager } from "../lib/broadcast";

export const Route = createFileRoute("/notes/$noteId")({
  component: NoteDetailPage,
});

function NoteDetailPage() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [note, setNote] = useState<Note | undefined>(
    notesStore.getNote(noteId),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note?.title || "");
  const [editContent, setEditContent] = useState(note?.content || "");
  const [editTags, setEditTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    tracking.setPostHog(posthog);

    if (!note) {
      navigate({ to: "/notes" });
      return;
    }

    tracking.trackNoteViewed(note.id, note.title);
    tracking.trackPageView(`/notes/${noteId}`);

    // Listen for note updates from other tabs
    const unsubscribe = broadcastManager.on("*", (message) => {
      const payload = message.payload as { noteId?: string } | undefined;
      if (message.type === "NOTE_UPDATED" && payload?.noteId === noteId) {
        const updatedNote = notesStore.getNote(noteId);
        setNote(updatedNote);
        if (updatedNote && !isEditing) {
          setEditTitle(updatedNote.title);
          setEditContent(updatedNote.content);
          setEditTags(updatedNote.tags);
        }
      } else if (
        message.type === "NOTE_DELETED" &&
        payload?.noteId === noteId
      ) {
        navigate({ to: "/notes" });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [posthog, noteId, note, isEditing, navigate]);

  const handleEdit = () => {
    setIsEditing(true);
    tracking.trackButtonClick("edit_note", "note_detail");
  };

  const handleCancelEdit = () => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditTags(note.tags);
    }
    setIsEditing(false);
    tracking.trackButtonClick("cancel_edit", "note_detail");
  };

  const handleSaveEdit = () => {
    if (!note) return;

    const updatedNote = notesStore.updateNote(note.id, {
      title: editTitle,
      content: editContent,
      tags: editTags,
    });

    if (updatedNote) {
      setNote(updatedNote);
      setIsEditing(false);
      tracking.trackNoteUpdated(
        updatedNote.id,
        updatedNote.title,
        updatedNote.content.length,
      );
      tracking.trackButtonClick("save_edit", "note_detail");

      // Broadcast to other tabs
      broadcastManager.broadcast("NOTE_UPDATED", {
        noteId: updatedNote.id,
        title: updatedNote.title,
        contentLength: updatedNote.content.length,
      });
    }
  };

  const handleDelete = () => {
    if (!note) return;

    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      const deleted = notesStore.deleteNote(note.id);
      if (deleted) {
        tracking.trackNoteDeleted(note.id);
        tracking.trackButtonClick("delete_note", "note_detail");
        broadcastManager.broadcast("NOTE_DELETED", { noteId: note.id });
        navigate({ to: "/notes" });
      }
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!note) {
    return (
      <div className="empty-state">
        <h2>Note not found</h2>
        <p>The note you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate({ to: "/notes" })}
          className="btn btn-primary"
        >
          Back to Notes
        </button>
      </div>
    );
  }

  return (
    <div className="note-detail-page">
      <div className="page-header">
        <button
          onClick={() => navigate({ to: "/notes" })}
          className="btn btn-text"
        >
          ← Back to Notes
        </button>
        <div className="header-actions">
          {!isEditing ? (
            <>
              <button onClick={handleEdit} className="btn btn-secondary">
                Edit
              </button>
              <button onClick={handleDelete} className="btn btn-danger">
                Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCancelEdit} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="btn btn-primary">
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="note-detail-content">
        {isEditing ? (
          <div className="note-form">
            <div className="form-group">
              <label htmlFor="edit-title" className="form-label">
                Title
              </label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-content" className="form-label">
                Content
              </label>
              <textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="form-textarea"
                rows={15}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-tags" className="form-label">
                Tags
              </label>
              <div className="tags-input-wrapper">
                <input
                  id="edit-tags"
                  type="text"
                  placeholder="Add a tag and press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="form-input"
                />
                <button
                  onClick={handleAddTag}
                  className="btn btn-secondary"
                  type="button"
                >
                  Add Tag
                </button>
              </div>

              {editTags.length > 0 && (
                <div className="tags-list">
                  {editTags.map((tag) => (
                    <span key={tag} className="tag tag-removable">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="tag-remove"
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-footer">
              <div className="form-stats">
                <span>Characters: {editContent.length}</span>
                <span>•</span>
                <span>
                  Words:{" "}
                  {editContent.trim().split(/\s+/).filter(Boolean).length}
                </span>
                <span>•</span>
                <span>Tags: {editTags.length}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="note-view">
            <h1 className="note-title">{note.title}</h1>

            <div className="note-metadata">
              <span>Created: {formatDate(note.createdAt)}</span>
              {note.updatedAt !== note.createdAt && (
                <>
                  <span>•</span>
                  <span>Updated: {formatDate(note.updatedAt)}</span>
                </>
              )}
            </div>

            {note.tags.length > 0 && (
              <div className="note-tags">
                {note.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="note-content">
              {note.content ? (
                <pre className="note-content-text">{note.content}</pre>
              ) : (
                <p className="note-content-empty">No content</p>
              )}
            </div>

            <div className="note-stats">
              <span>{note.content.length} characters</span>
              <span>•</span>
              <span>
                {note.content.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
