import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { tracking } from "../lib/tracking";
import { broadcastManager } from "../lib/broadcast";
import { useNotesStore } from "../lib/notesStore";

export const Route = createFileRoute("/new")({
  component: NewNotePage,
});

function NewNotePage() {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { createNote } = useNotesStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      alert("Please add a title or content for your note");
      return;
    }

    setIsSaving(true);

    try {
      tracking.setPostHog(posthog);
      const note = createNote(title, content, tags);

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
    if (title.trim() || content.trim() || tags.length > 0) {
      if (!window.confirm("Discard this note? All changes will be lost.")) {
        return;
      }
    }
    tracking.trackButtonClick("cancel_note", "new_note_page");
    navigate({ to: "/notes" });
  };

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

        <div className="form-footer">
          <div className="form-stats">
            <span>Characters: {content.length}</span>
            <span>•</span>
            <span>
              Words: {content.trim().split(/\s+/).filter(Boolean).length}
            </span>
            <span>•</span>
            <span>Tags: {tags.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
