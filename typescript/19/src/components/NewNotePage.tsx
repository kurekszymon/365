import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { tracking } from "../lib/tracking";
import { broadcastManager } from "../lib/broadcast";
import { useNotesStore } from "../lib/notesStore";
import type { Drawing } from "../lib/notes";
import CanvasDrawing from "./CanvasDrawing";

export default function NewNotePage() {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { createNote } = useNotesStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [editingDrawingId, setEditingDrawingId] = useState<string | null>(null);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    setDrawings([...drawings, newDrawing]);
    setShowCanvas(false);
    setEditingDrawingId(null);
  };

  const handleUpdateDrawing = (dataUrl: string) => {
    if (!editingDrawingId) return;
    setDrawings(
      drawings.map((d) => (d.id === editingDrawingId ? { ...d, dataUrl } : d)),
    );
    setShowCanvas(false);
    setEditingDrawingId(null);
  };

  const handleDeleteDrawing = (drawingId: string) => {
    if (window.confirm("Delete this drawing?")) {
      setDrawings(drawings.filter((d) => d.id !== drawingId));
    }
  };

  const handleEditDrawing = (drawing: Drawing) => {
    setEditingDrawingId(drawing.id);
    setShowCanvas(true);
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim() && drawings.length === 0) {
      alert("Please add a title, content, or drawing for your note");
      return;
    }

    setIsSaving(true);

    try {
      tracking.setPostHog(posthog);
      const note = createNote(title, content, tags, drawings);

      tracking.trackNoteCreated(note.id, note.title, note.tags.length);
      tracking.trackButtonClick("save_note", "new_note_page");

      // Broadcast to other tabs
      broadcastManager.broadcast("NOTE_CREATED", {
        noteId: note.id,
        title: note.title,
        tagsCount: note.tags.length,
      });

      // Navigate to the new note
      await navigate({ to: "/notes/$noteId", params: { noteId: note.id } });
    } catch (error) {
      console.error("Failed to save note:", error);
      tracking.trackError(error as Error, "save_note");
      alert("Failed to save note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (
      title.trim() ||
      content.trim() ||
      tags.length > 0 ||
      drawings.length > 0
    ) {
      if (!window.confirm("Discard this note? All changes will be lost.")) {
        return;
      }
    }
    tracking.trackButtonClick("cancel_note", "new_note_page");
    navigate({ to: "/notes" });
  };

  if (showCanvas) {
    const editingDrawing = editingDrawingId
      ? drawings.find((d) => d.id === editingDrawingId)
      : null;

    return (
      <div className="new-note-page">
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
    <div className="new-note-page">
      <div className="page-header">
        <h1>Create New Note</h1>
        <div className="header-actions">
          <button
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>

      <div className="note-form">
        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="Enter note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="content" className="form-label">
            Content
          </label>
          <textarea
            id="content"
            placeholder="Start writing your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="form-textarea"
            rows={15}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags" className="form-label">
            Tags
          </label>
          <div className="tags-input-wrapper">
            <input
              id="tags"
              type="text"
              placeholder="Add a tag and press Enter..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
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

          {tags.length > 0 && (
            <div className="tags-list">
              {tags.map((tag) => (
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

          {drawings.length > 0 && (
            <div className="drawings-list">
              {drawings.map((drawing) => (
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
            <span>Characters: {content.length}</span>
            <span>•</span>
            <span>
              Words: {content.trim().split(/\s+/).filter(Boolean).length}
            </span>
            <span>•</span>
            <span>Tags: {tags.length}</span>
            <span>•</span>
            <span>Drawings: {drawings.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
