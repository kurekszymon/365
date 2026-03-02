//! Side-panel and bottom-panel rendering (left explorer, right outline, terminal).

use std::sync::Arc;

use gpui::{
    ClickEvent, Context, MouseButton, MouseDownEvent, SharedString, Window, div, prelude::*, px,
    rgb, rgba,
};

use super::{
    BOTTOM_PANEL_H, LEFT_PANEL_W, PANEL_HEADER_H, RIGHT_PANEL_W, SCROLLBAR_MIN_THUMB,
    SCROLLBAR_SIZE, STATUS_BAR_H, TITLE_BAR_H, Workspace,
    scrollbar::{ScrollbarDragKind, ScrollbarDragState},
};

// ── Panel rendering ──────────────────────────────────────────────────────────

impl Workspace {
    pub(crate) fn render_left_panel(
        &self,
        window: &Window,
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
        let filtered_tree = self.visible_file_tree();
        let visible_entries = self.compute_visible_panel_entries(window);
        let start = self
            .left_panel_scroll
            .min(filtered_tree.len().saturating_sub(1));
        let end = (start + visible_entries).min(filtered_tree.len());

        let mut entries = div()
            .flex()
            .flex_col()
            .gap(px(2.0))
            .px(px(8.0))
            .overflow_hidden();

        for node in &filtered_tree[start..end] {
            let color = if node.is_dir {
                rgb(0xc8ccd4)
            } else {
                rgb(0x9da5b4)
            };
            let is_current = self.current_file.as_deref() == Some(&*node.rel_path);
            let entry_bg = if is_current {
                rgb(0x2c313a)
            } else {
                rgb(0x21252b)
            };

            let entry_id = if node.is_dir {
                SharedString::from(format!("dir-{}", node.rel_path))
            } else {
                SharedString::from(format!("file-{}", node.rel_path))
            };

            if node.is_dir {
                let trimmed = node.display_name.trim_start();
                let indent_part = &node.display_name[..node.display_name.len() - trimmed.len()];
                let display_name = SharedString::from(format!("{}{}", indent_part, trimmed));

                let path_owned = Arc::clone(&node.rel_path);
                let entry = div()
                    .id(entry_id)
                    .px(px(6.0))
                    .py(px(3.0))
                    .text_sm()
                    .text_color(color)
                    .rounded(px(3.0))
                    .bg(entry_bg)
                    .hover(|s| s.bg(rgb(0x2c313a)))
                    .cursor_pointer()
                    .child(display_name)
                    .on_click(cx.listener(move |this, _: &ClickEvent, _window, cx| {
                        if this.collapsed_dirs.contains(&path_owned) {
                            this.collapsed_dirs.remove(&path_owned);
                        } else {
                            this.collapsed_dirs.insert(Arc::clone(&path_owned));
                        }
                        // Clamp scroll in case collapsing reduced total entries
                        let new_total = this.visible_file_tree().len();
                        if this.left_panel_scroll >= new_total {
                            this.left_panel_scroll = new_total.saturating_sub(1);
                        }
                        cx.notify();
                    }));

                entries = entries.child(entry);
            } else {
                let mut entry = div()
                    .id(entry_id)
                    .px(px(6.0))
                    .py(px(3.0))
                    .text_sm()
                    .text_color(color)
                    .rounded(px(3.0))
                    .bg(entry_bg)
                    .hover(|s| s.bg(rgb(0x2c313a)))
                    .child(SharedString::from(node.display_name.clone()));

                if !node.rel_path.is_empty() {
                    let path_owned = Arc::clone(&node.rel_path);
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
        }

        // ── Left panel scrollbar ─────────────────────────────────────────
        let total_entries = filtered_tree.len();
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

            let scroll_per_px_lp = max_offset / (track_h - thumb_h).max(1.0);

            let lp_track_top = TITLE_BAR_H + PANEL_HEADER_H; // track top in window coords

            entries_wrapper = entries_wrapper.child(
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
                            let y_in_track = mouse_y - lp_track_top;
                            if y_in_track >= thumb_top && y_in_track <= thumb_top + thumb_h {
                                return;
                            }
                            let target_top =
                                (y_in_track - thumb_h / 2.0).clamp(0.0, track_h - thumb_h);
                            let ratio = target_top / (track_h - thumb_h).max(1.0);
                            let new_off = (ratio * max_offset).round().clamp(0.0, max_offset);
                            this.left_panel_scroll = new_off as usize;
                            this.scrollbar_drag = Some(ScrollbarDragState {
                                kind: ScrollbarDragKind::LeftPanel,
                                start_mouse: mouse_y,
                                start_offset: new_off,
                                scroll_per_px: scroll_per_px_lp,
                                max_scroll: max_offset,
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
                                        kind: ScrollbarDragKind::LeftPanel,
                                        start_mouse: mouse_y,
                                        start_offset: this.left_panel_scroll as f32,
                                        scroll_per_px: scroll_per_px_lp,
                                        max_scroll: max_offset,
                                    });
                                }),
                            ),
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
                    .flex()
                    .items_center()
                    .justify_between()
                    .px(px(12.0))
                    .py(px(10.0))
                    .child(
                        div()
                            .text_xs()
                            .text_color(rgb(0x8b919a))
                            .font_weight(gpui::FontWeight::BOLD)
                            .child("EXPLORER"),
                    )
                    .child(
                        div()
                            .id("collapse-all-btn")
                            .text_xs()
                            .text_color(rgb(0x8b919a))
                            .cursor_pointer()
                            .hover(|s| s.text_color(rgb(0xc8ccd4)))
                            .child("⊟")
                            .on_click(cx.listener(|this, _: &ClickEvent, _window, cx| {
                                this.toggle_collapse_all();
                                cx.notify();
                            })),
                    ),
            )
            .child(entries_wrapper)
            .on_scroll_wheel(cx.listener(Self::handle_left_panel_scroll))
    }

    pub(crate) fn render_right_panel(&self) -> impl IntoElement {
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

    pub(crate) fn render_bottom_panel(&self) -> impl IntoElement {
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
}
