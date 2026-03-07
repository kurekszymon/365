//! Terminal emulator — PTY process, VTE parser, and cell grid.
//!
//! This module owns the pseudo-terminal child process (via `portable-pty`)
//! and a VTE parser that turns ANSI escape sequences into a 2D grid of
//! `Cell`s that the renderer can paint.
//!
//! ## Architecture
//!
//! ```text
//!   ┌──────────┐  write()   ┌─────┐  stdout  ┌───────────┐
//!   │ Keyboard │──────────▶│ PTY │─────────▶│ VTE Parse │
//!   └──────────┘            └─────┘          └─────┬─────┘
//!                                                  │
//!                                          ┌───────▼───────┐
//!                                          │ TerminalGrid  │
//!                                          │ (Arc<Mutex>)  │
//!                                          └───────────────┘
//!                                                  │
//!                                          ┌───────▼───────┐
//!                                          │  GPUI Render  │
//!                                          └───────────────┘
//! ```
//!
//! A background thread reads from the PTY and feeds bytes into `vte::Parser`,
//! which calls methods on our `TerminalGrid` (behind `Arc<Mutex>`).
//! The render path locks the grid and paints cells.

use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;

use async_channel::{self, Receiver, Sender};
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use vte::{Params, Parser, Perform};

// ── Constants ────────────────────────────────────────────────────────────────

/// Maximum scrollback lines kept in memory.
const MAX_SCROLLBACK: usize = 1_000;

// ── Cell ─────────────────────────────────────────────────────────────────────

/// One character cell in the terminal grid.
#[derive(Clone, Copy)]
pub struct Cell {
    pub ch: char,
    pub fg: u32,
    pub bg: u32,
    pub bold: bool,
}

impl Default for Cell {
    fn default() -> Self {
        Self {
            ch: ' ',
            fg: 0xcccccc, // default foreground — light grey
            bg: 0x1e1e1e, // default background — editor bg
            bold: false,
        }
    }
}

// ── SGR color state (Select Graphic Rendition) ──────────────────────────────

#[derive(Clone, Copy)]
struct SgrState {
    fg: u32,
    bg: u32,
    bold: bool,
}

impl Default for SgrState {
    fn default() -> Self {
        Self {
            fg: 0xcccccc,
            bg: 0x1e1e1e,
            bold: false,
        }
    }
}

// ── Standard ANSI 8-color + bright palette ──────────────────────────────────

const ANSI_COLORS: [u32; 16] = [
    0x000000, // 0  black
    0xcd3131, // 1  red
    0x0dbc79, // 2  green
    0xe5e510, // 3  yellow
    0x2472c8, // 4  blue
    0xbc3fbc, // 5  magenta
    0x11a8cd, // 6  cyan
    0xe5e5e5, // 7  white
    0x666666, // 8  bright black
    0xf14c4c, // 9  bright red
    0x23d18b, // 10 bright green
    0xf5f543, // 11 bright yellow
    0x3b8eea, // 12 bright blue
    0xd670d6, // 13 bright magenta
    0x29b8db, // 14 bright cyan
    0xe5e5e5, // 15 bright white
];

/// Convert an 8-bit color index (0–255) to a 24-bit RGB value.
fn color_256(idx: u16) -> u32 {
    if idx < 16 {
        ANSI_COLORS[idx as usize]
    } else if idx < 232 {
        // 6×6×6 color cube: indices 16–231
        let idx = idx - 16;
        let r = (idx / 36) as u32;
        let g = ((idx % 36) / 6) as u32;
        let b = (idx % 6) as u32;
        let to_byte = |v: u32| if v == 0 { 0u32 } else { 55 + 40 * v };
        (to_byte(r) << 16) | (to_byte(g) << 8) | to_byte(b)
    } else {
        // Grayscale ramp: indices 232–255 → 8, 18, 28 … 238
        let g = (8 + 10 * (idx - 232)) as u32;
        (g << 16) | (g << 8) | g
    }
}

// ── TerminalGrid ─────────────────────────────────────────────────────────────

/// The grid of cells plus cursor position — shared between the reader thread
/// and the UI thread via `Arc<Mutex<…>>`.
pub struct TerminalGrid {
    pub cols: usize,
    pub rows: usize,
    /// Active screen lines (index 0 = topmost visible line).
    pub lines: Vec<Vec<Cell>>,
    /// Scrollback buffer (most recent at the end).
    pub scrollback: Vec<Vec<Cell>>,
    /// Cursor row (0-based, relative to visible area).
    pub cursor_row: usize,
    /// Cursor column (0-based).
    pub cursor_col: usize,
    /// Whether the cursor is visible.
    pub cursor_visible: bool,
    /// Current SGR attributes for the next character printed.
    sgr: SgrState,
    /// Saved cursor position (for `\e[s` / `\e[u` and DECSC/DECRC).
    saved_cursor: (usize, usize),
    /// Scrollback viewport offset (0 = bottom / live, >0 = scrolled up).
    pub scroll_offset: usize,
    /// Whether new output has arrived since last render.
    pub dirty: bool,
    /// Whether the application running inside the PTY has requested
    /// mouse reporting (e.g. via CSI ?1000h / ?1002h / ?1003h / ?1006h).
    /// When true, the workspace should forward mouse events to the PTY.
    pub mouse_reporting: bool,
    // (mouse reporting is tracked here; workspace forwards events when terminal focused)
    /// Alternate screen buffer (used by programs like vim, less).
    alt_lines: Option<Vec<Vec<Cell>>>,
    alt_cursor: (usize, usize),
    /// Scroll region top (inclusive, 0-based).
    scroll_top: usize,
    /// Scroll region bottom (inclusive, 0-based).
    scroll_bot: usize,
    /// Origin mode: when true, cursor positions are relative to scroll region.
    origin_mode: bool,
    /// Auto-wrap: when true, printing past last col wraps to next line.
    auto_wrap: bool,
    /// Track if the cursor is in the "pending wrap" state.
    wrap_pending: bool,
}

impl TerminalGrid {
    pub fn new(cols: usize, rows: usize) -> Self {
        let lines = vec![vec![Cell::default(); cols]; rows];
        Self {
            cols,
            rows,
            lines,
            scrollback: Vec::new(),
            cursor_row: 0,
            cursor_col: 0,
            cursor_visible: true,
            sgr: SgrState::default(),
            saved_cursor: (0, 0),
            scroll_offset: 0,
            dirty: true,
            mouse_reporting: false,
            alt_lines: None,
            alt_cursor: (0, 0),
            scroll_top: 0,
            scroll_bot: rows.saturating_sub(1),
            origin_mode: false,
            auto_wrap: true,
            wrap_pending: false,
        }
    }

    /// Resize the grid. Tries to preserve content.
    pub fn resize(&mut self, cols: usize, rows: usize) {
        if cols == self.cols && rows == self.rows {
            return;
        }
        // Grow / shrink each existing line to the new column count.
        for line in &mut self.lines {
            line.resize(cols, Cell::default());
        }
        // Add rows: pull from scrollback first, then add blank lines.
        while self.lines.len() < rows {
            if let Some(restored) = self.scrollback.pop() {
                // Restore a line from scrollback to the top of the screen.
                let mut restored = restored;
                restored.resize(cols, Cell::default());
                self.lines.insert(0, restored);
                // Cursor shifts down since we inserted above it.
                self.cursor_row = (self.cursor_row + 1).min(rows.saturating_sub(1));
            } else {
                self.lines.push(vec![Cell::default(); cols]);
            }
        }
        while self.lines.len() > rows {
            // Push excess top lines into scrollback.
            let removed = self.lines.remove(0);
            self.scrollback.push(removed);
            if self.scrollback.len() > MAX_SCROLLBACK {
                self.scrollback.remove(0);
            }
            if self.cursor_row > 0 {
                self.cursor_row -= 1;
            }
        }
        self.cols = cols;
        self.rows = rows;
        self.scroll_top = 0;
        self.scroll_bot = rows.saturating_sub(1);
        self.cursor_row = self.cursor_row.min(rows.saturating_sub(1));
        self.cursor_col = self.cursor_col.min(cols.saturating_sub(1));
        self.dirty = true;
    }

    // ── Scroll helpers ───────────────────────────────────────────────────

    /// Scroll the region [scroll_top..=scroll_bot] up by one line.
    fn scroll_up(&mut self) {
        let top = self.scroll_top;
        let bot = self.scroll_bot.min(self.rows.saturating_sub(1));
        if top >= self.rows || top > bot {
            return;
        }
        // If scroll region is the full screen, push the removed line into scrollback.
        if top == 0 && bot == self.rows.saturating_sub(1) {
            let removed = self.lines.remove(0);
            self.scrollback.push(removed);
            if self.scrollback.len() > MAX_SCROLLBACK {
                self.scrollback.remove(0);
            }
            self.lines.push(vec![Cell::default(); self.cols]);
        } else {
            self.lines.remove(top);
            self.lines.insert(bot, vec![Cell::default(); self.cols]);
        }
        self.dirty = true;
    }

    /// Scroll the region [scroll_top..=scroll_bot] down by one line.
    fn scroll_down(&mut self) {
        let top = self.scroll_top;
        let bot = self.scroll_bot.min(self.rows.saturating_sub(1));
        if top >= self.rows || top > bot {
            return;
        }
        self.lines.remove(bot);
        self.lines.insert(top, vec![Cell::default(); self.cols]);
        self.dirty = true;
    }

    /// Move cursor down, scrolling if needed.
    fn linefeed(&mut self) {
        if self.cursor_row == self.scroll_bot {
            self.scroll_up();
        } else if self.cursor_row < self.rows.saturating_sub(1) {
            self.cursor_row += 1;
        }
        self.wrap_pending = false;
    }

    /// Carriage return — move cursor to column 0.
    fn carriage_return(&mut self) {
        self.cursor_col = 0;
        self.wrap_pending = false;
    }

    /// Backspace — move cursor one column left (doesn't erase).
    fn backspace(&mut self) {
        if self.cursor_col > 0 {
            self.cursor_col -= 1;
        }
        self.wrap_pending = false;
    }

    /// Tab — advance to the next multiple of 8.
    fn tab(&mut self) {
        self.cursor_col = ((self.cursor_col / 8) + 1) * 8;
        if self.cursor_col >= self.cols {
            self.cursor_col = self.cols.saturating_sub(1);
        }
        self.wrap_pending = false;
    }

    /// Put a character at the current cursor position with current SGR.
    fn put_char(&mut self, ch: char) {
        if self.wrap_pending {
            self.carriage_return();
            self.linefeed();
        }
        if self.cursor_row < self.rows && self.cursor_col < self.cols {
            self.lines[self.cursor_row][self.cursor_col] = Cell {
                ch,
                fg: self.sgr.fg,
                bg: self.sgr.bg,
                bold: self.sgr.bold,
            };
        }
        self.cursor_col += 1;
        if self.cursor_col >= self.cols {
            if self.auto_wrap {
                self.cursor_col = self.cols.saturating_sub(1);
                self.wrap_pending = true;
            } else {
                self.cursor_col = self.cols.saturating_sub(1);
            }
        }
    }

    /// Erase from cursor to end of line.
    fn erase_to_eol(&mut self) {
        if self.cursor_row < self.rows {
            for c in self.cursor_col..self.cols {
                self.lines[self.cursor_row][c] = Cell {
                    fg: self.sgr.fg,
                    bg: self.sgr.bg,
                    ..Cell::default()
                };
            }
        }
    }

    /// Erase from start of line to cursor.
    fn erase_to_bol(&mut self) {
        if self.cursor_row < self.rows {
            for c in 0..=self.cursor_col.min(self.cols.saturating_sub(1)) {
                self.lines[self.cursor_row][c] = Cell {
                    fg: self.sgr.fg,
                    bg: self.sgr.bg,
                    ..Cell::default()
                };
            }
        }
    }

    /// Erase the entire current line.
    fn erase_line(&mut self) {
        if self.cursor_row < self.rows {
            self.lines[self.cursor_row] = vec![
                Cell {
                    fg: self.sgr.fg,
                    bg: self.sgr.bg,
                    ..Cell::default()
                };
                self.cols
            ];
        }
    }

    /// Erase from cursor to end of screen.
    fn erase_below(&mut self) {
        self.erase_to_eol();
        for r in (self.cursor_row + 1)..self.rows {
            self.lines[r] = vec![
                Cell {
                    fg: self.sgr.fg,
                    bg: self.sgr.bg,
                    ..Cell::default()
                };
                self.cols
            ];
        }
    }

    /// Erase from start of screen to cursor.
    fn erase_above(&mut self) {
        self.erase_to_bol();
        for r in 0..self.cursor_row {
            self.lines[r] = vec![
                Cell {
                    fg: self.sgr.fg,
                    bg: self.sgr.bg,
                    ..Cell::default()
                };
                self.cols
            ];
        }
    }

    /// Erase entire screen.
    fn erase_screen(&mut self) {
        for r in 0..self.rows {
            self.lines[r] = vec![
                Cell {
                    fg: self.sgr.fg,
                    bg: self.sgr.bg,
                    ..Cell::default()
                };
                self.cols
            ];
        }
    }

    /// Delete `n` characters at cursor position, shifting the rest left.
    fn delete_chars(&mut self, n: usize) {
        if self.cursor_row < self.rows {
            let line = &mut self.lines[self.cursor_row];
            let start = self.cursor_col;
            for _ in 0..n {
                if start < line.len() {
                    line.remove(start);
                    line.push(Cell::default());
                }
            }
        }
    }

    /// Insert `n` blank characters at cursor position, shifting the rest right.
    fn insert_chars(&mut self, n: usize) {
        if self.cursor_row < self.rows {
            let line = &mut self.lines[self.cursor_row];
            for _ in 0..n {
                if self.cursor_col < line.len() {
                    line.insert(self.cursor_col, Cell::default());
                    line.truncate(self.cols);
                }
            }
        }
    }

    /// Insert `n` blank lines at cursor row, scrolling lines below down.
    fn insert_lines(&mut self, n: usize) {
        let top = self.cursor_row;
        let bot = self.scroll_bot.min(self.rows.saturating_sub(1));
        for _ in 0..n {
            if top <= bot && bot < self.lines.len() {
                self.lines.remove(bot);
                self.lines.insert(top, vec![Cell::default(); self.cols]);
            }
        }
    }

    /// Delete `n` lines at cursor row, scrolling lines below up.
    fn delete_lines(&mut self, n: usize) {
        let top = self.cursor_row;
        let bot = self.scroll_bot.min(self.rows.saturating_sub(1));
        for _ in 0..n {
            if top <= bot && top < self.lines.len() {
                self.lines.remove(top);
                self.lines.insert(bot, vec![Cell::default(); self.cols]);
            }
        }
    }

    /// Apply SGR (Select Graphic Rendition) parameters.
    fn apply_sgr(&mut self, params: &Params) {
        let mut iter = params.iter();
        loop {
            let sub = match iter.next() {
                Some(s) => s,
                None => break,
            };
            let code = sub[0];
            match code {
                0 => self.sgr = SgrState::default(),
                1 => self.sgr.bold = true,
                22 => self.sgr.bold = false,
                // Standard foreground colors 30–37
                30..=37 => self.sgr.fg = ANSI_COLORS[(code - 30) as usize],
                // Bright foreground colors 90–97
                90..=97 => self.sgr.fg = ANSI_COLORS[(code - 90 + 8) as usize],
                39 => self.sgr.fg = SgrState::default().fg,
                // Standard background colors 40–47
                40..=47 => self.sgr.bg = ANSI_COLORS[(code - 40) as usize],
                // Bright background colors 100–107
                100..=107 => self.sgr.bg = ANSI_COLORS[(code - 100 + 8) as usize],
                49 => self.sgr.bg = SgrState::default().bg,
                // Extended foreground: 38;5;N (256-color) or 38;2;R;G;B (truecolor)
                38 => {
                    if let Some(kind) = iter.next() {
                        match kind[0] {
                            5 => {
                                if let Some(idx) = iter.next() {
                                    self.sgr.fg = color_256(idx[0]);
                                }
                            }
                            2 => {
                                let r = iter.next().map(|s| s[0]).unwrap_or(0) as u32;
                                let g = iter.next().map(|s| s[0]).unwrap_or(0) as u32;
                                let b = iter.next().map(|s| s[0]).unwrap_or(0) as u32;
                                self.sgr.fg = (r << 16) | (g << 8) | b;
                            }
                            _ => {}
                        }
                    }
                }
                // Extended background: 48;5;N or 48;2;R;G;B
                48 => {
                    if let Some(kind) = iter.next() {
                        match kind[0] {
                            5 => {
                                if let Some(idx) = iter.next() {
                                    self.sgr.bg = color_256(idx[0]);
                                }
                            }
                            2 => {
                                let r = iter.next().map(|s| s[0]).unwrap_or(0) as u32;
                                let g = iter.next().map(|s| s[0]).unwrap_or(0) as u32;
                                let b = iter.next().map(|s| s[0]).unwrap_or(0) as u32;
                                self.sgr.bg = (r << 16) | (g << 8) | b;
                            }
                            _ => {}
                        }
                    }
                }
                _ => {} // ignore unsupported SGR codes
            }
        }
    }

    /// Enter alternate screen buffer (used by vim, less, htop, etc.).
    fn enter_alt_screen(&mut self) {
        if self.alt_lines.is_some() {
            return; // already in alt screen
        }
        self.alt_lines = Some(std::mem::replace(
            &mut self.lines,
            vec![vec![Cell::default(); self.cols]; self.rows],
        ));
        self.alt_cursor = (self.cursor_row, self.cursor_col);
        self.cursor_row = 0;
        self.cursor_col = 0;
        self.dirty = true;
    }

    /// Leave alternate screen buffer, restoring the main screen.
    fn leave_alt_screen(&mut self) {
        if let Some(main_lines) = self.alt_lines.take() {
            self.lines = main_lines;
            // Ensure lines match current dimensions.
            while self.lines.len() < self.rows {
                self.lines.push(vec![Cell::default(); self.cols]);
            }
            self.lines.truncate(self.rows);
            for line in &mut self.lines {
                line.resize(self.cols, Cell::default());
            }
            self.cursor_row = self.alt_cursor.0.min(self.rows.saturating_sub(1));
            self.cursor_col = self.alt_cursor.1.min(self.cols.saturating_sub(1));
            self.dirty = true;
        }
    }

    // ── Scrollback viewing helpers ───────────────────────────────────────

    /// Maximum scroll offset (number of scrollback lines available).
    pub fn max_scroll_offset(&self) -> usize {
        self.scrollback.len()
    }

    /// Return the line to display at visible row `r` (0 = top of viewport).
    ///
    /// When `scroll_offset == 0` (live view), row `r` maps to `self.lines[r]`.
    /// When scrolled up, the viewport shifts into the scrollback buffer:
    ///
    /// ```text
    ///   scrollback:  [ sb0, sb1, sb2, sb3 ]   (len = 4)
    ///   lines:       [ L0,  L1,  L2 ]          (rows = 3)
    ///   combined:    [ sb0, sb1, sb2, sb3, L0, L1, L2 ]
    ///
    ///   scroll_offset=0  →  viewport = [L0, L1, L2]        (bottom)
    ///   scroll_offset=2  →  viewport = [sb2, sb3, L0]
    ///   scroll_offset=4  →  viewport = [sb0, sb1, sb2]     (top)
    /// ```
    pub fn visible_line(&self, r: usize) -> Option<&Vec<Cell>> {
        let sb_len = self.scrollback.len();
        // Index into the combined (scrollback ++ lines) buffer.
        let combined_idx = sb_len.saturating_sub(self.scroll_offset) + r;
        if combined_idx < sb_len {
            Some(&self.scrollback[combined_idx])
        } else {
            let line_idx = combined_idx - sb_len;
            self.lines.get(line_idx)
        }
    }

    /// Whether the viewport is at the live bottom (not scrolled up).
    pub fn is_at_bottom(&self) -> bool {
        self.scroll_offset == 0
    }
}

// ── VTE Perform implementation ───────────────────────────────────────────────
//
// The `vte::Parser` calls these methods on `TerminalGrid` as it decodes the
// byte stream coming from the PTY.

impl Perform for TerminalGrid {
    fn print(&mut self, c: char) {
        self.put_char(c);
        self.dirty = true;
    }

    fn execute(&mut self, byte: u8) {
        match byte {
            // BEL
            0x07 => {} // ignore bell for now
            // BS
            0x08 => self.backspace(),
            // HT (tab)
            0x09 => self.tab(),
            // LF / VT / FF — all treated as newline
            0x0a | 0x0b | 0x0c => self.linefeed(),
            // CR
            0x0d => self.carriage_return(),
            _ => {}
        }
        self.dirty = true;
    }

    fn csi_dispatch(&mut self, params: &Params, intermediates: &[u8], _ignore: bool, action: char) {
        // Helper: get the first parameter, defaulting to `def`.
        let p = |def: u16| -> u16 {
            params
                .iter()
                .next()
                .and_then(|s| s.first().copied())
                .map(|v| if v == 0 { def } else { v })
                .unwrap_or(def)
        };

        // Helper: get two parameters.
        let p2 = || -> (u16, u16) {
            let mut it = params.iter();
            let a = it
                .next()
                .and_then(|s| s.first().copied())
                .map(|v| if v == 0 { 1 } else { v })
                .unwrap_or(1);
            let b = it
                .next()
                .and_then(|s| s.first().copied())
                .map(|v| if v == 0 { 1 } else { v })
                .unwrap_or(1);
            (a, b)
        };

        // Check for `?` private marker.
        let private = intermediates.first() == Some(&b'?');

        match action {
            // CUU — Cursor Up
            'A' => {
                let n = p(1) as usize;
                self.cursor_row = self.cursor_row.saturating_sub(n);
                self.wrap_pending = false;
            }
            // CUD — Cursor Down
            'B' => {
                let n = p(1) as usize;
                self.cursor_row = (self.cursor_row + n).min(self.rows.saturating_sub(1));
                self.wrap_pending = false;
            }
            // CUF — Cursor Forward
            'C' => {
                let n = p(1) as usize;
                self.cursor_col = (self.cursor_col + n).min(self.cols.saturating_sub(1));
                self.wrap_pending = false;
            }
            // CUB — Cursor Back
            'D' => {
                let n = p(1) as usize;
                self.cursor_col = self.cursor_col.saturating_sub(n);
                self.wrap_pending = false;
            }
            // CNL — Cursor Next Line
            'E' => {
                let n = p(1) as usize;
                self.cursor_row = (self.cursor_row + n).min(self.rows.saturating_sub(1));
                self.cursor_col = 0;
                self.wrap_pending = false;
            }
            // CPL — Cursor Previous Line
            'F' => {
                let n = p(1) as usize;
                self.cursor_row = self.cursor_row.saturating_sub(n);
                self.cursor_col = 0;
                self.wrap_pending = false;
            }
            // CHA — Cursor Horizontal Absolute
            'G' => {
                let n = p(1) as usize;
                self.cursor_col = (n.saturating_sub(1)).min(self.cols.saturating_sub(1));
                self.wrap_pending = false;
            }
            // CUP / HVP — Cursor Position
            'H' | 'f' => {
                let (row, col) = p2();
                self.cursor_row =
                    ((row as usize).saturating_sub(1)).min(self.rows.saturating_sub(1));
                self.cursor_col =
                    ((col as usize).saturating_sub(1)).min(self.cols.saturating_sub(1));
                self.wrap_pending = false;
            }
            // ED — Erase in Display
            'J' => {
                let mode = p(0);
                match mode {
                    0 => self.erase_below(),
                    1 => self.erase_above(),
                    2 | 3 => self.erase_screen(),
                    _ => {}
                }
            }
            // EL — Erase in Line
            'K' => {
                let mode = p(0);
                match mode {
                    0 => self.erase_to_eol(),
                    1 => self.erase_to_bol(),
                    2 => self.erase_line(),
                    _ => {}
                }
            }
            // IL — Insert Lines
            'L' => {
                let n = p(1) as usize;
                self.insert_lines(n);
            }
            // DL — Delete Lines
            'M' => {
                let n = p(1) as usize;
                self.delete_lines(n);
            }
            // DCH — Delete Characters
            'P' => {
                let n = p(1) as usize;
                self.delete_chars(n);
            }
            // SU — Scroll Up
            'S' if !private => {
                let n = p(1) as usize;
                for _ in 0..n {
                    self.scroll_up();
                }
            }
            // SD — Scroll Down
            'T' if !private => {
                let n = p(1) as usize;
                for _ in 0..n {
                    self.scroll_down();
                }
            }
            // ICH — Insert Characters
            '@' => {
                let n = p(1) as usize;
                self.insert_chars(n);
            }
            // ECH — Erase Characters (fill with spaces)
            'X' => {
                let n = p(1) as usize;
                if self.cursor_row < self.rows {
                    for i in 0..n {
                        let c = self.cursor_col + i;
                        if c < self.cols {
                            self.lines[self.cursor_row][c] = Cell {
                                fg: self.sgr.fg,
                                bg: self.sgr.bg,
                                ..Cell::default()
                            };
                        }
                    }
                }
            }
            // VPA — Line Position Absolute
            'd' => {
                let n = p(1) as usize;
                self.cursor_row = (n.saturating_sub(1)).min(self.rows.saturating_sub(1));
                self.wrap_pending = false;
            }
            // SGR — Select Graphic Rendition
            'm' => self.apply_sgr(params),
            // DECSTBM — Set Scrolling Region
            'r' if !private => {
                let (top, bot) = p2();
                self.scroll_top = (top as usize).saturating_sub(1);
                self.scroll_bot =
                    ((bot as usize).saturating_sub(1)).min(self.rows.saturating_sub(1));
                // Move cursor to home after setting scroll region.
                self.cursor_row = if self.origin_mode { self.scroll_top } else { 0 };
                self.cursor_col = 0;
                self.wrap_pending = false;
            }
            // DECSC (via CSI) — Save Cursor Position
            's' if !private => {
                self.saved_cursor = (self.cursor_row, self.cursor_col);
            }
            // DECRC (via CSI) — Restore Cursor Position
            'u' if !private => {
                self.cursor_row = self.saved_cursor.0.min(self.rows.saturating_sub(1));
                self.cursor_col = self.saved_cursor.1.min(self.cols.saturating_sub(1));
                self.wrap_pending = false;
            }
            // Private modes — DEC set/reset
            'h' if private => {
                for sub in params.iter() {
                    // Params are slices of numeric values; take first value if present.
                    let n = sub.first().copied().unwrap_or(0) as usize;
                    match n {
                        // DECCKM — cursor key mode (we note it but don't change behavior yet)
                        1 => {}
                        // Origin mode
                        6 => self.origin_mode = true,
                        // Auto-wrap mode
                        7 => self.auto_wrap = true,
                        // Show cursor
                        25 => self.cursor_visible = true,
                        // Mouse reporting requested by the application
                        // Common mouse reporting private modes: 1000, 1002, 1003, 1006, 1005
                        1000 | 1002 | 1003 | 1006 | 1005 => self.mouse_reporting = true,
                        // Alt screen buffer
                        1049 | 47 | 1047 => self.enter_alt_screen(),
                        _ => {}
                    }
                }
            }
            'l' if private => {
                for sub in params.iter() {
                    let n = sub.first().copied().unwrap_or(0) as usize;
                    match n {
                        6 => self.origin_mode = false,
                        7 => self.auto_wrap = false,
                        25 => self.cursor_visible = false,
                        // Mouse reporting disable requested by the application
                        1000 | 1002 | 1003 | 1006 | 1005 => self.mouse_reporting = false,
                        1049 | 47 | 1047 => self.leave_alt_screen(),
                        _ => {}
                    }
                }
            }
            // DSR — Device Status Report — the shell asks "where is the cursor?"
            'n' if !private => {
                // We can't respond here (no writer handle), but that's okay
                // for basic usage. Programs that hard-depend on DSR responses
                // will time out gracefully.
            }
            _ => {
                // Unhandled CSI sequence — silently ignore.
            }
        }
        self.dirty = true;
    }

    fn esc_dispatch(&mut self, intermediates: &[u8], _ignore: bool, byte: u8) {
        match (intermediates, byte) {
            // DECSC — Save cursor
            ([], b'7') => {
                self.saved_cursor = (self.cursor_row, self.cursor_col);
            }
            // DECRC — Restore cursor
            ([], b'8') => {
                self.cursor_row = self.saved_cursor.0.min(self.rows.saturating_sub(1));
                self.cursor_col = self.saved_cursor.1.min(self.cols.saturating_sub(1));
                self.wrap_pending = false;
            }
            // RI — Reverse Index (move cursor up, scrolling if needed)
            ([], b'M') => {
                if self.cursor_row == self.scroll_top {
                    self.scroll_down();
                } else if self.cursor_row > 0 {
                    self.cursor_row -= 1;
                }
                self.wrap_pending = false;
            }
            // IND — Index (move cursor down, scrolling if needed)
            ([], b'D') => {
                self.linefeed();
            }
            // NEL — Next line
            ([], b'E') => {
                self.carriage_return();
                self.linefeed();
            }
            _ => {}
        }
        self.dirty = true;
    }

    fn osc_dispatch(&mut self, _params: &[&[u8]], _bell_terminated: bool) {
        // OSC sequences set window title, colors, etc.
        // We silently ignore them for now.
    }

    fn hook(&mut self, _params: &Params, _intermediates: &[u8], _ignore: bool, _action: char) {
        // DCS hook — ignore.
    }

    fn put(&mut self, _byte: u8) {
        // DCS body bytes — ignore.
    }

    fn unhook(&mut self) {
        // DCS terminator — ignore.
    }
}

// ── Terminal (public handle) ─────────────────────────────────────────────────

/// High-level terminal handle owned by `Workspace`.
///
/// Holds the shared grid and the writer end of the PTY.
pub struct Terminal {
    /// Shared grid state (reader thread writes, UI thread reads).
    pub grid: Arc<Mutex<TerminalGrid>>,
    /// Writer handle to send keystrokes to the PTY.
    writer: Box<dyn Write + Send>,
    /// Handle to the child process (kept alive so it isn't dropped/killed).
    _child: Box<dyn portable_pty::Child + Send + Sync>,
    /// Reader thread handle (kept alive so the thread isn't orphaned).
    _reader_handle: thread::JoinHandle<()>,
}

impl Terminal {
    /// Spawn a new terminal with the user's default shell.
    ///
    /// Returns `(Terminal, Receiver<()>)`. The receiver fires every time the
    /// PTY produces output — the caller should `await` it in an async loop
    /// and call `cx.notify()` to trigger a repaint.
    pub fn spawn(
        cols: u16,
        rows: u16,
        cwd: Option<&str>,
    ) -> Result<(Self, Receiver<()>), Box<dyn std::error::Error>> {
        let pty_system = NativePtySystem::default();

        let pty_size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system.openpty(pty_size)?;

        // Figure out the user's shell.
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());

        let mut cmd = CommandBuilder::new(&shell);
        cmd.arg("-l"); // login shell, so we get PATH etc.
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }

        // Set TERM so the shell knows we understand ANSI.
        cmd.env("TERM", "xterm-256color");

        let child = pair.slave.spawn_command(cmd)?;
        drop(pair.slave); // Close the slave side; the child owns it now.

        let writer = pair.master.take_writer()?;
        let mut reader = pair.master.try_clone_reader()?;

        let grid = Arc::new(Mutex::new(TerminalGrid::new(cols as usize, rows as usize)));
        let grid_for_thread = Arc::clone(&grid);

        // Bounded(1): if the UI hasn't consumed the previous signal yet,
        // we don't queue up — one wakeup is enough.
        let (tx, rx): (Sender<()>, Receiver<()>) = async_channel::bounded(1);

        let reader_handle = thread::spawn(move || {
            let mut parser = Parser::new();
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,  // PTY closed (child exited)
                    Err(_) => break, // read error
                    Ok(n) => {
                        let mut g = grid_for_thread.lock().unwrap();
                        parser.advance(&mut *g, &buf[..n]);
                        g.dirty = true;
                        drop(g);
                        // Non-blocking: if the channel is full (UI hasn't
                        // consumed the last signal), this just drops the
                        // send — one pending wakeup is sufficient.
                        let _ = tx.try_send(());
                    }
                }
            }
        });

        Ok((
            Terminal {
                grid,
                writer,
                _child: child,
                _reader_handle: reader_handle,
            },
            rx,
        ))
    }

    /// Write raw bytes to the PTY (keyboard input).
    pub fn write_all(&mut self, data: &[u8]) {
        let _ = self.writer.write_all(data);
        let _ = self.writer.flush();
    }

    /// Send a resize notification to the PTY and grid.
    pub fn resize(&mut self, cols: u16, rows: u16) {
        // Update the grid dimensions.
        if let Ok(mut g) = self.grid.lock() {
            g.resize(cols as usize, rows as usize);
        }
        // We can't easily resize the PTY through portable-pty without
        // holding on to the MasterPty, which we've consumed for the reader.
        // For a first pass, the grid resize is sufficient — programs that
        // query terminal size via ioctl will see the original size, but
        // rendering will be correct for our panel dimensions.
    }

    /// Read the grid (locks the mutex). Returns the lock guard.
    pub fn lock_grid(&self) -> std::sync::MutexGuard<'_, TerminalGrid> {
        self.grid.lock().unwrap()
    }

    /// Clear the dirty flag after rendering.
    pub fn mark_rendered(&self) {
        if let Ok(mut g) = self.grid.lock() {
            g.dirty = false;
        }
    }
}

// ── Key-to-byte translation ──────────────────────────────────────────────────
//
// Translates GPUI key names + modifiers into the byte sequences that a VT
// terminal expects. This is called from the workspace input handler.

/// Translate a key event into terminal escape bytes.
///
/// Returns `Some(bytes)` if the key should be forwarded, `None` if it's a
/// modifier-only press or something we don't handle.
pub fn key_to_bytes(
    key: &str,
    key_char: Option<&str>,
    shift: bool,
    ctrl: bool,
    alt: bool,
    _cmd: bool,
) -> Option<Vec<u8>> {
    // Control characters: Ctrl+A → 0x01, Ctrl+C → 0x03, etc.
    if ctrl && !alt && !shift {
        if let Some(ch) = key.chars().next() {
            if ch.is_ascii_lowercase() {
                return Some(vec![ch as u8 - b'a' + 1]);
            }
        }
        // Special ctrl combos
        match key {
            "space" => return Some(vec![0x00]),
            "[" => return Some(vec![0x1b]),
            "\\" => return Some(vec![0x1c]),
            "]" => return Some(vec![0x1d]),
            _ => {}
        }
    }

    match key {
        "enter" => Some(vec![b'\r']),
        "tab" => {
            if shift {
                Some(b"\x1b[Z".to_vec())
            } else {
                Some(vec![b'\t'])
            }
        }
        "backspace" => Some(vec![0x7f]),
        "delete" => Some(b"\x1b[3~".to_vec()),
        "escape" => Some(vec![0x1b]),
        "up" => Some(b"\x1b[A".to_vec()),
        "down" => Some(b"\x1b[B".to_vec()),
        "right" => Some(b"\x1b[C".to_vec()),
        "left" => Some(b"\x1b[D".to_vec()),
        "home" => Some(b"\x1b[H".to_vec()),
        "end" => Some(b"\x1b[F".to_vec()),
        "pageup" => Some(b"\x1b[5~".to_vec()),
        "pagedown" => Some(b"\x1b[6~".to_vec()),
        // Function keys
        "f1" => Some(b"\x1bOP".to_vec()),
        "f2" => Some(b"\x1bOQ".to_vec()),
        "f3" => Some(b"\x1bOR".to_vec()),
        "f4" => Some(b"\x1bOS".to_vec()),
        "f5" => Some(b"\x1b[15~".to_vec()),
        "f6" => Some(b"\x1b[17~".to_vec()),
        "f7" => Some(b"\x1b[18~".to_vec()),
        "f8" => Some(b"\x1b[19~".to_vec()),
        "f9" => Some(b"\x1b[20~".to_vec()),
        "f10" => Some(b"\x1b[21~".to_vec()),
        "f11" => Some(b"\x1b[23~".to_vec()),
        "f12" => Some(b"\x1b[24~".to_vec()),
        // Modifier-only keys should not produce bytes.
        "shift" | "alt" | "control" | "capslock" | "fn" => None,
        _ => {
            // Regular printable characters: use key_char if available.
            if let Some(text) = key_char {
                let mut bytes = Vec::new();
                if alt {
                    // Alt+key sends ESC prefix.
                    for ch in text.chars() {
                        bytes.push(0x1b);
                        let mut buf = [0u8; 4];
                        let s = ch.encode_utf8(&mut buf);
                        bytes.extend_from_slice(s.as_bytes());
                    }
                } else {
                    bytes.extend_from_slice(text.as_bytes());
                }
                if bytes.is_empty() { None } else { Some(bytes) }
            } else if key.len() == 1 {
                let ch = key.chars().next().unwrap();
                if alt {
                    let mut bytes = vec![0x1b];
                    let mut buf = [0u8; 4];
                    let s = ch.encode_utf8(&mut buf);
                    bytes.extend_from_slice(s.as_bytes());
                    Some(bytes)
                } else {
                    let mut buf = [0u8; 4];
                    let s = ch.encode_utf8(&mut buf);
                    Some(s.as_bytes().to_vec())
                }
            } else {
                None
            }
        }
    }
}

/// Encode an SGR mouse event.
///
/// `button` is the numeric button code (0=left,1=middle,2=right,3=release).
/// `x`/`y` are 1-based coordinates. `release` selects 'm' (release) vs 'M' (press/motion).
pub fn encode_sgr_mouse(button: u8, x: usize, y: usize, release: bool) -> Vec<u8> {
    let op = if release { 'm' } else { 'M' };
    let s = format!("\x1b[<{};{};{}{}", button, x, y, op);
    s.into_bytes()
}
