//! Cursor movement — arrow keys, home/end, word jumps, document boundaries.

use super::Editor;

// ── Movement ─────────────────────────────────────────────────────────────────
//
// `extend`: if true, keep the anchor in place (Shift held → extend selection).
//           if false, collapse selection and move.

impl Editor {
    pub fn move_left(&mut self, extend: bool) {
        if !extend && self.has_selection() {
            // Collapse to the left edge of the selection
            self.cursor = self.selection_start();
            self.collapse_to_cursor();
        } else if self.cursor > 0 {
            self.cursor -= 1;
            if !extend {
                self.collapse_to_cursor();
            }
        }
        self.preferred_col = None;
    }

    pub fn move_right(&mut self, extend: bool) {
        if !extend && self.has_selection() {
            // Collapse to the right edge of the selection
            self.cursor = self.selection_end();
            self.collapse_to_cursor();
        } else if self.cursor < self.rope.len_chars() {
            self.cursor += 1;
            if !extend {
                self.collapse_to_cursor();
            }
        }
        self.preferred_col = None;
    }

    pub fn move_up(&mut self, extend: bool) {
        let row = self.cursor_row();
        if row == 0 {
            // Move to start of document
            self.cursor = 0;
            if !extend {
                self.collapse_to_cursor();
            }
            return;
        }

        let current_col = self.cursor_col();
        let target_col = self.preferred_col.unwrap_or(current_col);
        self.preferred_col = Some(target_col);

        let prev_row = row - 1;
        let prev_line_len = self.line_len(prev_row);
        let clamped_col = target_col.min(prev_line_len);

        self.cursor = self.rope.line_to_char(prev_row) + clamped_col;
        if !extend {
            self.collapse_to_cursor();
        }
    }

    pub fn move_down(&mut self, extend: bool) {
        let row = self.cursor_row();
        if row + 1 >= self.len_lines() {
            // Move to end of document
            self.cursor = self.rope.len_chars();
            if !extend {
                self.collapse_to_cursor();
            }
            return;
        }

        let current_col = self.cursor_col();
        let target_col = self.preferred_col.unwrap_or(current_col);
        self.preferred_col = Some(target_col);

        let next_row = row + 1;
        let next_line_len = self.line_len(next_row);
        let clamped_col = target_col.min(next_line_len);

        self.cursor = self.rope.line_to_char(next_row) + clamped_col;
        if !extend {
            self.collapse_to_cursor();
        }
    }

    pub fn move_home(&mut self, extend: bool) {
        let row = self.cursor_row();
        self.cursor = self.rope.line_to_char(row);
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    pub fn move_end(&mut self, extend: bool) {
        let row = self.cursor_row();
        self.cursor = self.rope.line_to_char(row) + self.line_len(row);
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    pub fn move_word_left(&mut self, extend: bool) {
        let target = self.prev_word_boundary();
        self.cursor = target;
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    pub fn move_word_right(&mut self, extend: bool) {
        let target = self.next_word_boundary();
        self.cursor = target;
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    pub fn move_to_doc_start(&mut self, extend: bool) {
        self.cursor = 0;
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    pub fn move_to_doc_end(&mut self, extend: bool) {
        self.cursor = self.rope.len_chars();
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    /// Place the cursor at the given (row, col), clamped to valid bounds.
    /// Collapses any existing selection.
    pub fn move_to_position(&mut self, row: usize, col: usize) {
        let max_row = self.len_lines().saturating_sub(1);
        let target_row = row.min(max_row);
        let max_col = self.line_len(target_row);
        let target_col = col.min(max_col);
        self.cursor = self.rope.line_to_char(target_row) + target_col;
        self.collapse_to_cursor();
        self.preferred_col = None;
    }
}
