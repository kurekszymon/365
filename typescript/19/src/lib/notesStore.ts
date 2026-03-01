import { create } from "zustand";
import { notesStore, type Note, type Drawing } from "./notes";
import { broadcastManager } from "./broadcast";

interface NotesState {
  notes: Note[];
  allTags: string[];

  // Actions
  loadNotes: () => void;
  loadTags: () => void;
  createNote: (
    title: string,
    content: string,
    tags: string[],
    drawings?: Drawing[],
  ) => Note;
  updateNote: (
    id: string,
    updates: Partial<Omit<Note, "id" | "createdAt">>,
  ) => Note | undefined;
  deleteNote: (id: string) => boolean;
  refreshNotes: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: notesStore.getAllNotes(),
  allTags: notesStore.getAllTags(),

  loadNotes: () => {
    set({ notes: notesStore.getAllNotes() });
  },

  loadTags: () => {
    set({ allTags: notesStore.getAllTags() });
  },

  createNote: (
    title: string,
    content: string,
    tags: string[],
    drawings: Drawing[] = [],
  ) => {
    const note = notesStore.createNote(title, content, tags, drawings);
    get().refreshNotes();
    return note;
  },

  updateNote: (
    id: string,
    updates: Partial<Omit<Note, "id" | "createdAt">>,
  ) => {
    const updatedNote = notesStore.updateNote(id, updates);
    if (updatedNote) {
      get().refreshNotes();
    }
    return updatedNote;
  },

  deleteNote: (id: string) => {
    const deleted = notesStore.deleteNote(id);
    if (deleted) {
      get().refreshNotes();
    }
    return deleted;
  },

  refreshNotes: () => {
    notesStore.reload();
    set({
      notes: notesStore.getAllNotes(),
      allTags: notesStore.getAllTags(),
    });
  },
}));

// Listen to broadcast events and refresh store
broadcastManager.on("*", (message) => {
  if (message.type.startsWith("NOTE_")) {
    useNotesStore.getState().refreshNotes();
  }
});
