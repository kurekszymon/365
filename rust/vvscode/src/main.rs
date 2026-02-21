use gpui::{
    App, Application, Bounds, Context, FocusHandle, KeyBinding, KeyDownEvent, SharedString, Window,
    WindowBounds, WindowOptions, actions, div, prelude::*, px, rgb, size,
};
use ropey::Rope;

// ── Actions ──────────────────────────────────────────────────────────────────

actions!(
    workspace,
    [
        ToggleLeftPanel,
        ToggleBottomPanel,
        ToggleRightPanel,
        SelectAll
    ]
);

// ── Editor ───────────────────────────────────────────────────────────────────

struct Editor {
    rope: Rope,
    cursor: usize,                // char offset — the source of truth
    anchor: usize,                // selection anchor (== cursor when no selection)
    preferred_col: Option<usize>, // sticky column for up/down movement
    scroll_offset: usize,         // line offset for vertical scrolling
}

impl Editor {
    fn new() -> Self {
        Self {
            rope: Rope::new(),
            cursor: 0,
            anchor: 0,
            preferred_col: None,
            scroll_offset: 0,
        }
    }

    // ── Derived position info ────────────────────────────────────────────

    fn len_lines(&self) -> usize {
        self.rope.len_lines()
    }

    fn cursor_row(&self) -> usize {
        self.rope.char_to_line(self.cursor)
    }

    fn cursor_col(&self) -> usize {
        let row = self.cursor_row();
        self.cursor - self.rope.line_to_char(row)
    }

    /// Visual length of a line (excluding trailing newline characters).
    fn line_len(&self, row: usize) -> usize {
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
    fn line_text(&self, row: usize) -> String {
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
    fn clamp(&mut self) {
        let max = self.rope.len_chars();
        if self.cursor > max {
            self.cursor = max;
        }
        if self.anchor > max {
            self.anchor = max;
        }
    }

    // ── Selection ────────────────────────────────────────────────────────

    fn has_selection(&self) -> bool {
        self.cursor != self.anchor
    }

    fn selection_start(&self) -> usize {
        self.cursor.min(self.anchor)
    }

    fn selection_end(&self) -> usize {
        self.cursor.max(self.anchor)
    }

    /// Delete the selected text. If no selection, does nothing.
    fn delete_selection(&mut self) {
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
    fn collapse_to_cursor(&mut self) {
        self.anchor = self.cursor;
    }

    fn select_all(&mut self) {
        self.anchor = 0;
        self.cursor = self.rope.len_chars();
        self.preferred_col = None;
    }

    /// Returns (start_col, end_col) of selection on the given line, or None.
    fn selection_on_line(&self, line_idx: usize) -> Option<(usize, usize)> {
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

    fn insert_char(&mut self, ch: char) {
        self.delete_selection();
        self.rope.insert_char(self.cursor, ch);
        self.cursor += 1;
        self.collapse_to_cursor();
        self.preferred_col = None;
    }

    fn insert_newline(&mut self) {
        self.delete_selection();
        self.rope.insert_char(self.cursor, '\n');
        self.cursor += 1;
        self.collapse_to_cursor();
        self.preferred_col = None;
    }

    fn backspace(&mut self) {
        if self.has_selection() {
            self.delete_selection();
        } else if self.cursor > 0 {
            self.rope.remove(self.cursor - 1..self.cursor);
            self.cursor -= 1;
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    fn delete(&mut self) {
        if self.has_selection() {
            self.delete_selection();
        } else if self.cursor < self.rope.len_chars() {
            self.rope.remove(self.cursor..self.cursor + 1);
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    fn insert_tab(&mut self) {
        for _ in 0..4 {
            self.insert_char(' ');
        }
    }

    fn delete_word_backward(&mut self) {
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

    fn delete_to_line_start(&mut self) {
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

    fn prev_word_boundary(&self) -> usize {
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

    fn next_word_boundary(&self) -> usize {
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

    fn char_at(&self, offset: usize) -> char {
        self.rope.char(offset)
    }

    // ── Movement ─────────────────────────────────────────────────────────
    //
    // `extend`: if true, keep the anchor in place (Shift held → extend selection).
    //           if false, collapse selection and move.

    fn move_left(&mut self, extend: bool) {
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

    fn move_right(&mut self, extend: bool) {
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

    fn move_up(&mut self, extend: bool) {
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

    fn move_down(&mut self, extend: bool) {
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

    fn move_home(&mut self, extend: bool) {
        let row = self.cursor_row();
        self.cursor = self.rope.line_to_char(row);
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    fn move_end(&mut self, extend: bool) {
        let row = self.cursor_row();
        self.cursor = self.rope.line_to_char(row) + self.line_len(row);
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    fn move_word_left(&mut self, extend: bool) {
        let target = self.prev_word_boundary();
        self.cursor = target;
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    fn move_word_right(&mut self, extend: bool) {
        let target = self.next_word_boundary();
        self.cursor = target;
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    fn move_to_doc_start(&mut self, extend: bool) {
        self.cursor = 0;
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    fn move_to_doc_end(&mut self, extend: bool) {
        self.cursor = self.rope.len_chars();
        if !extend {
            self.collapse_to_cursor();
        }
        self.preferred_col = None;
    }

    // ── Scrolling ────────────────────────────────────────────────────────

    fn ensure_cursor_visible(&mut self, visible_lines: usize) {
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

// ── Workspace ────────────────────────────────────────────────────────────────

struct Workspace {
    left_panel_visible: bool,
    bottom_panel_visible: bool,
    right_panel_visible: bool,
    editor: Editor,
    focus_handle: FocusHandle,
}

impl Workspace {
    fn new(cx: &mut Context<Self>) -> Self {
        Self {
            left_panel_visible: false,
            bottom_panel_visible: false,
            right_panel_visible: false,
            editor: Editor::new(),
            focus_handle: cx.focus_handle(),
        }
    }

    fn handle_key_down(&mut self, ev: &KeyDownEvent, _window: &mut Window, cx: &mut Context<Self>) {
        let keystroke = &ev.keystroke;
        let key = keystroke.key.as_str();
        let shift = keystroke.modifiers.shift;
        let cmd = keystroke.modifiers.platform;
        let alt = keystroke.modifiers.alt;
        let ctrl = keystroke.modifiers.control;
        let func = keystroke.modifiers.function;

        match key {
            // ── Movement keys — handle ALL modifier combos ───────────────
            //
            // macOS conventions:
            //   Cmd+Arrow   = line start/end or doc start/end
            //   Alt+Arrow   = word left/right
            //   Shift+*     = extend selection
            //   plain Arrow = move cursor
            "left" if cmd => self.editor.move_home(shift),
            "right" if cmd => self.editor.move_end(shift),
            "up" if cmd => self.editor.move_to_doc_start(shift),
            "down" if cmd => self.editor.move_to_doc_end(shift),

            "left" if alt || ctrl => self.editor.move_word_left(shift),
            "right" if alt || ctrl => self.editor.move_word_right(shift),

            "left" => self.editor.move_left(shift),
            "right" => self.editor.move_right(shift),
            "up" => self.editor.move_up(shift),
            "down" => self.editor.move_down(shift),
            "home" if cmd => self.editor.move_to_doc_start(shift),
            "end" if cmd => self.editor.move_to_doc_end(shift),
            "home" => self.editor.move_home(shift),
            "end" => self.editor.move_end(shift),

            // ── Editing keys with modifiers ──────────────────────────────
            "backspace" if cmd => self.editor.delete_to_line_start(),
            "backspace" if alt || ctrl => self.editor.delete_word_backward(),
            "backspace" => self.editor.backspace(),
            "delete" => self.editor.delete(),

            // ── Editing keys (only without cmd/ctrl/fn) ─────────────────
            _ if cmd || ctrl || func => return, // let action system handle

            "enter" => self.editor.insert_newline(),
            "tab" => self.editor.insert_tab(),
            "escape" | "shift" | "alt" | "capslock" => {}
            _ => {
                // Use key_char if available (for proper text input), otherwise use key
                let text: &str = keystroke.key_char.as_deref().unwrap_or(key);
                for ch in text.chars() {
                    if !ch.is_control() {
                        self.editor.insert_char(ch);
                    }
                }
            }
        }

        self.editor.clamp();
        cx.notify();
    }

    fn render_left_panel(&self) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .w(px(220.0))
            .h_full()
            .bg(rgb(0x21252b))
            .border_r_1()
            .border_color(rgb(0x181a1f))
            .child(
                div()
                    .px(px(12.0))
                    .py(px(10.0))
                    .text_xs()
                    .text_color(rgb(0x8b919a))
                    .font_weight(gpui::FontWeight::BOLD)
                    .child("EXPLORER"),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap(px(2.0))
                    .px(px(8.0))
                    .child(Self::file_entry("src/", true))
                    .child(Self::file_entry("  main.rs", false))
                    .child(Self::file_entry("Cargo.toml", false))
                    .child(Self::file_entry("Cargo.lock", false))
                    .child(Self::file_entry("README.md", false)),
            )
    }

    fn file_entry(name: &str, is_dir: bool) -> impl IntoElement {
        let color = if is_dir { rgb(0xc8ccd4) } else { rgb(0x9da5b4) };
        div()
            .px(px(6.0))
            .py(px(3.0))
            .text_sm()
            .text_color(color)
            .rounded(px(3.0))
            .hover(|s| s.bg(rgb(0x2c313a)))
            .child(SharedString::from(name.to_string()))
    }

    fn render_right_panel(&self) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .w(px(200.0))
            .h_full()
            .bg(rgb(0x21252b))
            .border_l_1()
            .border_color(rgb(0x181a1f))
            .child(
                div()
                    .px(px(12.0))
                    .py(px(10.0))
                    .text_xs()
                    .text_color(rgb(0x8b919a))
                    .font_weight(gpui::FontWeight::BOLD)
                    .child("OUTLINE"),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap(px(2.0))
                    .px(px(8.0))
                    .text_sm()
                    .text_color(rgb(0x9da5b4))
                    .child(div().px(px(6.0)).py(px(3.0)).child("No symbols found")),
            )
    }

    fn render_bottom_panel(&self) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .w_full()
            .h(px(180.0))
            .bg(rgb(0x1e1e1e))
            .border_t_1()
            .border_color(rgb(0x181a1f))
            .child(
                div()
                    .flex()
                    .gap(px(16.0))
                    .px(px(12.0))
                    .py(px(6.0))
                    .border_b_1()
                    .border_color(rgb(0x2d2d2d))
                    .child(
                        div()
                            .text_xs()
                            .text_color(rgb(0xe0e0e0))
                            .font_weight(gpui::FontWeight::BOLD)
                            .pb(px(4.0))
                            .border_b_2()
                            .border_color(rgb(0x007acc))
                            .child("TERMINAL"),
                    )
                    .child(div().text_xs().text_color(rgb(0x8b919a)).child("PROBLEMS"))
                    .child(div().text_xs().text_color(rgb(0x8b919a)).child("OUTPUT")),
            )
            .child(
                div()
                    .flex_1()
                    .p(px(12.0))
                    .text_sm()
                    .text_color(rgb(0x4ec9b0))
                    .font_family("Monaco")
                    .child("$ ▊"),
            )
    }

    fn render_editor(&self) -> impl IntoElement {
        let visible_lines: usize = 40;
        let total_lines = self.editor.len_lines();
        let start = self.editor.scroll_offset;
        let end = (start + visible_lines).min(total_lines);

        let cursor_row = self.editor.cursor_row();
        let cursor_col = self.editor.cursor_col();
        let has_selection = self.editor.has_selection();

        let mut editor_content = div()
            .flex()
            .flex_col()
            .flex_1()
            .w_full()
            .h_full()
            .bg(rgb(0x1e1e1e))
            .overflow_hidden()
            .font_family("Monaco")
            .text_sm();

        for i in start..end {
            let line_num = i + 1;
            let line = self.editor.line_text(i);
            let line_visual_len = self.editor.line_len(i);
            let is_cursor_line = i == cursor_row;

            let line_bg = if is_cursor_line && !has_selection {
                rgb(0x2a2d32)
            } else {
                rgb(0x1e1e1e)
            };

            let gutter_color = if is_cursor_line {
                rgb(0xc6c6c6)
            } else {
                rgb(0x5a5a5a)
            };

            let selection = self.editor.selection_on_line(i);

            // Build the text content area based on cursor/selection state
            let text_content = if has_selection && selection.is_some() {
                // Line has selection — split into before / selected / after
                let (sel_start, sel_end) = selection.unwrap();
                let sel_start = sel_start.min(line_visual_len);
                let sel_end = sel_end.min(line_visual_len);

                let before: String = line.chars().take(sel_start).collect();
                let selected: String = line
                    .chars()
                    .skip(sel_start)
                    .take(sel_end - sel_start)
                    .collect();
                let after: String = line.chars().skip(sel_end).collect();

                let mut content = div().flex().text_color(rgb(0xd4d4d4));

                if !before.is_empty() {
                    content = content.child(SharedString::from(before));
                }
                content = content.child(div().bg(rgb(0x264f78)).text_color(rgb(0xd4d4d4)).child(
                    if selected.is_empty() {
                        SharedString::from(" ")
                    } else {
                        SharedString::from(selected)
                    },
                ));
                if !after.is_empty() {
                    content = content.child(SharedString::from(after));
                }

                // If cursor is on this line (at one end of the selection), show a
                // thin-style indicator via the selection highlight — no block cursor
                content
            } else if is_cursor_line {
                // No selection, cursor line — render full text unsplit with
                // an absolutely-positioned cursor overlay so nothing shifts.
                let col = cursor_col.min(line_visual_len);
                let before: String = line.chars().take(col).collect();
                let full_text = if line.is_empty() {
                    " ".to_string()
                } else {
                    line.clone()
                };

                div()
                    .relative()
                    .text_color(rgb(0xd4d4d4))
                    .child(SharedString::from(full_text))
                    .child(
                        div()
                            .absolute()
                            .top_0()
                            .left_0()
                            .bottom_0()
                            .flex()
                            .child(
                                // Invisible spacer: same text as "before" to
                                // push the cursor bar to the correct column.
                                div().opacity(0.).child(SharedString::from(before)),
                            )
                            .child(div().w(px(2.0)).bg(rgb(0xd4d4d4))),
                    )
            } else {
                // Normal line — no cursor, no selection
                div().text_color(rgb(0xd4d4d4)).child(if line.is_empty() {
                    SharedString::from(" ")
                } else {
                    SharedString::from(line)
                })
            };

            let line_el = div()
                .flex()
                .w_full()
                .bg(line_bg)
                .child(
                    div()
                        .w(px(50.0))
                        .text_color(gutter_color)
                        .text_right()
                        .pr(px(12.0))
                        .flex_shrink_0()
                        .child(SharedString::from(format!("{}", line_num))),
                )
                .child(div().flex().flex_1().pl(px(4.0)).child(text_content));

            editor_content = editor_content.child(line_el);
        }

        editor_content
    }

    fn render_status_bar(&self) -> impl IntoElement {
        let total_lines = self.editor.len_lines();
        let total_chars = self.editor.rope.len_chars();
        let cursor_row = self.editor.cursor_row();
        let cursor_col = self.editor.cursor_col();

        let sel_info = if self.editor.has_selection() {
            let count = self.editor.selection_end() - self.editor.selection_start();
            format!(" ({} selected)", count)
        } else {
            String::new()
        };

        div()
            .flex()
            .w_full()
            .h(px(24.0))
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

    fn render_title_bar(&self) -> impl IntoElement {
        div()
            .flex()
            .w_full()
            .h(px(36.0))
            .bg(rgb(0x21252b))
            .border_b_1()
            .border_color(rgb(0x181a1f))
            .items_center()
            .justify_center()
            .text_xs()
            .text_color(rgb(0x9da5b4))
            .child("vvscode — main.rs")
    }
}

impl Render for Workspace {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        // Ensure cursor is visible (estimate ~40 visible lines)
        self.editor.ensure_cursor_visible(40);

        let _ = self.focus_handle.focus(window);

        let mut main_content = div().flex().flex_1().w_full().overflow_hidden();

        // Left panel
        if self.left_panel_visible {
            main_content = main_content.child(self.render_left_panel());
        }

        // Center: editor + optional bottom panel
        let mut center = div().flex().flex_col().flex_1().h_full().overflow_hidden();

        center = center.child(self.render_editor());

        if self.bottom_panel_visible {
            center = center.child(self.render_bottom_panel());
        }

        main_content = main_content.child(center);

        // Right panel
        if self.right_panel_visible {
            main_content = main_content.child(self.render_right_panel());
        }

        div()
            .key_context("Workspace")
            .track_focus(&self.focus_handle)
            .on_action(cx.listener(|this, _: &ToggleLeftPanel, _window, cx| {
                this.left_panel_visible = !this.left_panel_visible;
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &ToggleBottomPanel, _window, cx| {
                this.bottom_panel_visible = !this.bottom_panel_visible;
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &ToggleRightPanel, _window, cx| {
                this.right_panel_visible = !this.right_panel_visible;
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &SelectAll, _window, cx| {
                this.editor.select_all();
                cx.notify();
            }))
            .on_key_down(cx.listener(Self::handle_key_down))
            .flex()
            .flex_col()
            .size_full()
            .bg(rgb(0x1e1e1e))
            .child(self.render_title_bar())
            .child(main_content)
            .child(self.render_status_bar())
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

fn main() {
    Application::new().run(|cx: &mut App| {
        cx.bind_keys([
            KeyBinding::new("cmd-b", ToggleLeftPanel, Some("Workspace")),
            KeyBinding::new("cmd-`", ToggleBottomPanel, Some("Workspace")),
            KeyBinding::new("cmd-r", ToggleRightPanel, Some("Workspace")),
            KeyBinding::new("cmd-a", SelectAll, Some("Workspace")),
        ]);

        let bounds = Bounds::centered(None, size(px(1200.), px(800.0)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                ..Default::default()
            },
            |_, cx| cx.new(|cx| Workspace::new(cx)),
        )
        .unwrap();
    });
}
