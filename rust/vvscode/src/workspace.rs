use gpui::{
    Context, FocusHandle, KeyDownEvent, SharedString, Window, actions, div, prelude::*, px, rgb,
};

use crate::editor::Editor;

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

// ── Workspace ────────────────────────────────────────────────────────────────

pub struct Workspace {
    left_panel_visible: bool,
    bottom_panel_visible: bool,
    right_panel_visible: bool,
    editor: Editor,
    focus_handle: FocusHandle,
}

impl Workspace {
    pub fn new(cx: &mut Context<Self>) -> Self {
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
