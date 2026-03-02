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
    /// If `extend` is true, keeps the anchor (extends selection); otherwise collapses.
    pub fn move_to_position(&mut self, row: usize, col: usize, extend: bool) {
        let max_row = self.len_lines().saturating_sub(1);
        let target_row = row.min(max_row);
        let max_col = self.line_len(target_row);
        let target_col = col.min(max_col);
        self.cursor = self.rope.line_to_char(target_row) + target_col;
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    /// Select the entire line at the given row (anchor at line start, cursor at
    /// start of next line — or end of document for the last line).
    pub fn select_line(&mut self, row: usize) {
        let max_row = self.len_lines().saturating_sub(1);
        let target_row = row.min(max_row);
        self.anchor = self.rope.line_to_char(target_row);
        if target_row < max_row {
            self.cursor = self.rope.line_to_char(target_row + 1);
        } else {
            self.cursor = self.rope.len_chars();
        }
        self.preferred_col = None;
    }

    /// Select the word surrounding the given (row, col). Places the anchor at
    /// the word start and the cursor at the word end.
    pub fn select_word_at(&mut self, row: usize, col: usize) {
        // First move to the position so cursor is inside the target word
        self.move_to_position(row, col, false);

        // If cursor is on a word character, expand to word boundaries
        if self.cursor < self.rope.len_chars() && self.char_at(self.cursor).is_alphanumeric() {
            // Find word start
            let mut start = self.cursor;
            while start > 0 && self.char_at(start - 1).is_alphanumeric() {
                start -= 1;
            }
            // Find word end
            let max = self.rope.len_chars();
            let mut end = self.cursor;
            while end < max && self.char_at(end).is_alphanumeric() {
                end += 1;
            }
            self.anchor = start;
            self.cursor = end;
        } else if self.cursor > 0 && self.char_at(self.cursor - 1).is_alphanumeric() {
            // Cursor is just past a word (e.g. clicked at end-of-word boundary)
            let mut start = self.cursor - 1;
            while start > 0 && self.char_at(start - 1).is_alphanumeric() {
                start -= 1;
            }
            self.anchor = start;
            // cursor is already at the word end
        }
        self.preferred_col = None;
    }
}
