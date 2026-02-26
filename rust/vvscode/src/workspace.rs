use std::path::Path;

use gpui::{
    ClickEvent, Context, FocusHandle, KeyDownEvent, ScrollDelta, ScrollWheelEvent, SharedString,
    Window, actions, div, prelude::*, px, rgb, rgba,
};

const SCROLL_SENSITIVITY: f32 = 1.0;

use crate::editor::Editor;

// ── Layout constants (pixels) ────────────────────────────────────────────────
const TITLE_BAR_H: f32 = 36.0;
const STATUS_BAR_H: f32 = 24.0;
const BOTTOM_PANEL_H: f32 = 180.0;
const LINE_HEIGHT: f32 = 22.0; // Monaco text_sm effective line height
const LEFT_PANEL_W: f32 = 220.0;
const RIGHT_PANEL_W: f32 = 200.0;
const GUTTER_W: f32 = 50.0;
const TEXT_PAD_LEFT: f32 = 4.0;
const CHAR_WIDTH: f32 = 8.41; // Monaco text_sm approximate character width
const PANEL_ENTRY_H: f32 = 24.0; // left panel entry height (text_sm + py(3) padding)
const PANEL_HEADER_H: f32 = 34.0; // "EXPLORER" header height (text_xs + py(10) + px(12))
const SCROLLBAR_SIZE: f32 = 14.0; // width for vertical scrollbar, height for horizontal
const SCROLLBAR_MIN_THUMB: f32 = 20.0; // minimum thumb dimension in pixels

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
    current_file: Option<String>,
    project_root: String,
    file_tree: Vec<(String, bool, String)>, // cached: (display_name, is_dir, rel_path)
    left_panel_scroll: usize,               // entry offset for left panel scrolling
}

impl Workspace {
    pub fn new(cx: &mut Context<Self>) -> Self {
        let project_root = std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| ".".to_string());
        let file_tree = Self::collect_file_tree(Path::new(&project_root), "", 0);
        Self {
            left_panel_visible: false,
            bottom_panel_visible: false,
            right_panel_visible: false,
            editor: Editor::new(),
            focus_handle: cx.focus_handle(),
            current_file: None,
            project_root,
            file_tree,
            left_panel_scroll: 0,
        }
    }

    fn refresh_file_tree(&mut self) {
        self.file_tree = Self::collect_file_tree(Path::new(&self.project_root), "", 0);
        self.left_panel_scroll = 0;
    }

    fn compute_visible_panel_entries(&self, window: &Window) -> usize {
        let window_h: f32 = window.viewport_size().height.into();
        let chrome = TITLE_BAR_H + STATUS_BAR_H;
        let bottom = if self.bottom_panel_visible {
            BOTTOM_PANEL_H
        } else {
            0.0
        };
        let available = (window_h - chrome - bottom - PANEL_HEADER_H).max(0.0);
        (available / PANEL_ENTRY_H).floor().max(1.0) as usize
    }

    fn compute_visible_lines(&self, window: &Window) -> usize {
        let window_h: f32 = window.viewport_size().height.into();
        let chrome = TITLE_BAR_H + STATUS_BAR_H;
        let bottom = if self.bottom_panel_visible {
            BOTTOM_PANEL_H
        } else {
            0.0
        };
        let available = (window_h - chrome - bottom).max(0.0);
        (available / LINE_HEIGHT).floor().max(1.0) as usize
    }

    fn max_line_len(&self) -> usize {
        let total = self.editor.len_lines();
        let mut max = 0;
        for i in 0..total {
            let ll = self.editor.line_len(i);
            if ll > max {
                max = ll;
            }
        }
        max
    }

    fn compute_visible_cols(&self, window: &Window) -> usize {
        let window_w: f32 = window.viewport_size().width.into();
        let left = if self.left_panel_visible {
            LEFT_PANEL_W
        } else {
            0.0
        };
        let right = if self.right_panel_visible {
            RIGHT_PANEL_W
        } else {
            0.0
        };
        let available = (window_w - left - right - GUTTER_W - TEXT_PAD_LEFT).max(0.0);
        (available / CHAR_WIDTH).floor().max(1.0) as usize
    }

    fn handle_key_down(&mut self, ev: &KeyDownEvent, window: &mut Window, cx: &mut Context<Self>) {
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
        let visible_lines = self.compute_visible_lines(window);
        let visible_cols = self.compute_visible_cols(window);
        self.editor
            .ensure_cursor_visible(visible_lines, visible_cols);
        cx.notify();
    }

    /// Convert a scroll delta into (columns, lines) as f32.
    fn scroll_delta(delta: &ScrollDelta) -> (f32, f32) {
        match delta {
            ScrollDelta::Pixels(point) => {
                let dy: f32 = point.y.into();
                let dx: f32 = point.x.into();
                (-dx / CHAR_WIDTH, -dy / LINE_HEIGHT)
            }
            ScrollDelta::Lines(point) => {
                (-point.x * SCROLL_SENSITIVITY, -point.y * SCROLL_SENSITIVITY)
            }
        }
    }

    fn handle_scroll_wheel(
        &mut self,
        ev: &ScrollWheelEvent,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        // Skip if pointer is over the left panel — handled by its own handler.
        let pointer_x: f32 = ev.position.x.into();
        if self.left_panel_visible && pointer_x < LEFT_PANEL_W {
            return;
        }

        let total_lines = self.editor.len_lines();
        let visible_lines = self.compute_visible_lines(window);
        let (delta_x, delta_y) = Self::scroll_delta(&ev.delta);

        // ── Vertical scroll ──────────────────────────────────────────────
        if delta_y.abs() > 0.01 {
            let max_offset = total_lines.saturating_sub(visible_lines);
            let new = (self.editor.scroll_offset as f32 + delta_y)
                .round()
                .clamp(0.0, max_offset as f32);
            self.editor.scroll_offset = new as usize;
        }

        // ── Horizontal scroll ────────────────────────────────────────────
        if delta_x.abs() > 0.01 {
            let new = (self.editor.h_scroll_offset as f32 + delta_x)
                .round()
                .max(0.0);
            self.editor.h_scroll_offset = new as usize;
        }

        cx.notify();
    }

    fn handle_left_panel_scroll(
        &mut self,
        ev: &ScrollWheelEvent,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let (_delta_x, delta_y) = Self::scroll_delta(&ev.delta);

        if delta_y.abs() > 0.01 {
            let visible = self.compute_visible_panel_entries(window);
            let max_offset = self.file_tree.len().saturating_sub(visible);
            let new = (self.left_panel_scroll as f32 + delta_y)
                .round()
                .clamp(0.0, max_offset as f32);
            self.left_panel_scroll = new as usize;
        }

        cx.notify();
    }

    /// Recursively collect directory entries into a flat list for the file explorer.
    /// Returns Vec of (display_name, is_directory, relative_path).
    fn collect_file_tree(dir: &Path, prefix: &str, depth: usize) -> Vec<(String, bool, String)> {
        let indent = "  ".repeat(depth);

        let mut dirs: Vec<_> = Vec::new();
        let mut files: Vec<_> = Vec::new();

        let Ok(read_dir) = std::fs::read_dir(dir) else {
            return Vec::new();
        };

        for entry in read_dir.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
            if is_dir {
                dirs.push(name);
            } else {
                files.push(name);
            }
        }

        dirs.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
        files.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

        let mut result: Vec<(String, bool, String)> = Vec::new();

        for d in dirs {
            let rel = if prefix.is_empty() {
                d.clone()
            } else {
                format!("{}/{}", prefix, d)
            };
            result.push((format!("{}{}/", indent, d), true, String::new()));
            let children = Self::collect_file_tree(&dir.join(&d), &rel, depth + 1);
            result.extend(children);
        }

        for f in files {
            let rel = if prefix.is_empty() {
                f.clone()
            } else {
                format!("{}/{}", prefix, f)
            };
            result.push((format!("{}{}", indent, f), false, rel));
        }

        result
    }

    fn open_file(&mut self, relative_path: &str) {
        let full_path = format!("{}/{}", self.project_root, relative_path);
        match std::fs::read_to_string(&full_path) {
            Ok(content) => {
                self.editor.load_text(&content);
                self.current_file = Some(relative_path.to_string());
            }
            Err(e) => {
                self.editor
                    .load_text(&format!("Error opening {}: {}", relative_path, e));
                self.current_file = Some(relative_path.to_string());
            }
        }
    }

    fn render_left_panel(&self, window: &Window, cx: &mut Context<Self>) -> impl IntoElement {
        let visible_entries = self.compute_visible_panel_entries(window);
        let start = self.left_panel_scroll;
        let end = (start + visible_entries).min(self.file_tree.len());

        let mut entries = div()
            .flex()
            .flex_col()
            .gap(px(2.0))
            .px(px(8.0))
            .overflow_hidden();

        for (name, is_dir, path) in &self.file_tree[start..end] {
            let color = if *is_dir {
                rgb(0xc8ccd4)
            } else {
                rgb(0x9da5b4)
            };
            let is_current = self.current_file.as_deref() == Some(path.as_str());
            let entry_bg = if is_current {
                rgb(0x2c313a)
            } else {
                rgb(0x21252b)
            };

            let entry_id = if *is_dir {
                SharedString::from(format!("dir-{}", name.trim()))
            } else {
                SharedString::from(format!("file-{}", path))
            };

            let mut entry = div()
                .id(entry_id)
                .px(px(6.0))
                .py(px(3.0))
                .text_sm()
                .text_color(color)
                .rounded(px(3.0))
                .bg(entry_bg)
                .hover(|s| s.bg(rgb(0x2c313a)))
                .child(SharedString::from(name.clone()));

            if !is_dir && !path.is_empty() {
                let path_owned = path.clone();
                entry = entry.cursor_pointer().on_click(cx.listener(
                    move |this, _: &ClickEvent, window, cx| {
                        this.open_file(&path_owned);
                        let visible_lines = this.compute_visible_lines(window);
                        let visible_cols = this.compute_visible_cols(window);
                        this.editor
                            .ensure_cursor_visible(visible_lines, visible_cols);
                        cx.notify();
                    },
                ));
            }

            entries = entries.child(entry);
        }

        // ── Left panel scrollbar ─────────────────────────────────────────
        let total_entries = self.file_tree.len();
        let mut entries_wrapper = div().relative().flex_1().overflow_hidden().child(entries);

        if total_entries > visible_entries {
            let window_h: f32 = window.viewport_size().height.into();
            let chrome = TITLE_BAR_H + STATUS_BAR_H;
            let bottom = if self.bottom_panel_visible {
                BOTTOM_PANEL_H
            } else {
                0.0
            };
            let panel_h = (window_h - chrome - bottom).max(0.0);
            let track_h = (panel_h - PANEL_HEADER_H).max(0.0);

            let thumb_ratio = visible_entries as f32 / total_entries as f32;
            let thumb_h = (thumb_ratio * track_h)
                .max(SCROLLBAR_MIN_THUMB)
                .min(track_h);
            let max_offset = total_entries.saturating_sub(visible_entries) as f32;
            let scroll_ratio = if max_offset > 0.0 {
                (self.left_panel_scroll as f32 / max_offset).clamp(0.0, 1.0)
            } else {
                0.0
            };
            let thumb_top = scroll_ratio * (track_h - thumb_h);

            entries_wrapper = entries_wrapper.child(
                div()
                    .absolute()
                    .top_0()
                    .right_0()
                    .w(px(SCROLLBAR_SIZE))
                    .h(px(track_h))
                    .child(
                        div()
                            .absolute()
                            .top(px(thumb_top))
                            .left(px(2.0))
                            .w(px(SCROLLBAR_SIZE - 4.0))
                            .h(px(thumb_h))
                            .bg(rgba(0x79797966))
                            .rounded(px(5.0)),
                    ),
            );
        }

        div()
            .flex()
            .flex_col()
            .w(px(LEFT_PANEL_W))
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
            .child(entries_wrapper)
            .on_scroll_wheel(cx.listener(Self::handle_left_panel_scroll))
    }

    fn render_right_panel(&self) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .w(px(RIGHT_PANEL_W))
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
            .h(px(BOTTOM_PANEL_H))
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

    fn render_editor(&self, window: &Window) -> impl IntoElement {
        let visible_lines = self.compute_visible_lines(window);
        let visible_cols = self.compute_visible_cols(window);
        let total_lines = self.editor.len_lines();
        let start = self.editor.scroll_offset;
        let end = (start + visible_lines).min(total_lines);
        let h_off = self.editor.h_scroll_offset;

        let cursor_row = self.editor.cursor_row();
        let cursor_col = self.editor.cursor_col();
        let has_selection = self.editor.has_selection();

        // ── Scrollbar geometry ───────────────────────────────────────────
        let window_h: f32 = window.viewport_size().height.into();
        let window_w: f32 = window.viewport_size().width.into();
        let chrome_v = TITLE_BAR_H + STATUS_BAR_H;
        let bottom = if self.bottom_panel_visible {
            BOTTOM_PANEL_H
        } else {
            0.0
        };
        let editor_h = (window_h - chrome_v - bottom).max(0.0);
        let left_w = if self.left_panel_visible {
            LEFT_PANEL_W
        } else {
            0.0
        };
        let right_w = if self.right_panel_visible {
            RIGHT_PANEL_W
        } else {
            0.0
        };
        let editor_w = (window_w - left_w - right_w).max(0.0);

        let mut editor_content = div()
            .relative()
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
            let line_text = self.editor.line_text(i);
            let line_visual_len = line_text.chars().count();
            let is_cursor_line = i == cursor_row;

            // ── Horizontal scroll: derive display text ───────────────────
            let (display_text, display_len) = if h_off < line_visual_len {
                let byte_offset = line_text
                    .char_indices()
                    .nth(h_off)
                    .map_or(line_text.len(), |(b, _)| b);
                (
                    line_text[byte_offset..].to_string(),
                    line_visual_len - h_off,
                )
            } else {
                (String::new(), 0)
            };

            let display_cursor_col = if is_cursor_line {
                cursor_col.saturating_sub(h_off)
            } else {
                0
            };

            let selection = self.editor.selection_on_line(i);
            let display_selection: Option<(usize, usize)> = selection.and_then(|(s, e)| {
                let ds = s.saturating_sub(h_off);
                let de = e.saturating_sub(h_off);
                if ds >= de { None } else { Some((ds, de)) }
            });

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

            // Build the text content area based on cursor/selection state
            let text_content = if has_selection && display_selection.is_some() {
                // Line has visible selection — render display text with
                // absolutely-positioned selection highlight + cursor overlay.
                let (sel_start, sel_end) = display_selection.unwrap();
                let sel_start = sel_start.min(display_len);
                let sel_end = sel_end.min(display_len);

                let byte_start = display_text
                    .char_indices()
                    .nth(sel_start)
                    .map_or(display_text.len(), |(b, _)| b);
                let byte_end = display_text
                    .char_indices()
                    .nth(sel_end)
                    .map_or(display_text.len(), |(b, _)| b);
                let before = display_text[..byte_start].to_owned();
                let selected = display_text[byte_start..byte_end].to_owned();

                // Also compute cursor position for this line if it's the cursor line
                let cursor_before = if is_cursor_line {
                    let col = display_cursor_col.min(display_len);
                    let byte_col = display_text
                        .char_indices()
                        .nth(col)
                        .map_or(display_text.len(), |(b, _)| b);
                    Some(display_text[..byte_col].to_owned())
                } else {
                    None
                };

                let mut el = div()
                    .relative()
                    .text_color(rgb(0xd4d4d4))
                    .child(SharedString::from(if display_len == 0 {
                        " ".to_string()
                    } else {
                        display_text
                    }))
                    .child(
                        div()
                            .absolute()
                            .top_0()
                            .left_0()
                            .bottom_0()
                            .flex()
                            .child(
                                // Invisible spacer to position selection start
                                div().opacity(0.).child(SharedString::from(before)),
                            )
                            .child(
                                // Selection highlight: semi-transparent bg
                                // with invisible text just for sizing.
                                div().bg(rgba(0x264f7882)).child(div().opacity(0.).child(
                                    if selected.is_empty() {
                                        SharedString::from(" ")
                                    } else {
                                        SharedString::from(selected)
                                    },
                                )),
                            ),
                    );

                // Show cursor bar on the cursor line even during selection
                if let Some(cb) = cursor_before {
                    el = el.child(
                        div()
                            .absolute()
                            .top_0()
                            .left_0()
                            .bottom_0()
                            .flex()
                            .child(div().opacity(0.).child(SharedString::from(cb)))
                            .child(div().w(px(2.0)).bg(rgb(0xd4d4d4))),
                    );
                }

                el
            } else if is_cursor_line {
                // No selection, cursor line — render display text with
                // an absolutely-positioned cursor overlay so nothing shifts.
                let col = display_cursor_col.min(display_len);
                let byte_col = display_text
                    .char_indices()
                    .nth(col)
                    .map_or(display_text.len(), |(b, _)| b);
                let before = display_text[..byte_col].to_owned();

                div()
                    .relative()
                    .text_color(rgb(0xd4d4d4))
                    .child(SharedString::from(if display_len == 0 {
                        " ".to_string()
                    } else {
                        display_text
                    }))
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
                div().text_color(rgb(0xd4d4d4)).child(if display_len == 0 {
                    SharedString::from(" ")
                } else {
                    SharedString::from(display_text)
                })
            };

            let line_el = div()
                .flex()
                .w_full()
                .bg(line_bg)
                .child(
                    div()
                        .w(px(GUTTER_W))
                        .text_color(gutter_color)
                        .text_right()
                        .pr(px(12.0))
                        .flex_shrink_0()
                        .child(SharedString::from(line_num.to_string())),
                )
                .child(
                    div()
                        .flex()
                        .flex_1()
                        .pl(px(TEXT_PAD_LEFT))
                        .overflow_hidden()
                        .child(text_content),
                );

            editor_content = editor_content.child(line_el);
        }

        // ── Vertical scrollbar ───────────────────────────────────────────
        if total_lines > visible_lines {
            let track_h = editor_h - SCROLLBAR_SIZE; // leave corner for horizontal
            let thumb_ratio = visible_lines as f32 / total_lines as f32;
            let thumb_h = (thumb_ratio * track_h)
                .max(SCROLLBAR_MIN_THUMB)
                .min(track_h);
            let max_v_offset = total_lines.saturating_sub(visible_lines) as f32;
            let v_scroll_ratio = if max_v_offset > 0.0 {
                (self.editor.scroll_offset as f32 / max_v_offset).clamp(0.0, 1.0)
            } else {
                0.0
            };
            let thumb_top = v_scroll_ratio * (track_h - thumb_h);

            editor_content = editor_content.child(
                div()
                    .absolute()
                    .top_0()
                    .right_0()
                    .w(px(SCROLLBAR_SIZE))
                    .h(px(track_h))
                    .child(
                        div()
                            .absolute()
                            .top(px(thumb_top))
                            .left(px(2.0))
                            .w(px(SCROLLBAR_SIZE - 4.0))
                            .h(px(thumb_h))
                            .bg(rgba(0x79797966))
                            .rounded(px(5.0)),
                    ),
            );
        }

        // ── Horizontal scrollbar ─────────────────────────────────────────
        let max_col = self.max_line_len();
        let total_content_cols = max_col.max(self.editor.h_scroll_offset + visible_cols);
        if total_content_cols > visible_cols {
            let track_w = editor_w - SCROLLBAR_SIZE; // leave corner for vertical
            let thumb_ratio = visible_cols as f32 / total_content_cols as f32;
            let thumb_w = (thumb_ratio * track_w)
                .max(SCROLLBAR_MIN_THUMB)
                .min(track_w);
            let max_h_scroll = total_content_cols.saturating_sub(visible_cols) as f32;
            let h_scroll_ratio = if max_h_scroll > 0.0 {
                (self.editor.h_scroll_offset as f32 / max_h_scroll).clamp(0.0, 1.0)
            } else {
                0.0
            };
            let thumb_left = h_scroll_ratio * (track_w - thumb_w);

            editor_content = editor_content.child(
                div()
                    .absolute()
                    .bottom_0()
                    .left_0()
                    .h(px(SCROLLBAR_SIZE))
                    .w(px(track_w))
                    .child(
                        div()
                            .absolute()
                            .top(px(2.0))
                            .left(px(thumb_left))
                            .h(px(SCROLLBAR_SIZE - 4.0))
                            .w(px(thumb_w))
                            .bg(rgba(0x79797966))
                            .rounded(px(5.0)),
                    ),
            );
        }

        editor_content
    }

    fn render_status_bar(&self) -> impl IntoElement {
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

    fn render_title_bar(&self) -> impl IntoElement {
        let title = match &self.current_file {
            Some(f) => format!("vvscode — {}", f),
            None => "vvscode — untitled".to_string(),
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

impl Render for Workspace {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        if !self.focus_handle.is_focused(window) {
            let _ = self.focus_handle.focus(window);
        }

        let mut main_content = div().flex().flex_1().w_full().overflow_hidden();

        // Left panel
        if self.left_panel_visible {
            main_content = main_content.child(self.render_left_panel(window, cx));
        }

        // Center: editor + optional bottom panel
        let mut center = div().flex().flex_col().flex_1().h_full().overflow_hidden();

        center = center.child(self.render_editor(window));

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
                if this.left_panel_visible {
                    this.refresh_file_tree();
                }
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
            .on_action(cx.listener(|this, _: &SelectAll, window, cx| {
                this.editor.select_all();
                let visible_lines = this.compute_visible_lines(window);
                let visible_cols = this.compute_visible_cols(window);
                this.editor
                    .ensure_cursor_visible(visible_lines, visible_cols);
                cx.notify();
            }))
            .on_key_down(cx.listener(Self::handle_key_down))
            .on_scroll_wheel(cx.listener(Self::handle_scroll_wheel))
            .flex()
            .flex_col()
            .size_full()
            .bg(rgb(0x1e1e1e))
            .child(self.render_title_bar())
            .child(main_content)
            .child(self.render_status_bar())
    }
}
