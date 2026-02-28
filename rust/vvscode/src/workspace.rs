//! Workspace — the top-level application shell.
//!
//! The `Workspace` struct owns the editor, panel visibility, file tree state,
//! and scrollbar drag state. Behaviour is spread across submodules:
//!
//! - [`file_tree`]      — directory scanning, open/save, collapse/expand
//! - [`input`]          — keyboard and scroll-wheel event handlers
//! - [`render_chrome`]  — title bar and status bar
//! - [`render_editor`]  — editor area (text, gutter, cursor, scrollbars)
//! - [`render_panels`]  — left explorer, right outline, bottom terminal
//! - [`scrollbar`]      — shared scrollbar drag types

pub mod file_tree;
mod input;
mod render_chrome;
mod render_editor;
mod render_panels;
pub mod scrollbar;

use std::collections::HashSet;
use std::path::Path;

use gpui::{
    Context, FocusHandle, MouseButton, MouseMoveEvent, MouseUpEvent, Window, actions, div,
    prelude::*, rgb,
};

use crate::editor::Editor;
use file_tree::FsNode;
use scrollbar::{ScrollbarDragKind, ScrollbarDragState};

// ── Layout constants (pixels) ────────────────────────────────────────────────

pub(crate) const SCROLL_SENSITIVITY: f32 = 1.0;

pub(crate) const TITLE_BAR_H: f32 = 36.0;
pub(crate) const STATUS_BAR_H: f32 = 24.0;
pub(crate) const BOTTOM_PANEL_H: f32 = 180.0;
pub(crate) const LINE_HEIGHT: f32 = 22.0; // Monaco text_sm effective line height
pub(crate) const LEFT_PANEL_W: f32 = 220.0;
pub(crate) const RIGHT_PANEL_W: f32 = 200.0;
pub(crate) const GUTTER_W: f32 = 50.0;
pub(crate) const TEXT_PAD_LEFT: f32 = 4.0;
pub(crate) const CHAR_WIDTH: f32 = 8.41; // Monaco text_sm approximate character width
pub(crate) const PANEL_ENTRY_H: f32 = 24.0; // left panel entry height (text_sm + py(3) padding)
pub(crate) const PANEL_HEADER_H: f32 = 34.0; // "EXPLORER" header height (text_xs + py(10) + px(12))
pub(crate) const SCROLLBAR_SIZE: f32 = 14.0; // width for vertical scrollbar, height for horizontal
pub(crate) const SCROLLBAR_MIN_THUMB: f32 = 20.0; // minimum thumb dimension in pixels

// ── Actions ──────────────────────────────────────────────────────────────────

actions!(
    workspace,
    [
        ToggleLeftPanel,
        ToggleBottomPanel,
        ToggleRightPanel,
        SelectAll,
        ToggleCollapseAll,
        SaveFile
    ]
);

// ── Workspace ────────────────────────────────────────────────────────────────

pub struct Workspace {
    pub(crate) left_panel_visible: bool,
    pub(crate) bottom_panel_visible: bool,
    pub(crate) right_panel_visible: bool,
    pub(crate) editor: Editor,
    pub(crate) focus_handle: FocusHandle,
    pub(crate) current_file: Option<String>,
    pub(crate) project_root: String,
    pub(crate) file_tree: Vec<FsNode>,
    pub(crate) left_panel_scroll: usize,
    pub(crate) scrollbar_drag: Option<ScrollbarDragState>,
    pub(crate) collapsed_dirs: HashSet<String>,
    pub(crate) dirty: bool,
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
            scrollbar_drag: None,
            collapsed_dirs: HashSet::new(),
            dirty: false,
        }
    }

    // ── Viewport geometry helpers ─────────────────────────────────────────

    pub(crate) fn compute_visible_panel_entries(&self, window: &Window) -> usize {
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

    pub(crate) fn compute_visible_lines(&self, window: &Window) -> usize {
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

    pub(crate) fn max_line_len(&self) -> usize {
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

    pub(crate) fn compute_visible_cols(&self, window: &Window) -> usize {
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
}

// ── Render ───────────────────────────────────────────────────────────────────

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

        center = center.child(self.render_editor(window, cx));

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
            .on_mouse_move(cx.listener(|this, ev: &MouseMoveEvent, _window, cx| {
                if let Some(drag) = this.scrollbar_drag {
                    // Safety: if button was released outside the window, clear drag
                    if ev.pressed_button != Some(MouseButton::Left) {
                        this.scrollbar_drag = None;
                        return;
                    }
                    let current: f32 = match drag.kind {
                        ScrollbarDragKind::EditorVertical | ScrollbarDragKind::LeftPanel => {
                            ev.position.y.into()
                        }
                        ScrollbarDragKind::EditorHorizontal => ev.position.x.into(),
                    };
                    let delta = current - drag.start_mouse;
                    let new_offset = (drag.start_offset + delta * drag.scroll_per_px)
                        .round()
                        .clamp(0.0, drag.max_scroll);
                    match drag.kind {
                        ScrollbarDragKind::EditorVertical => {
                            this.editor.scroll_offset = new_offset as usize;
                        }
                        ScrollbarDragKind::EditorHorizontal => {
                            this.editor.h_scroll_offset = new_offset as usize;
                        }
                        ScrollbarDragKind::LeftPanel => {
                            this.left_panel_scroll = new_offset as usize;
                        }
                    }
                    cx.notify();
                }
            }))
            .on_mouse_up(
                MouseButton::Left,
                cx.listener(|this, _ev: &MouseUpEvent, _window, _cx| {
                    this.scrollbar_drag = None;
                }),
            )
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
            .on_action(cx.listener(|this, _: &ToggleCollapseAll, _window, cx| {
                this.toggle_collapse_all();
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &SaveFile, _window, cx| {
                this.save_file(cx);
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
