/**
 * # Notes Export/Import System
 *
 * This module handles exporting and importing notes with their associated drawings.
 *
 * ## Why Numbered Image References?
 *
 * Instead of embedding large base64 strings directly in the content, we use numbered
 * references like `$img_1`, `$img_2`, etc. This approach has several benefits:
 *
 * 1. **Readability**: The note content stays clean and human-readable
 * 2. **Manageability**: Easy to see how many images exist and their relationships
 * 3. **Deduplication**: Assets are stored once in a separate section
 * 4. **Import-friendly**: Simple to parse and reconstruct notes programmatically
 * 5. **Smaller diffs**: When editing exports, changes to content don't affect image data
 *
 * ## Export Format Structure
 *
 * ### JSON Format
 * ```json
 * {
 *   "exportedAt": 1707654000000,
 *   "version": "1.0",
 *   "notesCount": 2,
 *   "notes": [
 *     {
 *       "id": "uuid",
 *       "title": "Note Title",
 *       "content": "Text content...",
 *       "tags": ["tag1", "tag2"],
 *       "drawingRefs": [
 *         { "ref": "$img_1", "id": "drawing-uuid", "createdAt": 1707600000000 }
 *       ]
 *     }
 *   ],
 *   "assets": {
 *     "$img_1": "data:image/png;base64,..."
 *   }
 * }
 * ```
 *
 * ### Markdown Format
 * Notes are exported with image references in the content, and all assets
 * are collected in a JSON code block at the end of the file. This keeps
 * the document readable while preserving all image data for import.
 *
 * ## Import Process
 *
 * 1. Parse the JSON file to extract notes and assets
 * 2. For each note, resolve `drawingRefs` by looking up `$img_X` in assets
 * 3. Reconstruct full `Drawing` objects with the base64 data
 * 4. Generate new IDs to avoid conflicts with existing notes
 * 5. Save to the notes store
 */

import type { Note, Drawing } from "./notes";
import { notesStore } from "./notes";

// ============================================================================
// TYPES
// ============================================================================

interface DrawingRef {
  ref: string;
  id: string;
  createdAt: number;
}

interface NoteWithRefs {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  drawingRefs: DrawingRef[];
}

interface SingleNoteExportData {
  exportedAt: number;
  exportedAtFormatted: string;
  version: string;
  note: NoteWithRefs;
  assets: Record<string, string>;
}

interface ExportDataWithRefs {
  exportedAt: number;
  exportedAtFormatted: string;
  version: string;
  notesCount: number;
  notes: NoteWithRefs[];
  assets: Record<string, string>;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
  importedNotes: Note[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
 * Create a numbered reference for an image (e.g., "$img_1", "$img_2")
 * These references are used instead of inline base64 to keep exports readable
 */
function createImageRef(index: number): string {
  return `$img_${index}`;
}

/**
 * Extract image data from drawings and create a reference map
 * Returns both the refs (for use in note content) and assets (for the assets section)
 */
function extractImageAssets(
  drawings: Drawing[],
  startIndex: number = 1,
): { refs: string[]; assets: Record<string, string> } {
  const refs: string[] = [];
  const assets: Record<string, string> = {};

  drawings.forEach((drawing, i) => {
    const ref = createImageRef(startIndex + i);
    refs.push(ref);
    assets[ref] = drawing.dataUrl;
  });

  return { refs, assets };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Convert a single note to Markdown format with numbered image references
 * Images are referenced as $img_X and actual data is returned separately in assets
 */
export function noteToMarkdown(
  note: Note,
  imageStartIndex: number = 1,
): { content: string; assets: Record<string, string> } {
  const lines: string[] = [];
  let assets: Record<string, string> = {};

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

  // Drawings with numbered references
  if (note.drawings && note.drawings.length > 0) {
    const { refs, assets: drawingAssets } = extractImageAssets(
      note.drawings,
      imageStartIndex,
    );
    assets = drawingAssets;

    lines.push("---");
    lines.push("");
    lines.push(`## Drawings (${note.drawings.length})`);
    lines.push("");
    refs.forEach((ref, index) => {
      lines.push(`### Drawing ${index + 1}`);
      lines.push(`![Drawing ${index + 1}](${ref})`);
      lines.push("");
    });
  }

  return { content: lines.join("\n"), assets };
}

/**
 * Format assets section for Markdown
 * Assets are stored as JSON in a code block at the end of the file
 * This keeps the main content readable while preserving all image data
 */
function formatAssetsSection(assets: Record<string, string>): string {
  const entries = Object.entries(assets);
  if (entries.length === 0) return "";

  const lines: string[] = [];
  lines.push("---");
  lines.push("");
  lines.push("## Assets");
  lines.push("");
  lines.push("<!-- Image data for numbered references. Used for import. -->");
  lines.push("```json");
  lines.push(JSON.stringify(assets, null, 2));
  lines.push("```");

  return lines.join("\n");
}

/**
 * Convert multiple notes to a single Markdown document
 * Includes table of contents and all assets collected at the end
 */
export function notesToMarkdown(notes: Note[]): string {
  const lines: string[] = [];
  let allAssets: Record<string, string> = {};
  let imageIndex = 1;

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

    const drawingCount = note.drawings?.length || 0;
    const { content, assets } = noteToMarkdown(note, imageIndex);
    lines.push(content);
    lines.push("");

    // Merge assets
    allAssets = { ...allAssets, ...assets };
    imageIndex += drawingCount;

    if (index < notes.length - 1) {
      lines.push("---");
      lines.push("");
    }
  });

  // Add assets section at the end
  if (Object.keys(allAssets).length > 0) {
    lines.push("");
    lines.push(formatAssetsSection(allAssets));
  }

  return lines.join("\n");
}

/**
 * Prepare note for JSON export with numbered image references
 * Separates drawing data from note structure for cleaner exports
 */
function prepareNoteForJson(
  note: Note,
  imageStartIndex: number = 1,
): { note: NoteWithRefs; assets: Record<string, string> } {
  const assets: Record<string, string> = {};

  const noteWithRefs: NoteWithRefs = {
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.tags,
    drawingRefs: [],
  };

  if (note.drawings && note.drawings.length > 0) {
    note.drawings.forEach((drawing, i) => {
      const ref = createImageRef(imageStartIndex + i);
      noteWithRefs.drawingRefs.push({
        ref,
        id: drawing.id,
        createdAt: drawing.createdAt,
      });
      assets[ref] = drawing.dataUrl;
    });
  }

  return { note: noteWithRefs, assets };
}

/**
 * Export a single note as JSON with numbered references
 */
export function exportNoteAsJson(note: Note): void {
  const filename = `note_${sanitizeFilename(note.title)}_${formatDateForFilename(note.createdAt)}.json`;

  const { note: noteWithRefs, assets } = prepareNoteForJson(note);

  const exportData: SingleNoteExportData = {
    exportedAt: Date.now(),
    exportedAtFormatted: formatDate(Date.now()),
    version: "1.0",
    note: noteWithRefs,
    assets,
  };

  const content = JSON.stringify(exportData, null, 2);
  downloadFile(filename, content, "application/json");
}

/**
 * Export a single note as Markdown
 */
export function exportNoteAsMarkdown(note: Note): void {
  const filename = `note_${sanitizeFilename(note.title)}_${formatDateForFilename(note.createdAt)}.md`;

  const { content, assets } = noteToMarkdown(note);
  let finalContent = content;

  if (Object.keys(assets).length > 0) {
    finalContent += "\n" + formatAssetsSection(assets);
  }

  downloadFile(filename, finalContent, "text/markdown");
}

/**
 * Export all notes as a single JSON file with numbered references
 */
export function exportAllNotesAsJson(notes: Note[]): void {
  const filename = `notes_export_${formatDateForFilename(Date.now())}.json`;

  let allAssets: Record<string, string> = {};
  let imageIndex = 1;
  const notesWithRefs: NoteWithRefs[] = [];

  notes.forEach((note) => {
    const drawingCount = note.drawings?.length || 0;
    const { note: noteWithRefs, assets } = prepareNoteForJson(note, imageIndex);
    notesWithRefs.push(noteWithRefs);
    allAssets = { ...allAssets, ...assets };
    imageIndex += drawingCount;
  });

  const exportData: ExportDataWithRefs = {
    exportedAt: Date.now(),
    exportedAtFormatted: formatDate(Date.now()),
    version: "1.0",
    notesCount: notes.length,
    notes: notesWithRefs,
    assets: allAssets,
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
 * Note: Drawings are not included in plain text exports
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
    lines.push(
      `[Note contains ${note.drawings.length} drawing(s) - export as Markdown or JSON to include them]`,
    );
  }

  const content = lines.join("\n");
  downloadFile(filename, content, "text/plain");
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Reconstruct a Drawing object from a reference and assets map
 */
function resolveDrawingRef(
  drawingRef: DrawingRef,
  assets: Record<string, string>,
): Drawing | null {
  const dataUrl = assets[drawingRef.ref];
  if (!dataUrl) {
    console.warn(`Asset not found for reference: ${drawingRef.ref}`);
    return null;
  }

  return {
    id: crypto.randomUUID(), // Generate new ID to avoid conflicts
    dataUrl,
    createdAt: drawingRef.createdAt,
  };
}

/**
 * Reconstruct a full Note from NoteWithRefs and assets
 */
function reconstructNote(
  noteWithRefs: NoteWithRefs,
  assets: Record<string, string>,
): Note {
  const drawings: Drawing[] = [];

  noteWithRefs.drawingRefs.forEach((ref) => {
    const drawing = resolveDrawingRef(ref, assets);
    if (drawing) {
      drawings.push(drawing);
    }
  });

  return {
    id: crypto.randomUUID(), // Generate new ID to avoid conflicts
    title: noteWithRefs.title,
    content: noteWithRefs.content,
    createdAt: noteWithRefs.createdAt,
    updatedAt: noteWithRefs.updatedAt,
    tags: noteWithRefs.tags,
    drawings,
  };
}

/**
 * Validate the structure of imported JSON data
 */
function validateImportData(
  data: unknown,
): data is ExportDataWithRefs | SingleNoteExportData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Check for required fields
  if (typeof obj.version !== "string" || typeof obj.assets !== "object") {
    return false;
  }

  // Check if it's a single note export
  if ("note" in obj && obj.note && typeof obj.note === "object") {
    return true;
  }

  // Check if it's a multi-note export
  if ("notes" in obj && Array.isArray(obj.notes)) {
    return true;
  }

  return false;
}

/**
 * Check if data is a single note export
 */
function isSingleNoteExport(
  data: ExportDataWithRefs | SingleNoteExportData,
): data is SingleNoteExportData {
  return "note" in data && !("notes" in data);
}

/**
 * Import notes from a JSON string
 *
 * Process:
 * 1. Parse JSON and validate structure
 * 2. Extract notes and assets
 * 3. Resolve drawing references to full Drawing objects
 * 4. Generate new IDs to avoid conflicts
 * 5. Save to notes store
 *
 * @param jsonString - The JSON content to import
 * @returns ImportResult with success status and details
 */
export function importNotesFromJson(jsonString: string): ImportResult {
  const result: ImportResult = {
    success: false,
    importedCount: 0,
    skippedCount: 0,
    errors: [],
    importedNotes: [],
  };

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    result.errors.push(
      `Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`,
    );
    return result;
  }

  // Validate structure
  if (!validateImportData(data)) {
    result.errors.push(
      "Invalid export format: missing required fields (version, assets, notes/note)",
    );
    return result;
  }

  const assets = data.assets as Record<string, string>;

  // Get notes array
  let notesToImport: NoteWithRefs[];
  if (isSingleNoteExport(data)) {
    notesToImport = [data.note];
  } else {
    notesToImport = data.notes;
  }

  // Import each note
  notesToImport.forEach((noteWithRefs, index) => {
    try {
      // Validate note structure
      if (!noteWithRefs.title || typeof noteWithRefs.title !== "string") {
        result.errors.push(`Note ${index + 1}: Missing or invalid title`);
        result.skippedCount++;
        return;
      }

      // Reconstruct full note with resolved drawings
      const note = reconstructNote(noteWithRefs, assets);

      // Save to store
      const savedNote = notesStore.createNote(
        note.title,
        note.content,
        note.tags,
        note.drawings,
      );

      result.importedNotes.push(savedNote);
      result.importedCount++;
    } catch (e) {
      result.errors.push(
        `Note ${index + 1} (${noteWithRefs.title || "unknown"}): ${e instanceof Error ? e.message : "Import error"}`,
      );
      result.skippedCount++;
    }
  });

  result.success = result.importedCount > 0;
  return result;
}

/**
 * Import notes from a File object
 * Reads the file and delegates to importNotesFromJson
 */
export async function importNotesFromFile(file: File): Promise<ImportResult> {
  // Validate file type
  if (!file.name.endsWith(".json")) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      errors: [
        "Only JSON files are supported for import. Export your notes as JSON to use import.",
      ],
      importedNotes: [],
    };
  }

  // Read file content
  try {
    const content = await file.text();
    return importNotesFromJson(content);
  } catch (e) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      errors: [
        `Failed to read file: ${e instanceof Error ? e.message : "Read error"}`,
      ],
      importedNotes: [],
    };
  }
}

/**
 * Create a file input and trigger import
 * Returns a promise that resolves when import is complete
 */
export function triggerImportDialog(): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({
          success: false,
          importedCount: 0,
          skippedCount: 0,
          errors: ["No file selected"],
          importedNotes: [],
        });
        return;
      }

      const result = await importNotesFromFile(file);
      resolve(result);
    };

    input.oncancel = () => {
      resolve({
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: ["Import cancelled"],
        importedNotes: [],
      });
    };

    input.click();
  });
}
