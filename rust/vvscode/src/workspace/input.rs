//! Keyboard and scroll-wheel input handling.

use gpui::{Context, KeyDownEvent, ScrollDelta, ScrollWheelEvent, Window};

use crate::terminal::key_to_bytes;

use super::{CHAR_WIDTH, LEFT_PANEL_W, LINE_HEIGHT, SCROLL_SENSITIVITY, Workspace};

// ── Input handling ───────────────────────────────────────────────────────────

impl Workspace {
    pub(crate) fn handle_key_down(
        &mut self,
        ev: &KeyDownEvent,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let keystroke = &ev.keystroke;
        let key = keystroke.key.as_str();
        let shift = keystroke.modifiers.shift;
        let cmd = keystroke.modifiers.platform;
        let alt = keystroke.modifiers.alt;
        let ctrl = keystroke.modifiers.control;
        let func = keystroke.modifiers.function;

        // ── Command palette intercept ────────────────────────────────────
        // When the palette is open, route all key events to it first.
        // If it consumes the event, skip normal editor handling entirely.
        if self.command_palette.open {
            let consumed =
                self.handle_palette_key(key, keystroke.key_char.as_deref(), cmd, ctrl, window, cx);
            if consumed {
                return;
            }
        }

        // ── Terminal intercept ───────────────────────────────────────────
        // When the terminal panel is focused, forward keys to the PTY
        // instead of the editor. Cmd+` toggles the panel (handled by
        // the action system), so we don't intercept that here.
        if self.terminal_focus_handle.is_focused(window) && self.bottom_panel_visible {
            // Let Cmd-key combos fall through to the action system
            // (e.g. Cmd+`, Cmd+B, Cmd+P, Cmd+S, etc.)
            if cmd {
                // Fall through — don't consume, let actions handle it.
            } else if let Some(bytes) =
                key_to_bytes(key, keystroke.key_char.as_deref(), shift, ctrl, alt, false)
            {
                if let Some(ref mut term) = self.terminal {
                    term.write_all(&bytes);
                }
                cx.notify();
                return;
            }
        }

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
            "backspace" if cmd => {
                self.editor.delete_to_line_start();
                self.dirty = true;
            }
            "backspace" if alt || ctrl => {
                self.editor.delete_word_backward();
                self.dirty = true;
            }
            "backspace" => {
                self.editor.backspace();
                self.dirty = true;
            }
            "delete" => {
                self.editor.delete();
                self.dirty = true;
            }

            // ── Editing keys (only without cmd/ctrl/fn) ─────────────────
            _ if cmd || ctrl || func => return, // let action system handle

            "enter" => {
                self.editor.insert_newline();
                self.dirty = true;
            }
            "tab" => {
                self.editor.insert_tab();
                self.dirty = true;
            }
            "escape" | "shift" | "alt" | "capslock" => {}
            _ => {
                // Use key_char if available (for proper text input), otherwise use key
                let text: &str = keystroke.key_char.as_deref().unwrap_or(key);
                for ch in text.chars() {
                    if !ch.is_control() {
                        self.editor.insert_char(ch);
                        self.dirty = true;
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

    // ── Scroll ───────────────────────────────────────────────────────────

    /// Convert a scroll delta into (columns, lines) as f32.
    pub(crate) fn scroll_delta(delta: &ScrollDelta) -> (f32, f32) {
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

    pub(crate) fn handle_scroll_wheel(
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

    pub(crate) fn handle_left_panel_scroll(
        &mut self,
        ev: &ScrollWheelEvent,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let (_delta_x, delta_y) = Self::scroll_delta(&ev.delta);

        if delta_y.abs() > 0.01 {
            let visible = self.compute_visible_panel_entries(window);
            let total_visible = self.visible_file_tree().len();
            let max_offset = total_visible.saturating_sub(visible);
            let new = (self.left_panel_scroll as f32 + delta_y)
                .round()
                .clamp(0.0, max_offset as f32);
            self.left_panel_scroll = new as usize;
        }

        cx.notify();
    }
}
