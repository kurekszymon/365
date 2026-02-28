//! Selection queries and manipulation.

use super::Editor;

// ── Selection ────────────────────────────────────────────────────────────────

impl Editor {
    pub fn has_selection(&self) -> bool {
        self.cursor != self.anchor
    }

    pub fn selection_start(&self) -> usize {
        self.cursor.min(self.anchor)
    }

    pub fn selection_end(&self) -> usize {
        self.cursor.max(self.anchor)
    }

    /// Delete the selected text. If no selection, does nothing.
    pub fn delete_selection(&mut self) {
        if !self.has_selection() {
            return;
        }
        let start = self.selection_start();
        let end = self.selection_end();
        self.rope.remove(start..end);
        self.cursor = start;
        self.anchor = start;
    }

    /// Collapse selection without deleting (used by movement without Shift).
    pub fn collapse_to_cursor(&mut self) {
        self.anchor = self.cursor;
    }

    pub fn select_all(&mut self) {
        self.anchor = 0;
        self.cursor = self.rope.len_chars();
        self.preferred_col = None;
    }

    /// Returns `(start_col, end_col)` of selection on the given line, or `None`.
    pub fn selection_on_line(&self, line_idx: usize) -> Option<(usize, usize)> {
        if !self.has_selection() {
            return None;
        }
        let sel_start = self.selection_start();
        let sel_end = self.selection_end();
        let sel_start_line = self.rope.char_to_line(sel_start);
        let sel_end_line = self.rope.char_to_line(sel_end);

        if line_idx < sel_start_line || line_idx > sel_end_line {
            return None;
        }

        let line_start_char = self.rope.line_to_char(line_idx);
        let ll = self.line_len(line_idx);

        let start_col = if line_idx == sel_start_line {
            sel_start - line_start_char
        } else {
            0
        };
        let end_col = if line_idx == sel_end_line {
            (sel_end - line_start_char).min(ll)
        } else {
            ll
        };

        if start_col == end_col {
            None
        } else {
            Some((start_col, end_col))
        }
    }
}
