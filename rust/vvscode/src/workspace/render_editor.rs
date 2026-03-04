//! Editor area rendering — text lines, gutter, cursor, selection, and scrollbars.

use gpui::{
    Context, MouseButton, MouseDownEvent, SharedString, Window, div, prelude::*, px, rgb, rgba,
};

use super::{
    CHAR_WIDTH, GUTTER_W, LEFT_PANEL_W, LINE_HEIGHT, RIGHT_PANEL_W, SCROLLBAR_MIN_THUMB,
    SCROLLBAR_SIZE, STATUS_BAR_H, TEXT_PAD_LEFT, TITLE_BAR_H, Workspace,
    scrollbar::{ScrollbarDragKind, ScrollbarDragState},
};

// ── Editor rendering ─────────────────────────────────────────────────────────

impl Workspace {
    pub(crate) fn render_editor(
        &self,
        window: &Window,
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
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
            self.bottom_panel_h
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

        // Capture values for the click handler closure
        let click_scroll_offset = self.editor.scroll_offset;
        let click_h_scroll_offset = h_off;
        let click_left_w = left_w;

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
            .text_sm()
            .on_mouse_down(
                MouseButton::Left,
                cx.listener(move |this, ev: &MouseDownEvent, window, cx| {
                    // Clicking the editor unfocuses the terminal panel.
                    this.focus_handle.focus(window);

                    let mouse_x: f32 = ev.position.x.into();
                    let mouse_y: f32 = ev.position.y.into();
                    let shift = ev.modifiers.shift;

                    // Y → row
                    let y_in_editor = mouse_y - TITLE_BAR_H;
                    if y_in_editor < 0.0 {
                        return;
                    }
                    let row = (y_in_editor / LINE_HEIGHT).floor() as usize + click_scroll_offset;

                    // X → col (and detect gutter clicks)
                    let x_in_text = mouse_x - click_left_w - GUTTER_W - TEXT_PAD_LEFT;
                    let in_gutter = x_in_text < 0.0
                        && (mouse_x - click_left_w) >= 0.0
                        && (mouse_x - click_left_w) < GUTTER_W;
                    let col = if x_in_text < 0.0 {
                        0
                    } else {
                        (x_in_text / CHAR_WIDTH).round() as usize + click_h_scroll_offset
                    };

                    if in_gutter {
                        // ── Gutter click → select entire line ────────────
                        this.editor.select_line(row);
                    } else if ev.click_count == 2 {
                        // ── Double-click → select word ───────────────────
                        this.editor.select_word_at(row, col);
                    } else if shift {
                        // ── Shift-click → extend selection ───────────────
                        this.editor.move_to_position(row, col, true);
                    } else {
                        // ── Plain click → place cursor ───────────────────
                        this.editor.move_to_position(row, col, false);
                        this.mouse_drag_selecting = true;
                    }

                    this.editor.clamp();
                    let visible_lines = this.compute_visible_lines(window);
                    let visible_cols = this.compute_visible_cols(window);
                    this.editor
                        .ensure_cursor_visible(visible_lines, visible_cols);
                    cx.notify();
                }),
            );

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
                        display_text.clone()
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
                        display_text.clone()
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
                    SharedString::from(display_text.clone())
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
            let scroll_per_px_v = max_v_offset / (track_h - thumb_h).max(1.0);
            let v_track_top = TITLE_BAR_H; // track top in window coords

            editor_content = editor_content.child(
                div()
                    .absolute()
                    .top_0()
                    .right_0()
                    .w(px(SCROLLBAR_SIZE))
                    .h(px(track_h))
                    .on_mouse_down(
                        MouseButton::Left,
                        cx.listener(move |this, ev: &MouseDownEvent, _window, cx| {
                            let mouse_y: f32 = ev.position.y.into();
                            let y_in_track = mouse_y - v_track_top;
                            // Skip if click is on the thumb (thumb handler already fired)
                            if y_in_track >= thumb_top && y_in_track <= thumb_top + thumb_h {
                                return;
                            }
                            // Center thumb on click position
                            let target_top =
                                (y_in_track - thumb_h / 2.0).clamp(0.0, track_h - thumb_h);
                            let ratio = target_top / (track_h - thumb_h).max(1.0);
                            let new_offset =
                                (ratio * max_v_offset).round().clamp(0.0, max_v_offset);
                            this.editor.scroll_offset = new_offset as usize;
                            // Initiate drag so user can keep sliding after click
                            this.scrollbar_drag = Some(ScrollbarDragState {
                                kind: ScrollbarDragKind::EditorVertical,
                                start_mouse: mouse_y,
                                start_offset: new_offset,
                                scroll_per_px: scroll_per_px_v,
                                max_scroll: max_v_offset,
                            });
                            cx.notify();
                        }),
                    )
                    .child(
                        div()
                            .absolute()
                            .top(px(thumb_top))
                            .left(px(2.0))
                            .w(px(SCROLLBAR_SIZE - 4.0))
                            .h(px(thumb_h))
                            .bg(rgba(0x79797966))
                            .rounded(px(5.0))
                            .cursor_pointer()
                            .on_mouse_down(
                                MouseButton::Left,
                                cx.listener(move |this, ev: &MouseDownEvent, _window, _cx| {
                                    let mouse_y: f32 = ev.position.y.into();
                                    this.scrollbar_drag = Some(ScrollbarDragState {
                                        kind: ScrollbarDragKind::EditorVertical,
                                        start_mouse: mouse_y,
                                        start_offset: this.editor.scroll_offset as f32,
                                        scroll_per_px: scroll_per_px_v,
                                        max_scroll: max_v_offset,
                                    });
                                }),
                            ),
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
            let scroll_per_px_h = max_h_scroll / (track_w - thumb_w).max(1.0);
            let h_track_left = left_w; // track left in window coords

            editor_content = editor_content.child(
                div()
                    .absolute()
                    .bottom_0()
                    .left_0()
                    .h(px(SCROLLBAR_SIZE))
                    .w(px(track_w))
                    .on_mouse_down(
                        MouseButton::Left,
                        cx.listener(move |this, ev: &MouseDownEvent, _window, cx| {
                            let mouse_x: f32 = ev.position.x.into();
                            let x_in_track = mouse_x - h_track_left;
                            if x_in_track >= thumb_left && x_in_track <= thumb_left + thumb_w {
                                return;
                            }
                            let target_left =
                                (x_in_track - thumb_w / 2.0).clamp(0.0, track_w - thumb_w);
                            let ratio = target_left / (track_w - thumb_w).max(1.0);
                            let new_offset =
                                (ratio * max_h_scroll).round().clamp(0.0, max_h_scroll);
                            this.editor.h_scroll_offset = new_offset as usize;
                            this.scrollbar_drag = Some(ScrollbarDragState {
                                kind: ScrollbarDragKind::EditorHorizontal,
                                start_mouse: mouse_x,
                                start_offset: new_offset,
                                scroll_per_px: scroll_per_px_h,
                                max_scroll: max_h_scroll,
                            });
                            cx.notify();
                        }),
                    )
                    .child(
                        div()
                            .absolute()
                            .top(px(2.0))
                            .left(px(thumb_left))
                            .h(px(SCROLLBAR_SIZE - 4.0))
                            .w(px(thumb_w))
                            .bg(rgba(0x79797966))
                            .rounded(px(5.0))
                            .cursor_pointer()
                            .on_mouse_down(
                                MouseButton::Left,
                                cx.listener(move |this, ev: &MouseDownEvent, _window, _cx| {
                                    let mouse_x: f32 = ev.position.x.into();
                                    this.scrollbar_drag = Some(ScrollbarDragState {
                                        kind: ScrollbarDragKind::EditorHorizontal,
                                        start_mouse: mouse_x,
                                        start_offset: this.editor.h_scroll_offset as f32,
                                        scroll_per_px: scroll_per_px_h,
                                        max_scroll: max_h_scroll,
                                    });
                                }),
                            ),
                    ),
            );
        }

        editor_content
    }
}
