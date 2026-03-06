//! Command palette — quick-open files, jump to line, and run workspace actions.
//!
//! Three modes determined by the input prefix:
//!
//! - **(no prefix)** — file picker: fuzzy-filter files from the project directory
//! - **`:`**         — go-to-line: jump to a line number in the current buffer
//! - **`>`**         — action runner: filter and execute registered workspace actions

use std::sync::Arc;

use gpui::{Context, SharedString, Window, div, prelude::*, px, rgb};

use super::Workspace;

// ── Constants ────────────────────────────────────────────────────────────────

const PALETTE_WIDTH: f32 = 480.0;
const PALETTE_TOP: f32 = 60.0;
const INPUT_HEIGHT: f32 = 34.0;
const ITEM_HEIGHT: f32 = 28.0;
const MAX_VISIBLE_ITEMS: usize = 12;

// ── Palette mode ─────────────────────────────────────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum PaletteMode {
    /// Default — pick a file from the project tree.
    FileOpen,
    /// Prefixed with `:` — jump to a line number.
    GoToLine,
    /// Prefixed with `>` — run a workspace action.
    ActionRunner,
}

// ── Known actions ────────────────────────────────────────────────────────────

/// A palette-visible action with a display label and a tag we can match on.
#[derive(Clone, Debug)]
pub(crate) struct PaletteAction {
    pub label: &'static str,
    pub tag: PaletteActionTag,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum PaletteActionTag {
    ToggleLeftPanel,
    ToggleBottomPanel,
    ToggleRightPanel,
    SelectAll,
    ToggleCollapseAll,
    SaveFile,
}

/// All actions exposed to the command palette.
pub(crate) const PALETTE_ACTIONS: &[PaletteAction] = &[
    PaletteAction {
        label: "Toggle Left Panel",
        tag: PaletteActionTag::ToggleLeftPanel,
    },
    PaletteAction {
        label: "Toggle Bottom Panel",
        tag: PaletteActionTag::ToggleBottomPanel,
    },
    PaletteAction {
        label: "Toggle Right Panel",
        tag: PaletteActionTag::ToggleRightPanel,
    },
    PaletteAction {
        label: "Select All",
        tag: PaletteActionTag::SelectAll,
    },
    PaletteAction {
        label: "Toggle Collapse All",
        tag: PaletteActionTag::ToggleCollapseAll,
    },
    PaletteAction {
        label: "Save File",
        tag: PaletteActionTag::SaveFile,
    },
];

// ── State ────────────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub(crate) struct CommandPaletteState {
    pub open: bool,
    pub query: String,
    pub selected_index: usize,
    /// Cached list of project-relative file paths for file-open mode.
    pub file_list: Vec<Arc<str>>,
}

impl CommandPaletteState {
    pub fn new() -> Self {
        Self {
            open: false,
            query: String::new(),
            selected_index: 0,
            file_list: Vec::new(),
        }
    }

    /// Current mode inferred from the query prefix.
    pub fn mode(&self) -> PaletteMode {
        if self.query.starts_with(':') {
            PaletteMode::GoToLine
        } else if self.query.starts_with('>') {
            PaletteMode::ActionRunner
        } else {
            PaletteMode::FileOpen
        }
    }

    /// The effective filter text (query minus the mode prefix).
    pub fn filter(&self) -> &str {
        match self.mode() {
            PaletteMode::GoToLine => self.query.strip_prefix(':').unwrap_or("").trim(),
            PaletteMode::ActionRunner => self.query.strip_prefix('>').unwrap_or("").trim(),
            PaletteMode::FileOpen => self.query.as_str(),
        }
    }
}

// ── Filtered results helpers ─────────────────────────────────────────────────

/// Simple case-insensitive substring match.
fn fuzzy_match(haystack: &str, needle: &str) -> bool {
    if needle.is_empty() {
        return true;
    }
    let haystack_lower = haystack.to_lowercase();
    let needle_lower = needle.to_lowercase();
    haystack_lower.contains(&needle_lower)
}

impl Workspace {
    /// Filtered file list for the file-open mode.
    pub(crate) fn palette_filtered_files(&self) -> Vec<Arc<str>> {
        let filter = self.command_palette.filter();
        self.command_palette
            .file_list
            .iter()
            .filter(|path| fuzzy_match(path, filter))
            .cloned()
            .collect()
    }

    /// Filtered actions for the action-runner mode.
    pub(crate) fn palette_filtered_actions(&self) -> Vec<&'static PaletteAction> {
        let filter = self.command_palette.filter();
        PALETTE_ACTIONS
            .iter()
            .filter(|a| fuzzy_match(a.label, filter))
            .collect()
    }

    /// Total number of items visible in the current mode (after filtering).
    pub(crate) fn palette_item_count(&self) -> usize {
        match self.command_palette.mode() {
            PaletteMode::FileOpen => self.palette_filtered_files().len(),
            PaletteMode::ActionRunner => self.palette_filtered_actions().len(),
            PaletteMode::GoToLine => 0, // no list — just a prompt
        }
    }

    /// Clamp `selected_index` so it never exceeds the current filtered result count.
    pub(crate) fn clamp_palette_selection(&mut self) {
        let count = self.palette_item_count();
        if count == 0 {
            self.command_palette.selected_index = 0;
        } else if self.command_palette.selected_index >= count {
            self.command_palette.selected_index = count - 1;
        }
    }

    // ── Open / close ─────────────────────────────────────────────────────

    pub(crate) fn toggle_command_palette(&mut self) {
        if self.command_palette.open {
            self.close_command_palette();
        } else {
            self.open_command_palette();
        }
    }

    pub(crate) fn open_command_palette(&mut self) {
        self.command_palette.query.clear();
        self.command_palette.selected_index = 0;
        self.command_palette.open = true;
        // Rebuild file list from tree (only non-directory entries).
        self.command_palette.file_list = self
            .file_tree
            .iter()
            .filter(|node| !node.is_dir)
            .map(|node| Arc::clone(&node.rel_path))
            .collect();
    }

    /// Open the palette directly in action-runner mode (`>` prefix pre-filled).
    pub(crate) fn open_command_palette_in_action_mode(&mut self) {
        self.open_command_palette();
        self.command_palette.query = "> ".to_string();
    }

    pub(crate) fn close_command_palette(&mut self) {
        self.command_palette.open = false;
        self.command_palette.query.clear();
        self.command_palette.selected_index = 0;
    }

    // ── Input handling (called from workspace/input.rs) ──────────────────

    /// Returns `true` if the palette consumed the key event.
    pub(crate) fn handle_palette_key(
        &mut self,
        key: &str,
        key_char: Option<&str>,
        cmd: bool,
        ctrl: bool,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) -> bool {
        if !self.command_palette.open {
            return false;
        }

        match key {
            "escape" => {
                self.close_command_palette();
                cx.notify();
                return true;
            }

            "enter" => {
                self.clamp_palette_selection();
                self.palette_confirm(window, cx);
                cx.notify();
                return true;
            }

            "up" => {
                if self.command_palette.selected_index > 0 {
                    self.command_palette.selected_index -= 1;
                }
                cx.notify();
                return true;
            }

            "down" => {
                let count = self.palette_item_count();
                if count > 0 && self.command_palette.selected_index < count - 1 {
                    self.command_palette.selected_index += 1;
                }
                cx.notify();
                return true;
            }

            "backspace" if cmd => {
                self.command_palette.query.clear();
                self.command_palette.selected_index = 0;
                cx.notify();
                return true;
            }

            "backspace" if ctrl => {
                // Delete last word
                let trimmed = self.command_palette.query.trim_end();
                if let Some(pos) = trimmed.rfind(|c: char| c == ' ' || c == '/' || c == '\\') {
                    self.command_palette.query.truncate(pos);
                } else {
                    self.command_palette.query.clear();
                }
                self.command_palette.selected_index = 0;
                cx.notify();
                return true;
            }

            "backspace" => {
                self.command_palette.query.pop();
                self.clamp_palette_selection();
                cx.notify();
                return true;
            }

            // Ignore modifier-only keys and function keys
            "shift" | "alt" | "capslock" | "tab" | "left" | "right" | "home" | "end" | "delete" => {
                return true; // consume but do nothing
            }

            _ if cmd || ctrl => {
                // Let other cmd/ctrl combos pass through (e.g. cmd-s to save)
                return false;
            }

            _ => {
                let text = key_char.unwrap_or(key);
                for ch in text.chars() {
                    if !ch.is_control() {
                        self.command_palette.query.push(ch);
                    }
                }
                self.clamp_palette_selection();
                cx.notify();
                return true;
            }
        }
    }

    // ── Confirm selection ────────────────────────────────────────────────

    fn palette_confirm(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        match self.command_palette.mode() {
            PaletteMode::FileOpen => {
                let files = self.palette_filtered_files();
                if let Some(path) = files.get(self.command_palette.selected_index) {
                    self.open_file(path);
                    let visible_lines = self.compute_visible_lines(window);
                    let visible_cols = self.compute_visible_cols(window);
                    self.editor
                        .ensure_cursor_visible(visible_lines, visible_cols);
                }
                self.close_command_palette();
            }

            PaletteMode::GoToLine => {
                let filter = self.command_palette.filter().to_string();
                if let Ok(line_num) = filter.parse::<usize>() {
                    if line_num > 0 {
                        let target_line =
                            (line_num - 1).min(self.editor.len_lines().saturating_sub(1));
                        let char_offset = self.editor.rope.line_to_char(target_line);
                        self.editor.cursor = char_offset;
                        self.editor.anchor = char_offset;
                        self.editor.preferred_col = None;
                        let visible_lines = self.compute_visible_lines(window);
                        let visible_cols = self.compute_visible_cols(window);
                        self.editor
                            .ensure_cursor_visible(visible_lines, visible_cols);
                    }
                }
                self.close_command_palette();
            }

            PaletteMode::ActionRunner => {
                let actions = self.palette_filtered_actions();
                if let Some(action) = actions.get(self.command_palette.selected_index) {
                    let tag = action.tag;
                    self.close_command_palette();
                    self.execute_palette_action(tag, window, cx);
                } else {
                    self.close_command_palette();
                }
            }
        }
    }

    fn execute_palette_action(
        &mut self,
        tag: PaletteActionTag,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        match tag {
            PaletteActionTag::ToggleLeftPanel => {
                if !self.left_panel_visible && self.file_tree.is_empty() {
                    self.refresh_file_tree(cx);
                } else {
                    self.left_panel_visible = !self.left_panel_visible;
                }
            }
            PaletteActionTag::ToggleBottomPanel => {
                self.bottom_panel_visible = !self.bottom_panel_visible;
            }
            PaletteActionTag::ToggleRightPanel => {
                self.right_panel_visible = !self.right_panel_visible;
            }
            PaletteActionTag::SelectAll => {
                self.editor.select_all();
                let visible_lines = self.compute_visible_lines(window);
                let visible_cols = self.compute_visible_cols(window);
                self.editor
                    .ensure_cursor_visible(visible_lines, visible_cols);
            }
            PaletteActionTag::ToggleCollapseAll => {
                self.toggle_collapse_all();
            }
            PaletteActionTag::SaveFile => {
                self.save_file(cx);
            }
        }
        cx.notify();
    }

    // ── Rendering ────────────────────────────────────────────────────────

    pub(crate) fn render_command_palette(
        &self,
        window: &Window,
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
        if !self.command_palette.open {
            return div().id("palette-backdrop-off");
        }

        let window_w: f32 = window.viewport_size().width.into();
        let palette_left = ((window_w - PALETTE_WIDTH) / 2.0).max(0.0);

        // Clamp selection before rendering to avoid stale index from a previous filter.
        let clamped_index = {
            let count = match self.command_palette.mode() {
                PaletteMode::FileOpen => self.palette_filtered_files().len(),
                PaletteMode::ActionRunner => self.palette_filtered_actions().len(),
                PaletteMode::GoToLine => 0,
            };
            if count == 0 {
                0
            } else {
                self.command_palette.selected_index.min(count - 1)
            }
        };

        let mode = self.command_palette.mode();

        // Build query display with cursor
        let query_display = format!("{}│", self.command_palette.query);

        // Placeholder text
        let placeholder = match mode {
            PaletteMode::FileOpen => "Type a file name to open…",
            PaletteMode::GoToLine => "Type a line number and press Enter…",
            PaletteMode::ActionRunner => "Type an action name…",
        };

        let show_placeholder = self.command_palette.query.is_empty();

        let input_box = div()
            .w_full()
            .h(px(INPUT_HEIGHT))
            .px(px(10.0))
            .flex()
            .items_center()
            .bg(rgb(0x1e1e1e))
            .border_b_1()
            .border_color(rgb(0x007acc))
            .child(
                div()
                    .text_sm()
                    .font_family("Monaco")
                    .text_color(if show_placeholder {
                        rgb(0x6a6a6a)
                    } else {
                        rgb(0xd4d4d4)
                    })
                    .child(SharedString::from(if show_placeholder {
                        placeholder.to_string()
                    } else {
                        query_display
                    })),
            );

        // Build item list
        let mut items_container = div().flex().flex_col().overflow_hidden();

        match mode {
            PaletteMode::FileOpen => {
                let files = self.palette_filtered_files();
                if files.is_empty() {
                    items_container = items_container.child(
                        div()
                            .w_full()
                            .h(px(ITEM_HEIGHT))
                            .px(px(10.0))
                            .flex()
                            .items_center()
                            .bg(rgb(0x252526))
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(rgb(0x6a6a6a))
                                    .child("No matching files"),
                            ),
                    );
                } else {
                    let visible_count = files.len().min(MAX_VISIBLE_ITEMS);
                    // Ensure the selected index is visible within the scroll window
                    let scroll_start = if clamped_index >= visible_count {
                        clamped_index - visible_count + 1
                    } else {
                        0
                    };
                    let scroll_end = (scroll_start + MAX_VISIBLE_ITEMS).min(files.len());

                    for (i, path) in files[scroll_start..scroll_end].iter().enumerate() {
                        let absolute_index = scroll_start + i;
                        let is_selected = absolute_index == clamped_index;
                        let bg = if is_selected {
                            rgb(0x062f4a)
                        } else {
                            rgb(0x252526)
                        };

                        // Show the filename prominently, with the directory path dimmed
                        let (dir_part, file_part) = match path.rfind('/') {
                            Some(pos) => (&path[..=pos], &path[pos + 1..]),
                            None => ("", &**path),
                        };

                        let path_clone = Arc::clone(path);
                        items_container = items_container.child(
                            div()
                                .id(SharedString::from(format!(
                                    "palette-file-{}",
                                    absolute_index
                                )))
                                .w_full()
                                .h(px(ITEM_HEIGHT))
                                .px(px(10.0))
                                .flex()
                                .items_center()
                                .gap(px(6.0))
                                .bg(bg)
                                .hover(|s| s.bg(rgb(0x062f4a)))
                                .cursor_pointer()
                                .on_click(cx.listener(move |this, _, window, cx| {
                                    this.open_file(&path_clone);
                                    let visible_lines = this.compute_visible_lines(window);
                                    let visible_cols = this.compute_visible_cols(window);
                                    this.editor
                                        .ensure_cursor_visible(visible_lines, visible_cols);
                                    this.close_command_palette();
                                    cx.notify();
                                }))
                                .child(
                                    div()
                                        .text_sm()
                                        .font_family("Monaco")
                                        .text_color(rgb(0xd4d4d4))
                                        .child(SharedString::from(file_part.to_string())),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(rgb(0x6a6a6a))
                                        .child(SharedString::from(dir_part.to_string())),
                                ),
                        );
                    }
                } // close else for files.is_empty()
            }

            PaletteMode::ActionRunner => {
                let actions = self.palette_filtered_actions();
                if actions.is_empty() {
                    items_container = items_container.child(
                        div()
                            .w_full()
                            .h(px(ITEM_HEIGHT))
                            .px(px(10.0))
                            .flex()
                            .items_center()
                            .bg(rgb(0x252526))
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(rgb(0x6a6a6a))
                                    .child("No matching actions"),
                            ),
                    );
                } else {
                    let visible_count = actions.len().min(MAX_VISIBLE_ITEMS);
                    let scroll_start = if clamped_index >= visible_count {
                        clamped_index - visible_count + 1
                    } else {
                        0
                    };
                    let scroll_end = (scroll_start + MAX_VISIBLE_ITEMS).min(actions.len());

                    for (i, action) in actions[scroll_start..scroll_end].iter().enumerate() {
                        let absolute_index = scroll_start + i;
                        let is_selected = absolute_index == clamped_index;
                        let bg = if is_selected {
                            rgb(0x062f4a)
                        } else {
                            rgb(0x252526)
                        };

                        let tag = action.tag;
                        items_container = items_container.child(
                            div()
                                .id(SharedString::from(format!(
                                    "palette-action-{}",
                                    absolute_index
                                )))
                                .w_full()
                                .h(px(ITEM_HEIGHT))
                                .px(px(10.0))
                                .flex()
                                .items_center()
                                .bg(bg)
                                .hover(|s| s.bg(rgb(0x062f4a)))
                                .cursor_pointer()
                                .on_click(cx.listener(move |this, _, window, cx| {
                                    this.close_command_palette();
                                    this.execute_palette_action(tag, window, cx);
                                }))
                                .child(
                                    div()
                                        .text_sm()
                                        .font_family("Monaco")
                                        .text_color(rgb(0xd4d4d4))
                                        .child(SharedString::from(action.label.to_string())),
                                ),
                        );
                    }
                } // close else for actions.is_empty()
            }

            PaletteMode::GoToLine => {
                // Show a hint line
                let filter = self.command_palette.filter();
                let hint = if filter.is_empty() {
                    format!(
                        "Current line: {}. Type a number (1–{}) to jump.",
                        self.editor.cursor_row() + 1,
                        self.editor.len_lines()
                    )
                } else if let Ok(n) = filter.parse::<usize>() {
                    let max = self.editor.len_lines();
                    if n == 0 {
                        "Line numbers start at 1.".to_string()
                    } else if n > max {
                        format!(
                            "Line {} is beyond the end of the file ({} lines). Navigate to the end of file.",
                            n, max
                        )
                    } else {
                        format!("Go to line {}. Click or press Enter to confirm.", n)
                    }
                } else {
                    "Enter a valid line number.".to_string()
                };

                let goto_row = div()
                    .id("palette-goto-line")
                    .w_full()
                    .h(px(ITEM_HEIGHT))
                    .px(px(10.0))
                    .flex()
                    .items_center()
                    .bg(rgb(0x252526))
                    .cursor_pointer()
                    .hover(|s| s.bg(rgb(0x062f4a)))
                    .child(
                        div()
                            .text_xs()
                            .text_color(rgb(0x8b919a))
                            .child(SharedString::from(hint)),
                    )
                    .on_click(cx.listener(|this, _, window, cx| {
                        this.clamp_palette_selection();
                        this.palette_confirm(window, cx);
                        cx.notify();
                    }));

                items_container = items_container.child(goto_row);
            }
        }

        // Count items for height calc
        let item_count = match mode {
            PaletteMode::FileOpen => {
                let n = self.palette_filtered_files().len();
                if n == 0 { 1 } else { n.min(MAX_VISIBLE_ITEMS) }
            }
            PaletteMode::ActionRunner => {
                let n = self.palette_filtered_actions().len();
                if n == 0 { 1 } else { n.min(MAX_VISIBLE_ITEMS) }
            }
            PaletteMode::GoToLine => 1,
        };

        let list_height = item_count as f32 * ITEM_HEIGHT;

        // Full-screen transparent backdrop — clicking outside the palette closes it
        let backdrop = div()
            .id("palette-backdrop")
            .absolute()
            .top_0()
            .left_0()
            .size_full()
            .on_click(cx.listener(|this, _, _window, cx| {
                this.close_command_palette();
                cx.notify();
            }));

        // The overlay container — absolutely positioned centered at the top
        let palette_panel = div()
            .absolute()
            .top(px(PALETTE_TOP))
            .left(px(palette_left))
            .w(px(PALETTE_WIDTH))
            .bg(rgb(0x252526))
            .border_1()
            .border_color(rgb(0x3c3c3c))
            .rounded(px(6.0))
            .overflow_hidden()
            .shadow_lg()
            .child(input_box)
            .child(
                div()
                    .w_full()
                    .h(px(list_height))
                    .overflow_hidden()
                    .child(items_container),
            );

        div()
            .id("palette-wrapper")
            .absolute()
            .top_0()
            .left_0()
            .size_full()
            .child(backdrop)
            .child(palette_panel)
    }
}
