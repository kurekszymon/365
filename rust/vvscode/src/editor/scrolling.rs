//! Viewport scroll management — keeping the cursor visible on screen.

use super::Editor;

// ── Scrolling ────────────────────────────────────────────────────────────────

impl Editor {
    /// Adjust scroll offsets so the cursor is always visible in the viewport.
    pub fn ensure_cursor_visible(&mut self, visible_lines: usize, visible_cols: usize) {
        let row = self.cursor_row();
        let col = self.cursor_col();

        // Vertical: keep cursor row inside [scroll_offset, scroll_offset + visible_lines)
        if row < self.scroll_offset {
            self.scroll_offset = row;
        } else if row >= self.scroll_offset + visible_lines {
            self.scroll_offset = row.saturating_sub(visible_lines - 1);
        }

        // Horizontal: keep cursor col inside [h_scroll_offset, h_scroll_offset + visible_cols)
        let h_margin = 5;
        if col < self.h_scroll_offset {
            self.h_scroll_offset = col.saturating_sub(h_margin);
        } else if col >= self.h_scroll_offset + visible_cols {
            self.h_scroll_offset = col.saturating_sub(visible_cols - 1) + h_margin;
        }
    }
}
