//! Title bar and status bar rendering.

use gpui::{SharedString, div, prelude::*, px, rgb};

use super::{STATUS_BAR_H, TITLE_BAR_H, Workspace};

// ── Chrome rendering ─────────────────────────────────────────────────────────

impl Workspace {
    pub(crate) fn render_status_bar(&self) -> impl IntoElement {
        let total_lines = self.editor.len_lines();
        let total_chars = self.editor.visible_char_count();
        let cursor_row = self.editor.cursor_row();
        let cursor_col = self.editor.cursor_col();

        let sel_info = if self.editor.has_selection() {
            let count = self
                .editor
                .visible_char_count_in(self.editor.selection_start(), self.editor.selection_end());
            format!(" ({} selected)", count)
        } else {
            String::new()
        };

        div()
            .flex()
            .w_full()
            .h(px(STATUS_BAR_H))
            .bg(rgb(0x007acc))
            .items_center()
            .justify_between()
            .px(px(10.0))
            .text_xs()
            .text_color(rgb(0xffffff))
            .child(div().flex().gap(px(12.0)).child(SharedString::from(format!(
                "Ln {}, Col {}{}",
                cursor_row + 1,
                cursor_col + 1,
                sel_info
            ))))
            .child(
                div()
                    .flex()
                    .gap(px(12.0))
                    .child(SharedString::from(format!(
                        "{} lines, {} chars",
                        total_lines, total_chars
                    )))
                    .child("UTF-8")
                    .child("Rust")
                    .child("Spaces: 4"),
            )
    }

    pub(crate) fn render_title_bar(&self) -> impl IntoElement {
        let dirty_marker = if self.dirty { " ●" } else { "" };
        let title = match &self.current_file {
            Some(f) => format!("vvscode — {}{}", f, dirty_marker),
            None => format!("vvscode — untitled{}", dirty_marker),
        };
        div()
            .flex()
            .w_full()
            .h(px(TITLE_BAR_H))
            .bg(rgb(0x21252b))
            .border_b_1()
            .border_color(rgb(0x181a1f))
            .items_center()
            .justify_center()
            .text_xs()
            .text_color(rgb(0x9da5b4))
            .child(SharedString::from(title))
    }
}
