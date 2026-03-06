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
//! - [`terminal`](crate::terminal) — PTY process, VTE parser, cell grid

pub mod command_palette;
pub mod file_tree;
mod input;
mod render_chrome;
mod render_editor;
mod render_panels;
pub mod scrollbar;

use std::collections::HashSet;
use std::sync::Arc;

use crate::terminal::Terminal;

use command_palette::CommandPaletteState;

use gpui::{
    ClipboardItem, Context, FocusHandle, MouseButton, MouseMoveEvent, MouseUpEvent, Window,
    actions, div, prelude::*, rgb,
};

use crate::editor::Editor;
use file_tree::FsNode;
use scrollbar::{ScrollbarDragKind, ScrollbarDragState};

// ── Layout constants (pixels) ────────────────────────────────────────────────

pub(crate) const SCROLL_SENSITIVITY: f32 = 1.0;

pub(crate) const TITLE_BAR_H: f32 = 36.0;
pub(crate) const STATUS_BAR_H: f32 = 24.0;
pub(crate) const BOTTOM_PANEL_DEFAULT_H: f32 = 180.0;
pub(crate) const BOTTOM_PANEL_MIN_H: f32 = 80.0;
pub(crate) const BOTTOM_PANEL_MAX_H: f32 = 600.0;
pub(crate) const BOTTOM_TAB_BAR_H: f32 = 30.0; // tab bar: py(6)*2 + text_xs + border
pub(crate) const BOTTOM_CONTENT_PAD: f32 = 8.0; // content area: py(4)*2
pub(crate) const DRAG_HANDLE_H: f32 = 4.0; // resize drag handle at top of bottom panel
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
        SaveFile,
        ToggleCommandPalette,
        OpenActionPalette,
        Undo,
        Redo,
        Copy,
        Paste,
        Cut
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
    pub(crate) mouse_drag_selecting: bool,
    pub(crate) collapsed_dirs: HashSet<Arc<str>>,
    /// Tracks which directories have had their children lazily loaded.
    pub(crate) loaded_dirs: HashSet<Arc<str>>,
    pub(crate) dirty: bool,
    pub(crate) command_palette: CommandPaletteState,
    pub(crate) terminal: Option<Terminal>,
    pub(crate) terminal_focus_handle: FocusHandle,
    pub(crate) bottom_panel_h: f32,
    pub(crate) bottom_panel_drag: Option<BottomPanelDrag>,
}

/// State tracked during a bottom-panel resize drag.
#[derive(Clone, Copy)]
pub(crate) struct BottomPanelDrag {
    /// Mouse Y at drag start.
    pub start_mouse_y: f32,
    /// Panel height at drag start.
    pub start_h: f32,
}

impl Workspace {
    pub fn new(cx: &mut Context<Self>) -> Self {
        let project_root = std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| ".".to_string());
        Self {
            left_panel_visible: false,
            bottom_panel_visible: false,
            right_panel_visible: false,
            editor: Editor::new(),
            focus_handle: cx.focus_handle(),
            current_file: None,
            project_root,
            file_tree: Vec::new(),
            left_panel_scroll: 0,
            scrollbar_drag: None,
            mouse_drag_selecting: false,
            collapsed_dirs: HashSet::new(),
            loaded_dirs: HashSet::new(),
            dirty: false,
            command_palette: CommandPaletteState::new(),
            terminal: None,
            terminal_focus_handle: cx.focus_handle(),
            bottom_panel_h: BOTTOM_PANEL_DEFAULT_H,
            bottom_panel_drag: None,
        }
    }

    /// Spawn the terminal PTY if it hasn't been created yet.
    /// Called lazily when the bottom panel is first opened.
    pub(crate) fn ensure_terminal(&mut self, window: &Window, cx: &mut Context<Self>) {
        if self.terminal.is_some() {
            return;
        }
        let cwd = self.project_root.clone();
        let (cols, rows) = self.compute_terminal_size(window);

        let result = Terminal::spawn(cols as u16, rows as u16, Some(&cwd));
        match result {
            Ok((t, rx)) => {
                self.terminal = Some(t);

                // Await the channel receiver: the reader thread sends ()
                // each time PTY output arrives. We wake the UI immediately
                // — no polling, no wasted cycles, no latency.
                cx.spawn(async move |this, cx| {
                    while rx.recv().await.is_ok() {
                        let ok = this.update(cx, |_workspace, cx| {
                            cx.notify();
                        });
                        if ok.is_err() {
                            break; // entity dropped — stop the loop
                        }
                    }
                })
                .detach();
            }
            Err(e) => eprintln!("Failed to spawn terminal: {}", e),
        }
    }

    // ── Viewport geometry helpers ─────────────────────────────────────────

    pub(crate) fn compute_visible_panel_entries(&self, window: &Window) -> usize {
        let window_h: f32 = window.viewport_size().height.into();
        let chrome = TITLE_BAR_H + STATUS_BAR_H;
        let bottom = if self.bottom_panel_visible {
            self.bottom_panel_h
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
            self.bottom_panel_h
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

    // ── Terminal geometry ─────────────────────────────────────────────────

    /// Compute the terminal grid dimensions (cols, rows) from the current
    /// window size and panel layout.
    pub(crate) fn compute_terminal_size(&self, window: &Window) -> (usize, usize) {
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
        let content_w = (window_w - left - right - 16.0).max(0.0); // px(8) * 2 padding
        let cols = (content_w / CHAR_WIDTH).floor().max(1.0) as usize;

        let content_h = (self.bottom_panel_h - BOTTOM_TAB_BAR_H - BOTTOM_CONTENT_PAD).max(0.0);
        let rows = (content_h / LINE_HEIGHT).floor().max(1.0) as usize;

        (cols, rows)
    }

    /// Resize the terminal grid (and PTY) if the computed size differs from
    /// the current grid dimensions. Called from `render_bottom_panel`.
    pub(crate) fn sync_terminal_size(&mut self, window: &Window) {
        let (cols, rows) = self.compute_terminal_size(window);
        if let Some(ref mut term) = self.terminal {
            let grid = term.lock_grid();
            let (cur_cols, cur_rows) = (grid.cols, grid.rows);
            drop(grid);
            if cols != cur_cols || rows != cur_rows {
                term.resize(cols as u16, rows as u16);
            }
        }
    }
}

// ── Render ───────────────────────────────────────────────────────────────────

impl Render for Workspace {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        if !self.focus_handle.is_focused(window) && !self.terminal_focus_handle.is_focused(window) {
            self.focus_handle.focus(window);
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
            center = center.child(self.render_bottom_panel(cx));
        }

        main_content = main_content.child(center);

        // Right panel
        if self.right_panel_visible {
            main_content = main_content.child(self.render_right_panel());
        }

        div()
            .key_context("Workspace")
            .track_focus(&self.focus_handle)
            .on_mouse_move(cx.listener(|this, ev: &MouseMoveEvent, window, cx| {
                // ── Bottom panel resize drag ─────────────────────────────
                if let Some(drag) = this.bottom_panel_drag {
                    if ev.pressed_button != Some(MouseButton::Left) {
                        this.bottom_panel_drag = None;
                        return;
                    }
                    let current_y: f32 = ev.position.y.into();
                    let delta = drag.start_mouse_y - current_y; // dragging up = bigger
                    let new_h =
                        (drag.start_h + delta).clamp(BOTTOM_PANEL_MIN_H, BOTTOM_PANEL_MAX_H);
                    if (this.bottom_panel_h - new_h).abs() > 0.5 {
                        this.bottom_panel_h = new_h;
                        this.sync_terminal_size(window);
                        cx.notify();
                    }
                    return;
                }

                // ── Scrollbar drag ───────────────────────────────────────
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
                    return;
                }

                // ── Click-drag to select ─────────────────────────────────
                if this.mouse_drag_selecting {
                    if ev.pressed_button != Some(MouseButton::Left) {
                        this.mouse_drag_selecting = false;
                        return;
                    }
                    let mouse_x: f32 = ev.position.x.into();
                    let mouse_y: f32 = ev.position.y.into();

                    let left_w = if this.left_panel_visible {
                        LEFT_PANEL_W
                    } else {
                        0.0
                    };

                    let y_in_editor = mouse_y - TITLE_BAR_H;
                    let row = if y_in_editor < 0.0 {
                        0
                    } else {
                        (y_in_editor / LINE_HEIGHT).floor() as usize + this.editor.scroll_offset
                    };

                    let x_in_text = mouse_x - left_w - GUTTER_W - TEXT_PAD_LEFT;
                    let col = if x_in_text < 0.0 {
                        0
                    } else {
                        (x_in_text / CHAR_WIDTH).round() as usize + this.editor.h_scroll_offset
                    };

                    this.editor.move_to_position(row, col, true);
                    this.editor.clamp();
                    let visible_lines = this.compute_visible_lines(window);
                    let visible_cols = this.compute_visible_cols(window);
                    this.editor
                        .ensure_cursor_visible(visible_lines, visible_cols);
                    cx.notify();
                }
            }))
            .on_mouse_up(
                MouseButton::Left,
                cx.listener(|this, _ev: &MouseUpEvent, _window, _cx| {
                    this.scrollbar_drag = None;
                    this.mouse_drag_selecting = false;
                    this.bottom_panel_drag = None;
                }),
            )
            .on_action(cx.listener(|this, _: &ToggleLeftPanel, window, cx| {
                if !this.left_panel_visible && this.file_tree.is_empty() {
                    // First open — scan async, panel opens when scan completes.
                    this.refresh_file_tree(cx);
                } else {
                    this.left_panel_visible = !this.left_panel_visible;
                }
                this.sync_terminal_size(window);
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &ToggleBottomPanel, window, cx| {
                this.bottom_panel_visible = !this.bottom_panel_visible;
                if this.bottom_panel_visible {
                    this.ensure_terminal(window, cx);
                    this.terminal_focus_handle.focus(window);
                } else {
                    this.focus_handle.focus(window);
                }
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &ToggleRightPanel, window, cx| {
                this.right_panel_visible = !this.right_panel_visible;
                this.sync_terminal_size(window);
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
            .on_action(cx.listener(|this, _: &ToggleCommandPalette, _window, cx| {
                this.toggle_command_palette();
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &OpenActionPalette, _window, cx| {
                this.open_command_palette_in_action_mode();
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &Undo, window, cx| {
                this.editor.undo();
                let visible_lines = this.compute_visible_lines(window);
                let visible_cols = this.compute_visible_cols(window);
                this.editor
                    .ensure_cursor_visible(visible_lines, visible_cols);
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &Redo, window, cx| {
                this.editor.redo();
                let visible_lines = this.compute_visible_lines(window);
                let visible_cols = this.compute_visible_cols(window);
                this.editor
                    .ensure_cursor_visible(visible_lines, visible_cols);
                cx.notify();
            }))
            .on_action(cx.listener(|this, _: &Copy, _window, cx| {
                let text = this.editor.selected_text();
                if !text.is_empty() {
                    cx.write_to_clipboard(ClipboardItem::new_string(text));
                }
            }))
            .on_action(cx.listener(|this, _: &Cut, window, cx| {
                let text = this.editor.selected_text();
                if !text.is_empty() {
                    cx.write_to_clipboard(ClipboardItem::new_string(text));
                    this.editor.commit_history();
                    this.editor.delete_selection();
                    this.dirty = true;
                    let visible_lines = this.compute_visible_lines(window);
                    let visible_cols = this.compute_visible_cols(window);
                    this.editor
                        .ensure_cursor_visible(visible_lines, visible_cols);
                    cx.notify();
                }
            }))
            .on_action(cx.listener(|this, _: &Paste, window, cx| {
                if let Some(item) = cx.read_from_clipboard() {
                    if let Some(text) = item.text() {
                        this.editor.insert_text(&text);
                        this.dirty = true;
                        let visible_lines = this.compute_visible_lines(window);
                        let visible_cols = this.compute_visible_cols(window);
                        this.editor
                            .ensure_cursor_visible(visible_lines, visible_cols);
                        cx.notify();
                    }
                }
            }))
            .on_key_down(cx.listener(Self::handle_key_down))
            .on_scroll_wheel(cx.listener(Self::handle_scroll_wheel))
            .flex()
            .flex_col()
            .size_full()
            .bg(rgb(0x1e1e1e))
            .child(self.render_title_bar())
            .child(
                div()
                    .relative()
                    .flex()
                    .flex_col()
                    .flex_1()
                    .w_full()
                    .overflow_hidden()
                    .child(main_content)
                    .child(self.render_command_palette(&window, cx)),
            )
            .child(self.render_status_bar())
    }
}
