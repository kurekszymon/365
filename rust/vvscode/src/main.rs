use gpui::{
    App, Application, Bounds, Context, FocusHandle, KeyBinding, KeyDownEvent, SharedString, Window,
    WindowBounds, WindowOptions, actions, div, prelude::*, px, rgb, size,
};
use ropey::Rope;

// ── Actions ──────────────────────────────────────────────────────────────────

actions!(
    workspace,
    [ToggleLeftPanel, ToggleBottomPanel, ToggleRightPanel]
);

// ── Editor ───────────────────────────────────────────────────────────────────

struct Editor {
    rope: Rope,
    cursor_row: usize,
    cursor_col: usize,
    scroll_offset: usize,
}

impl Editor {
    fn new() -> Self {
        Self {
            rope: Rope::new(),
            cursor_row: 0,
            cursor_col: 0,
            scroll_offset: 0,
        }
    }

    /// Number of lines in the buffer (always >= 1).
    fn len_lines(&self) -> usize {
        self.rope.len_lines()
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

    /// Absolute char offset for the current cursor position.
    fn cursor_char_offset(&self) -> usize {
        self.rope.line_to_char(self.cursor_row) + self.cursor_col
    }

    /// Clamp cursor_col to the current line length.
    fn clamp_cursor_col(&mut self) {
        let len = self.line_len(self.cursor_row);
        if self.cursor_col > len {
            self.cursor_col = len;
        }
    }

    fn insert_char(&mut self, ch: char) {
        self.clamp_cursor_col();
        let offset = self.cursor_char_offset();
        self.rope.insert_char(offset, ch);
        self.cursor_col += 1;
    }

    fn insert_newline(&mut self) {
        self.clamp_cursor_col();
        let offset = self.cursor_char_offset();
        self.rope.insert_char(offset, '\n');
        self.cursor_row += 1;
        self.cursor_col = 0;
    }

    fn backspace(&mut self) {
        if self.cursor_col > 0 {
            self.clamp_cursor_col();
            let offset = self.cursor_char_offset();
            self.rope.remove(offset - 1..offset);
            self.cursor_col -= 1;
        } else if self.cursor_row > 0 {
            let prev_line_len = self.line_len(self.cursor_row - 1);
            // The newline char sits right before the start of the current line
            let line_start = self.rope.line_to_char(self.cursor_row);
            self.rope.remove(line_start - 1..line_start);
            self.cursor_row -= 1;
            self.cursor_col = prev_line_len;
        }
    }

    fn delete(&mut self) {
        let line_len = self.line_len(self.cursor_row);
        if self.cursor_col < line_len {
            let offset = self.cursor_char_offset();
            self.rope.remove(offset..offset + 1);
        } else if self.cursor_row + 1 < self.len_lines() {
            // Remove the newline at end of current line to join with next
            let offset = self.cursor_char_offset();
            self.rope.remove(offset..offset + 1);
        }
    }

    fn move_left(&mut self) {
        if self.cursor_col > 0 {
            self.cursor_col -= 1;
        } else if self.cursor_row > 0 {
            self.cursor_row -= 1;
            self.cursor_col = self.line_len(self.cursor_row);
        }
    }

    fn move_right(&mut self) {
        let line_len = self.line_len(self.cursor_row);
        if self.cursor_col < line_len {
            self.cursor_col += 1;
        } else if self.cursor_row + 1 < self.len_lines() {
            self.cursor_row += 1;
            self.cursor_col = 0;
        }
    }

    fn move_up(&mut self) {
        if self.cursor_row > 0 {
            self.cursor_row -= 1;
            let line_len = self.line_len(self.cursor_row);
            if self.cursor_col > line_len {
                self.cursor_col = line_len;
            }
        }
    }

    fn move_down(&mut self) {
        if self.cursor_row + 1 < self.len_lines() {
            self.cursor_row += 1;
            let line_len = self.line_len(self.cursor_row);
            if self.cursor_col > line_len {
                self.cursor_col = line_len;
            }
        }
    }

    fn move_home(&mut self) {
        self.cursor_col = 0;
    }

    fn move_end(&mut self) {
        self.cursor_col = self.line_len(self.cursor_row);
    }

    fn ensure_cursor_visible(&mut self, visible_lines: usize) {
        if visible_lines == 0 {
            return;
        }
        if self.cursor_row < self.scroll_offset {
            self.scroll_offset = self.cursor_row;
        } else if self.cursor_row >= self.scroll_offset + visible_lines {
            self.scroll_offset = self.cursor_row - visible_lines + 1;
        }
    }

    fn insert_tab(&mut self) {
        for _ in 0..4 {
            self.insert_char(' ');
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

        if keystroke.modifiers.platform
            || keystroke.modifiers.control
            || keystroke.modifiers.function
        {
            return;
        }

        let key = keystroke.key.as_str();

        match key {
            "backspace" => self.editor.backspace(),
            "delete" => self.editor.delete(),
            "enter" => self.editor.insert_newline(),
            "left" => self.editor.move_left(),
            "right" => self.editor.move_right(),
            "up" => self.editor.move_up(),
            "down" => self.editor.move_down(),
            "home" => self.editor.move_home(),
            "end" => self.editor.move_end(),
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
            let is_current_line = i == self.editor.cursor_row;

            let line_bg = if is_current_line {
                rgb(0x2a2d32)
            } else {
                rgb(0x1e1e1e)
            };

            let gutter_color = if is_current_line {
                rgb(0xc6c6c6)
            } else {
                rgb(0x5a5a5a)
            };

            // Build display text with cursor
            let display_text = if is_current_line {
                let col = self.editor.cursor_col.min(line_visual_len);
                let before: String = line.chars().take(col).collect();
                let cursor_char = if col < line_visual_len {
                    line.chars().skip(col).take(1).collect::<String>()
                } else {
                    " ".to_string()
                };
                let after_cursor: String = line.chars().skip(col + 1).collect();
                (before, cursor_char, after_cursor)
            } else {
                (line, String::new(), String::new())
            };

            let line_el = if is_current_line {
                div()
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
                    .child(
                        div().flex().flex_1().pl(px(4.0)).child(
                            div()
                                .flex()
                                .text_color(rgb(0xd4d4d4))
                                .child(SharedString::from(display_text.0))
                                .child(
                                    div()
                                        .bg(rgb(0xaeafad))
                                        .text_color(rgb(0x1e1e1e))
                                        .child(SharedString::from(display_text.1)),
                                )
                                .child(SharedString::from(display_text.2)),
                        ),
                    )
            } else {
                div()
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
                    .child(div().flex_1().pl(px(4.0)).text_color(rgb(0xd4d4d4)).child(
                        if display_text.0.is_empty() {
                            SharedString::from(" ")
                        } else {
                            SharedString::from(display_text.0)
                        },
                    ))
            };

            editor_content = editor_content.child(line_el);
        }

        editor_content
    }

    fn render_status_bar(&self) -> impl IntoElement {
        let total_lines = self.editor.len_lines();
        let total_chars = self.editor.rope.len_chars();

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
                "Ln {}, Col {}",
                self.editor.cursor_row + 1,
                self.editor.cursor_col + 1
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
