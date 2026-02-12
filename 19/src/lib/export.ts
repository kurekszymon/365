// Export utilities for notes

import type { Note } from "./notes";

/**
 * Download a file with the given content
 */
function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a timestamp as a readable date string
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a timestamp as ISO date for filenames
 */
function formatDateForFilename(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

/**
 * Sanitize a string for use in a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase()
    .slice(0, 50);
}

/**
 * Convert a single note to Markdown format
 */
export function noteToMarkdown(note: Note): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${note.title}`);
  lines.push("");

  // Metadata
  lines.push(`**Created:** ${formatDate(note.createdAt)}`);
  if (note.updatedAt !== note.createdAt) {
    lines.push(`**Updated:** ${formatDate(note.updatedAt)}`);
  }
  lines.push("");

  // Tags
  if (note.tags.length > 0) {
    lines.push(`**Tags:** ${note.tags.map((t) => `\`${t}\``).join(", ")}`);
    lines.push("");
  }

  // Content
  if (note.content) {
    lines.push("---");
    lines.push("");
    lines.push(note.content);
    lines.push("");
  }

  // Drawings
  if (note.drawings && note.drawings.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(`## Drawings (${note.drawings.length})`);
    lines.push("");
    note.drawings.forEach((drawing, index) => {
      lines.push(`### Drawing ${index + 1}`);
      lines.push(`![Drawing ${index + 1}](${drawing.dataUrl})`);
      lines.push("");
    });
  }

  return lines.join("\n");
}

/**
 * Convert multiple notes to a single Markdown document
 */
export function notesToMarkdown(notes: Note[]): string {
  const lines: string[] = [];

  lines.push("# Notes Export");
  lines.push("");
  lines.push(`**Exported:** ${formatDate(Date.now())}`);
  lines.push(`**Total Notes:** ${notes.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Table of contents
  lines.push("## Table of Contents");
  lines.push("");
  notes.forEach((note, index) => {
    lines.push(`${index + 1}. [${note.title}](#note-${index + 1})`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");

  // Each note
  notes.forEach((note, index) => {
    lines.push(`<a id="note-${index + 1}"></a>`);
    lines.push("");
    lines.push(noteToMarkdown(note));
    lines.push("");
    if (index < notes.length - 1) {
      lines.push("---");
      lines.push("");
    }
  });

  return lines.join("\n");
}

/**
 * Export a single note as JSON
 */
export function exportNoteAsJson(note: Note): void {
  const filename = `note_${sanitizeFilename(note.title)}_${formatDateForFilename(note.createdAt)}.json`;
  const content = JSON.stringify(note, null, 2);
  downloadFile(filename, content, "application/json");
}

/**
 * Export a single note as Markdown
 */
export function exportNoteAsMarkdown(note: Note): void {
  const filename = `note_${sanitizeFilename(note.title)}_${formatDateForFilename(note.createdAt)}.md`;
  const content = noteToMarkdown(note);
  downloadFile(filename, content, "text/markdown");
}

/**
 * Export all notes as a single JSON file
 */
export function exportAllNotesAsJson(notes: Note[]): void {
  const filename = `notes_export_${formatDateForFilename(Date.now())}.json`;
  const exportData = {
    exportedAt: Date.now(),
    exportedAtFormatted: formatDate(Date.now()),
    version: "1.0",
    notesCount: notes.length,
    notes: notes,
  };
  const content = JSON.stringify(exportData, null, 2);
  downloadFile(filename, content, "application/json");
}

/**
 * Export all notes as a single Markdown file
 */
export function exportAllNotesAsMarkdown(notes: Note[]): void {
  const filename = `notes_export_${formatDateForFilename(Date.now())}.md`;
  const content = notesToMarkdown(notes);
  downloadFile(filename, content, "text/markdown");
}

/**
 * Export a single note as plain text
 */
export function exportNoteAsText(note: Note): void {
  const filename = `note_${sanitizeFilename(note.title)}_${formatDateForFilename(note.createdAt)}.txt`;
  const lines: string[] = [];

  lines.push(note.title);
  lines.push("=".repeat(note.title.length));
  lines.push("");
  lines.push(`Created: ${formatDate(note.createdAt)}`);
  if (note.updatedAt !== note.createdAt) {
    lines.push(`Updated: ${formatDate(note.updatedAt)}`);
  }
  if (note.tags.length > 0) {
    lines.push(`Tags: ${note.tags.join(", ")}`);
  }
  lines.push("");
  lines.push("-".repeat(40));
  lines.push("");
  lines.push(note.content);

  if (note.drawings && note.drawings.length > 0) {
    lines.push("");
    lines.push("-".repeat(40));
    lines.push(`[Note contains ${note.drawings.length} drawing(s) - export as Markdown or JSON to include them]`);
  }

  const content = lines.join("\n");
  downloadFile(filename, content, "text/plain");
}
