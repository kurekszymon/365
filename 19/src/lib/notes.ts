// Notes storage and management with localStorage

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
};

const NOTES_STORAGE_KEY = 'notes-app-notes';

export class NotesStore {
  private static instance: NotesStore;
  private notes: Map<string, Note> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): NotesStore {
    if (!NotesStore.instance) {
      NotesStore.instance = new NotesStore();
    }
    return NotesStore.instance;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) {
        const notesArray: Note[] = JSON.parse(stored);
        this.notes = new Map(notesArray.map(note => [note.id, note]));
      }
    } catch (error) {
      console.error('Failed to load notes from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const notesArray = Array.from(this.notes.values());
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesArray));
    } catch (error) {
      console.error('Failed to save notes to storage:', error);
    }
  }

  getAllNotes(): Note[] {
    return Array.from(this.notes.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getNote(id: string): Note | undefined {
    return this.notes.get(id);
  }

  createNote(title: string, content: string, tags: string[] = []): Note {
    const now = Date.now();
    const note: Note = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Untitled Note',
      content,
      createdAt: now,
      updatedAt: now,
      tags,
    };

    this.notes.set(note.id, note);
    this.saveToStorage();
    return note;
  }

  updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Note | undefined {
    const note = this.notes.get(id);
    if (!note) {
      return undefined;
    }

    const updatedNote: Note = {
      ...note,
      ...updates,
      updatedAt: Date.now(),
    };

    this.notes.set(id, updatedNote);
    this.saveToStorage();
    return updatedNote;
  }

  deleteNote(id: string): boolean {
    const deleted = this.notes.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  searchNotes(query: string): Note[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return this.getAllNotes();
    }

    return this.getAllNotes().filter(note =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  getNotesByTag(tag: string): Note[] {
    return this.getAllNotes().filter(note => note.tags.includes(tag));
  }

  getAllTags(): string[] {
    const tagsSet = new Set<string>();
    this.notes.forEach(note => {
      note.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }

  getNotesCount(): number {
    return this.notes.size;
  }

  clearAll(): void {
    this.notes.clear();
    this.saveToStorage();
  }
}

export const notesStore = NotesStore.getInstance();
