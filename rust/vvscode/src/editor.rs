use ropey::Rope;

// ── Editor ───────────────────────────────────────────────────────────────────

pub struct Editor {
    pub rope: Rope,
    pub cursor: usize,                // char offset — the source of truth
    pub anchor: usize,                // selection anchor (== cursor when no selection)
    pub preferred_col: Option<usize>, // sticky column for up/down movement
    pub scroll_offset: usize,         // line offset for vertical scrolling
}

impl Editor {
    pub fn new() -> Self {
        Self {
            rope: Rope::new(),
            cursor: 0,
            anchor: 0,
            preferred_col: None,
            scroll_offset: 0,
        }
    }

    // ── Derived position info ────────────────────────────────────────────

    pub fn len_lines(&self) -> usize {
        self.rope.len_lines()
    }

    pub fn cursor_row(&self) -> usize {
        self.rope.char_to_line(self.cursor)
    }

    pub fn cursor_col(&self) -> usize {
        let row = self.cursor_row();
        self.cursor - self.rope.line_to_char(row)
    }

    /// Visual length of a line (excluding trailing newline characters).
    pub fn line_len(&self, row: usize) -> usize {
        let line = self.rope.line(row);
        let len = line.len_chars();
        if len == 0 {
            return 0;
        }
        let last = line.char(len - 1);
        if last == '\n' {
            if len >= 2 && line.char(len - 2) == '\r' {
                len - 2
            } else {
                len - 1
            }
        } else {
            len
        }
    }

    /// Get the text content of a line without trailing newline.
    pub fn line_text(&self, row: usize) -> String {
        let line = self.rope.line(row);
        let mut s = line.to_string();
        if s.ends_with('\n') {
            s.pop();
            if s.ends_with('\r') {
                s.pop();
            }
        }
        s
    }

    /// Clamp cursor to valid range.
    pub fn clamp(&mut self) {
        let max = self.rope.len_chars();
        if self.cursor > max {
            self.cursor = max;
        }
        if self.anchor > max {
            self.anchor = max;
        }
    }

    // ── Selection ────────────────────────────────────────────────────────

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

    /// Returns (start_col, end_col) of selection on the given line, or None.
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

    // ── Editing operations ───────────────────────────────────────────────

    pub fn insert_char(&mut self, ch: char) {
        self.delete_selection();
        self.rope.insert_char(self.cursor, ch);
        self.cursor += 1;
        self.collapse_to_cursor();
        self.preferred_col = None;
    }

    pub fn insert_newline(&mut self) {
        self.delete_selection();
        self.rope.insert_char(self.cursor, '\n');
        self.cursor += 1;
        self.collapse_to_cursor();
        self.preferred_col = None;
    }

    pub fn backspace(&mut self) {
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

    pub fn char_at(&self, offset: usize) -> char {
        self.rope.char(offset)
    }

    // ── Movement ─────────────────────────────────────────────────────────
    //
    // `extend`: if true, keep the anchor in place (Shift held → extend selection).
    //           if false, collapse selection and move.

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

    // ── Scrolling ────────────────────────────────────────────────────────

    pub fn ensure_cursor_visible(&mut self, visible_lines: usize) {
        if visible_lines == 0 {
            return;
        }
        let row = self.cursor_row();
        if row < self.scroll_offset {
            self.scroll_offset = row;
        } else if row >= self.scroll_offset + visible_lines {
            self.scroll_offset = row - visible_lines + 1;
        }
    }
}
