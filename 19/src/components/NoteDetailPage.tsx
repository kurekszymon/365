import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePostHog } from "@posthog/react";
import { tracking } from "../lib/tracking";
import { broadcastManager } from "../lib/broadcast";
import { useNotesStore } from "../lib/notesStore";
import type { Drawing } from "../lib/notes";
import CanvasDrawing from "./CanvasDrawing";

interface NoteDetailPageProps {
  noteId: string;
}

export default function NoteDetailPage({ noteId }: NoteDetailPageProps) {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const {
    notes,
    updateNote: updateNoteInStore,
    deleteNote: deleteNoteFromStore,
  } = useNotesStore();
  const note = notes.find((n) => n.id === noteId);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editDrawings, setEditDrawings] = useState<Drawing[]>([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [editingDrawingId, setEditingDrawingId] = useState<string | null>(null);

  useEffect(() => {
    tracking.setPostHog(posthog);

    if (!note) {
      navigate({ to: "/notes" });
      return;
    }

    tracking.trackNoteViewed(note.id, note.title);
    tracking.trackPageView(`/notes/${noteId}`);

    const unsubscribe = broadcastManager.on("NOTE_DELETED", (message) => {
      if (message.payload.noteId === noteId) {
        navigate({ to: "/notes" });
      }
    });

    return () => unsubscribe();
  }, [posthog, noteId, note, navigate]);

  const handleEdit = () => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditTags(note.tags);
      setEditDrawings(note.drawings || []);
    }
    setIsEditing(true);
    tracking.trackButtonClick("edit_note", "note_detail");
  };

  const handleCancelEdit = () => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditTags(note.tags);
      setEditDrawings(note.drawings || []);
    }
    setIsEditing(false);
    setShowCanvas(false);
    setEditingDrawingId(null);
    tracking.trackButtonClick("cancel_edit", "note_detail");
  };

  const handleSaveEdit = () => {
    if (!note) return;

    const updatedNote = updateNoteInStore(note.id, {
      title: editTitle,
      content: editContent,
      tags: editTags,
      drawings: editDrawings,
    });

    if (updatedNote) {
      setIsEditing(false);
      tracking.trackNoteUpdated(
        updatedNote.id,
        updatedNote.title,
        updatedNote.content.length,
      );
      tracking.trackButtonClick("save_edit", "note_detail");

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
      const deleted = deleteNoteFromStore(note.id);
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

  const handleAddDrawing = (dataUrl: string) => {
    const newDrawing: Drawing = {
      id: crypto.randomUUID(),
      dataUrl,
      createdAt: Date.now(),
    };
    setEditDrawings([...editDrawings, newDrawing]);
    setShowCanvas(false);
    setEditingDrawingId(null);
  };

  const handleUpdateDrawing = (dataUrl: string) => {
    if (!editingDrawingId) return;
    setEditDrawings(
      editDrawings.map((d) =>
        d.id === editingDrawingId ? { ...d, dataUrl } : d,
      ),
    );
    setShowCanvas(false);
    setEditingDrawingId(null);
  };

  const handleDeleteDrawing = (drawingId: string) => {
    if (window.confirm("Delete this drawing?")) {
      setEditDrawings(editDrawings.filter((d) => d.id !== drawingId));
    }
  };

  const handleEditDrawing = (drawing: Drawing) => {
    setEditingDrawingId(drawing.id);
    setShowCanvas(true);
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

  if (showCanvas && isEditing) {
    const editingDrawing = editingDrawingId
      ? editDrawings.find((d) => d.id === editingDrawingId)
      : null;

    return (
      <div className="note-detail-page">
        <div className="page-header">
          <h1>{editingDrawing ? "Edit Drawing" : "Add Drawing"}</h1>
        </div>
        <CanvasDrawing
          initialData={editingDrawing?.dataUrl}
          onSave={editingDrawing ? handleUpdateDrawing : handleAddDrawing}
          onCancel={() => {
            setShowCanvas(false);
            setEditingDrawingId(null);
          }}
        />
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

            <div className="form-group">
              <label className="form-label">Drawings</label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCanvas(true)}
              >
                🎨 Add Drawing
              </button>

              {editDrawings.length > 0 && (
                <div className="drawings-list">
                  {editDrawings.map((drawing) => (
                    <div key={drawing.id} className="drawing-item">
                      <img
                        src={drawing.dataUrl}
                        alt="Drawing"
                        className="drawing-preview"
                      />
                      <div className="drawing-actions">
                        <button
                          type="button"
                          className="btn btn-text btn-sm"
                          onClick={() => handleEditDrawing(drawing)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-text btn-sm btn-danger"
                          onClick={() => handleDeleteDrawing(drawing.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
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
                <span>•</span>
                <span>Drawings: {editDrawings.length}</span>
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

            {note.drawings && note.drawings.length > 0 && (
              <div className="note-drawings">
                <h3>Drawings</h3>
                <div className="drawings-list">
                  {note.drawings.map((drawing) => (
                    <div key={drawing.id} className="drawing-item">
                      <img
                        src={drawing.dataUrl}
                        alt="Drawing"
                        className="drawing-preview"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="note-stats">
              <span>{note.content.length} characters</span>
              <span>•</span>
              <span>
                {note.content.trim().split(/\s+/).filter(Boolean).length} words
              </span>
              {note.drawings && note.drawings.length > 0 && (
                <>
                  <span>•</span>
                  <span>{note.drawings.length} drawings</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
