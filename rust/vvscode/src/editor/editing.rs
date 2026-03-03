//! Text mutation operations: insert, delete, backspace, tab, word-delete.

use super::Editor;

// ── Editing operations ───────────────────────────────────────────────────────

impl Editor {
    pub fn insert_char(&mut self, ch: char) {
        self.commit_history();
        self.delete_selection();
        self.rope.insert_char(self.cursor, ch);
        self.cursor += 1;
        self.collapse_to_cursor();
        self.preferred_col = None;
    }

    pub fn insert_newline(&mut self) {
        self.commit_history();
        self.delete_selection();
        self.rope.insert_char(self.cursor, '\n');
        self.cursor += 1;
        self.collapse_to_cursor();
        self.preferred_col = None;
    }

    pub fn backspace(&mut self) {
        self.commit_history();
        if self.has_selection() {
            self.delete_selection();
        } else if self.cursor > 0 {
            self.rope.remove(self.cursor - 1..self.cursor);
            self.cursor -= 1;
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    pub fn delete(&mut self) {
        self.commit_history();
        if self.has_selection() {
            self.delete_selection();
        } else if self.cursor < self.rope.len_chars() {
            self.rope.remove(self.cursor..self.cursor + 1);
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    pub fn insert_tab(&mut self) {
        for _ in 0..4 {
            self.insert_char(' ');
        }
    }

    pub fn delete_word_backward(&mut self) {
        self.commit_history();
        if self.has_selection() {
            self.delete_selection();
            return;
        }
        let target = self.prev_word_boundary();
        if target < self.cursor {
            self.rope.remove(target..self.cursor);
            self.cursor = target;
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    pub fn delete_to_line_start(&mut self) {
        self.commit_history();
        if self.has_selection() {
            self.delete_selection();
            return;
        }
        let row = self.cursor_row();
        let line_start = self.rope.line_to_char(row);
        if line_start < self.cursor {
            self.rope.remove(line_start..self.cursor);
            self.cursor = line_start;
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    // ── Word boundary helpers ────────────────────────────────────────────

    pub fn prev_word_boundary(&self) -> usize {
        if self.cursor == 0 {
            return 0;
        }
        let mut pos = self.cursor - 1;
        // Skip whitespace/punctuation backward
        while pos > 0 && !self.char_at(pos).is_alphanumeric() {
            pos -= 1;
        }
        // Skip word chars backward
        while pos > 0 && self.char_at(pos - 1).is_alphanumeric() {
            pos -= 1;
        }
        pos
    }

    pub fn next_word_boundary(&self) -> usize {
        let max = self.rope.len_chars();
        if self.cursor >= max {
            return max;
        }
        let mut pos = self.cursor;
        // Skip current word chars forward
        while pos < max && self.char_at(pos).is_alphanumeric() {
            pos += 1;
        }
        // Skip whitespace/punctuation forward
        while pos < max && !self.char_at(pos).is_alphanumeric() {
            pos += 1;
        }
        pos
    }
}
