//! Undo/redo history — snapshot-based undo stack.
//!
//! Each snapshot captures the full rope text plus cursor and anchor positions.
//! This is simple and correct; for a small editor the memory cost is fine.

use ropey::Rope;

/// A single snapshot of the editor state that can be restored.
#[derive(Clone)]
pub(crate) struct Snapshot {
    pub text: Rope,
    pub cursor: usize,
    pub anchor: usize,
}

/// Undo/redo history backed by two stacks of snapshots.
pub struct UndoHistory {
    pub(crate) undo_stack: Vec<Snapshot>,
    pub(crate) redo_stack: Vec<Snapshot>,
    /// Maximum number of undo snapshots to keep.
    max_entries: usize,
}

impl UndoHistory {
    pub fn new() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_entries: 1000,
        }
    }

    /// Save the current state before a mutation.
    /// Clears the redo stack (any redo history is forfeited on new edits).
    pub fn save(&mut self, rope: &Rope, cursor: usize, anchor: usize) {
        self.redo_stack.clear();
        self.undo_stack.push(Snapshot {
            text: rope.clone(),
            cursor,
            anchor,
        });
        if self.undo_stack.len() > self.max_entries {
            self.undo_stack.remove(0);
        }
    }

    /// Pop the most recent undo snapshot, pushing the *current* state onto
    /// the redo stack. Returns `Some(snapshot)` to restore, or `None` if
    /// there is nothing to undo.
    pub fn undo(
        &mut self,
        current_rope: &Rope,
        current_cursor: usize,
        current_anchor: usize,
    ) -> Option<Snapshot> {
        let snapshot = self.undo_stack.pop()?;
        self.redo_stack.push(Snapshot {
            text: current_rope.clone(),
            cursor: current_cursor,
            anchor: current_anchor,
        });
        Some(snapshot)
    }

    /// Pop the most recent redo snapshot, pushing the *current* state onto
    /// the undo stack. Returns `Some(snapshot)` to restore, or `None` if
    /// there is nothing to redo.
    pub fn redo(
        &mut self,
        current_rope: &Rope,
        current_cursor: usize,
        current_anchor: usize,
    ) -> Option<Snapshot> {
        let snapshot = self.redo_stack.pop()?;
        self.undo_stack.push(Snapshot {
            text: current_rope.clone(),
            cursor: current_cursor,
            anchor: current_anchor,
        });
        Some(snapshot)
    }

    /// Clear all history (e.g. after loading a new file).
    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }
}
