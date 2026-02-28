//! Buffer model — a rope-backed text buffer with cursor, selection, and scroll state.
//!
//! The `Editor` struct is the core data model. Behaviour is spread across
//! submodules to keep each file focused:
//!
//! - [`selection`]  — selection queries and manipulation
//! - [`editing`]    — text mutation (insert, delete, backspace, …)
//! - [`movement`]   — cursor movement (arrows, word, home/end, doc bounds)
//! - [`scrolling`]  — viewport scroll management

mod editing;
mod movement;
mod scrolling;
mod selection;

use ropey::Rope;

// ── Editor ───────────────────────────────────────────────────────────────────

pub struct Editor {
    pub rope: Rope,
    pub cursor: usize,                // char offset — the source of truth
    pub anchor: usize,                // selection anchor (== cursor when no selection)
    pub preferred_col: Option<usize>, // sticky column for up/down movement
    pub scroll_offset: usize,         // line offset for vertical scrolling
    pub h_scroll_offset: usize,       // column offset for horizontal scrolling
}

impl Editor {
    pub fn new() -> Self {
        Self {
            rope: Rope::new(),
            cursor: 0,
            anchor: 0,
            preferred_col: None,
            scroll_offset: 0,
            h_scroll_offset: 0,
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

    /// Count of visible characters (excluding `\n` and `\r`) in the entire buffer.
    pub fn visible_char_count(&self) -> usize {
        self.rope
            .chars()
            .filter(|&c| c != '\n' && c != '\r')
            .count()
    }

    /// Count of visible characters (excluding `\n` and `\r`) in a char range.
    pub fn visible_char_count_in(&self, start: usize, end: usize) -> usize {
        self.rope
            .slice(start..end)
            .chars()
            .filter(|&c| c != '\n' && c != '\r')
            .count()
    }

    /// Get the text content of a line without trailing newline.
    pub fn line_text(&self, row: usize) -> String {
        let start = self.rope.line_to_char(row);
        self.rope
            .slice(start..start + self.line_len(row))
            .to_string()
    }

    /// Return the character at the given char offset.
    pub fn char_at(&self, offset: usize) -> char {
        self.rope.char(offset)
    }

    /// Clamp cursor and anchor to valid range.
    pub fn clamp(&mut self) {
        let max = self.rope.len_chars();
        if self.cursor > max {
            self.cursor = max;
        }
        if self.anchor > max {
            self.anchor = max;
        }
    }

    // ── File loading ─────────────────────────────────────────────────────

    /// Replace the entire buffer with the given text, resetting cursor and scroll.
    pub fn load_text(&mut self, text: &str) {
        self.rope = Rope::from_str(text);
        self.cursor = 0;
        self.anchor = 0;
        self.preferred_col = None;
        self.scroll_offset = 0;
        self.h_scroll_offset = 0;
    }
}
