# Architecture Decisions

## ADR-008: Embedded terminal emulator — PTY, VTE parsing, and live grid rendering

### Problem

The bottom panel (`Cmd+``) toggled `bottom_panel_visible`and rendered a static`"$ ▊"`string. We wanted a real, interactive terminal — one where you can type commands, see output, run`cargo build`, use `vim`, and generally do everything you'd do in a terminal without leaving the editor.

The central question: **do we need to handle each shell command ourselves, or can we delegate to the OS?**

### Answer: delegate everything to a PTY

We don't interpret a single shell command. The architecture is:

```
  ┌──────────┐  write()   ┌─────┐  stdout  ┌───────────┐
  │ Keyboard │──────────▶│ PTY │─────────▶│ VTE Parse │
  └──────────┘            └─────┘          └─────┬─────┘
                                                 │
                                         ┌───────▼───────┐
                                         │ TerminalGrid  │
                                         │ (Arc<Mutex>)  │
                                         └───────────────┘
                                                 │
                                         ┌───────▼───────┐
                                         │  GPUI Render  │
                                         └───────────────┘
```

A **pseudo-terminal** (PTY) is an OS-level abstraction. It's a pair of file descriptors: one end (the "slave") looks like a real terminal to the child process (your shell), and the other end (the "master") is what we read from and write to. The shell runs `ls`, `cargo`, `git` — whatever it wants. It writes ANSI escape sequences to stdout, and we parse them.

This is exactly how every terminal emulator works: iTerm, Alacritty, WezTerm, the VS Code terminal, and Zed's terminal. None of them "handle" shell commands. They all:

1. Spawn a PTY
2. Shuttle bytes back and forth
3. Parse ANSI/VT escape sequences into a cell grid
4. Render the cell grid

### New dependencies

| Crate           | Version | Purpose                                                                                                                                         |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `portable-pty`  | 0.9.0   | Cross-platform PTY spawning (from the WezTerm project)                                                                                          |
| `vte`           | 0.15.0  | ANSI/VT escape sequence parser (from the Alacritty project)                                                                                     |
| `async-channel` | 2.5.0   | Bounded async channel for waking the UI from the reader thread (already in the dependency tree via `smol` → `gpui`, so zero extra compile cost) |

Both are battle-tested crates used by real terminal emulators.

### New file: `src/terminal.rs`

This is the largest new module (~1080 lines). It contains everything related to terminal emulation. Here's what's inside and why.

#### `Cell` — one character on screen

```rust
pub struct Cell {
    pub ch: char,     // the character to display
    pub fg: u32,      // foreground color (24-bit RGB)
    pub bg: u32,      // background color (24-bit RGB)
    pub bold: bool,   // bold attribute
}
```

A terminal screen is a 2D grid of these cells. This is what the renderer iterates over.

#### `TerminalGrid` — the screen buffer

The grid owns:

- `lines: Vec<Vec<Cell>>` — the visible screen (e.g. 24 rows × 80 cols)
- `scrollback: Vec<Vec<Cell>>` — history lines that scrolled off the top (max 1000)
- `cursor_row`, `cursor_col` — where the cursor is
- `sgr: SgrState` — current text attributes (color, bold) set by SGR escape sequences
- `scroll_top`, `scroll_bot` — the scroll region (set by `DECSTBM`)
- `alt_lines` — alternate screen buffer (used by programs like `vim`, `less`, `htop`)

The grid implements all the low-level operations:

| Method                                      | What it does                                           |
| ------------------------------------------- | ------------------------------------------------------ |
| `put_char(ch)`                              | Write a character at cursor position, advance cursor   |
| `linefeed()`                                | Move cursor down, scroll if at bottom of scroll region |
| `carriage_return()`                         | Move cursor to column 0                                |
| `scroll_up()` / `scroll_down()`             | Scroll the scroll region                               |
| `erase_to_eol()` / `erase_screen()` / etc.  | Clear cells                                            |
| `delete_chars(n)` / `insert_chars(n)`       | Shift characters within a line                         |
| `insert_lines(n)` / `delete_lines(n)`       | Shift lines within the scroll region                   |
| `apply_sgr(params)`                         | Parse SGR parameters and update colors/bold            |
| `enter_alt_screen()` / `leave_alt_screen()` | Switch to/from alternate buffer                        |
| `resize(cols, rows)`                        | Resize the grid, preserving content                    |

#### The `vte::Perform` trait — the parser callback

The `vte` crate is a state machine that parses raw bytes. It doesn't know what any escape sequence _means_ — it just identifies them and calls methods on a `Perform` implementor. We implement `Perform` for `TerminalGrid`:

| `Perform` method               | When it's called                         | What we do                                                                                       |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `print(c)`                     | A regular printable character arrives    | `put_char(c)`                                                                                    |
| `execute(byte)`                | A C0 control code (BS, TAB, LF, CR)      | Handle backspace, tab, newline, carriage return                                                  |
| `csi_dispatch(params, action)` | A CSI sequence like `\e[31m` or `\e[2J`  | Big match on `action` char: cursor movement, erase, SGR colors, scroll regions, alt screen, etc. |
| `esc_dispatch(byte)`           | An ESC sequence like `\e7` (save cursor) | DECSC, DECRC, RI, IND, NEL                                                                       |
| `osc_dispatch(params)`         | An OSC sequence (set window title, etc.) | Ignored for now                                                                                  |
| `hook` / `put` / `unhook`      | DCS sequences                            | Ignored for now                                                                                  |

**Key insight for understanding the code:** when you see the shell output `\e[32mhello\e[0m`, the `vte` parser breaks this into:

1. `csi_dispatch(params=[32], action='m')` → we set fg to green
2. `print('h')`, `print('e')`, `print('l')`, `print('l')`, `print('o')` → each gets a green cell
3. `csi_dispatch(params=[0], action='m')` → we reset to default colors

#### CSI sequences we handle

The most important ones:

| Sequence        | Name            | What it does                             |
| --------------- | --------------- | ---------------------------------------- |
| `\e[A`..`\e[D`  | CUU/CUD/CUF/CUB | Move cursor up/down/right/left           |
| `\e[H`          | CUP             | Move cursor to row;col                   |
| `\e[J`          | ED              | Erase in display (below, above, or all)  |
| `\e[K`          | EL              | Erase in line (to end, to start, or all) |
| `\e[m`          | SGR             | Set colors and text attributes           |
| `\e[r`          | DECSTBM         | Set scroll region (top;bottom)           |
| `\e[?1049h/l`   | Alt screen      | Enter/leave alternate screen buffer      |
| `\e[?25h/l`     | DECTCEM         | Show/hide cursor                         |
| `\e[L` / `\e[M` | IL/DL           | Insert/delete lines                      |
| `\e[P` / `\e[@` | DCH/ICH         | Delete/insert characters                 |
| `\e[S` / `\e[T` | SU/SD           | Scroll up/down                           |

#### Color support

We support three levels of color:

1. **Standard 8 colors** (SGR 30–37 / 40–47) — the classic ANSI palette
2. **Bright 8 colors** (SGR 90–97 / 100–107)
3. **256 colors** (SGR 38;5;N / 48;5;N) — includes the 6×6×6 color cube and grayscale ramp
4. **24-bit truecolor** (SGR 38;2;R;G;B / 48;2;R;G;B)

The palette uses VS Code Dark-inspired colors so the terminal blends naturally with the editor theme.

#### `Terminal` — the public handle

```rust
pub struct Terminal {
    pub grid: Arc<Mutex<TerminalGrid>>,
    writer: Box<dyn Write + Send>,
    _child: Box<dyn portable_pty::Child + Send + Sync>,
    _reader_handle: thread::JoinHandle<()>,
}
```

`Terminal::spawn(cols, rows, cwd)` returns `(Terminal, Receiver<()>)` and does the heavy lifting:

1. Opens a PTY pair via `NativePtySystem::default().openpty(size)`
2. Builds a `CommandBuilder` for the user's `$SHELL` (defaults to `/bin/zsh`)
3. Spawns the shell as a child process on the slave side of the PTY
4. Takes the writer (for sending keystrokes) and reader (for receiving output) from the master side
5. Creates a bounded(1) `async_channel` — the `Sender` goes to the reader thread, the `Receiver` is returned to the caller
6. Spawns a background thread that reads from the PTY in a loop:
   - Reads up to 4096 bytes at a time
   - Locks the grid mutex
   - Passes the entire byte slice to `vte::Parser::advance()` (vte 0.15 takes `&[u8]`, not one byte at a time)
   - Sets `grid.dirty = true`
   - Sends `()` on the channel via `try_send` (non-blocking — if the channel is full, one pending wakeup is enough)

#### `key_to_bytes()` — keyboard translation

Translates GPUI key names into the byte sequences a terminal expects:

| Key                   | Bytes sent                        |
| --------------------- | --------------------------------- |
| Regular character `a` | `0x61`                            |
| Enter                 | `\r` (0x0D)                       |
| Backspace             | `0x7F` (DEL)                      |
| Tab                   | `0x09`                            |
| Shift+Tab             | `\e[Z`                            |
| Ctrl+C                | `0x03`                            |
| Ctrl+A..Ctrl+Z        | `0x01..0x1A`                      |
| Arrow Up              | `\e[A`                            |
| Arrow Down            | `\e[B`                            |
| Delete                | `\e[3~`                           |
| Home/End              | `\e[H` / `\e[F`                   |
| Alt+key               | `\e` + key byte(s)                |
| F1..F12               | Various `\eO` and `\e[` sequences |

### Changes to existing files

#### `workspace.rs` — new fields and terminal lifecycle

New fields on `Workspace`:

```rust
pub(crate) terminal: Option<Terminal>,
pub(crate) terminal_focus_handle: FocusHandle,
pub(crate) bottom_panel_h: f32,
pub(crate) bottom_panel_drag: Option<BottomPanelDrag>,
```

**`terminal_focus_handle`** is a GPUI `FocusHandle` attached to the bottom panel via `.track_focus()`. When it holds focus, keyboard input routes to the PTY instead of the editor. This replaces the earlier `terminal_focused: bool` approach — using GPUI's native focus system is cleaner and avoids manual bookkeeping.

The workspace's own `focus_handle` and `terminal_focus_handle` are mutually exclusive: clicking the editor focuses the workspace handle, clicking the terminal panel (or toggling it open) focuses the terminal handle. The render loop only force-focuses the workspace handle if _neither_ handle is focused, so the terminal can't have focus stolen from it.

**`bottom_panel_h`** stores the current height of the bottom panel in pixels. It defaults to `BOTTOM_PANEL_DEFAULT_H` (180px) and can be changed by dragging the resize handle. Clamped between `BOTTOM_PANEL_MIN_H` (80px) and `BOTTOM_PANEL_MAX_H` (600px).

**`bottom_panel_drag`** tracks an active resize drag (`BottomPanelDrag { start_mouse_y, start_h }`). Set on mouse-down on the drag handle, read during `on_mouse_move` on the root div, cleared on mouse-up. The same pattern used for scrollbar drags.

**`ensure_terminal(window, cx)`** is called lazily the first time the bottom panel is opened. It computes the terminal dimensions from the current window size via `compute_terminal_size()` and spawns the PTY at the correct size — no more hardcoded 80×24.

#### The threading / notification problem

The PTY reader runs on a background `std::thread`. It needs to tell the UI "hey, new content arrived, please repaint." But `cx.notify()` requires a GPUI `Context`, which is not `Send` — you can't call it from a background thread.

**Failed approach 1:** Using `cx.entity().downgrade()` to get a `WeakEntity` and calling `handle.update()` from the thread. This doesn't work because `update()` needs `&mut C where C: AppContext`, and we don't have an `AppContext` on the background thread.

**Failed approach 2 (the polling hack):** Spawn a `cx.spawn()` async loop that sleeps 33ms via `gpui::Timer::after`, then checks `grid.dirty`. This works but wastes CPU polling at 30 FPS even when the terminal is idle, and adds up to 33ms latency between PTY output and screen update. It's a hack.

**Working approach: `async-channel`**

The reader thread sends `()` over a bounded(1) `async_channel`. The async loop `await`s on the receiver — it blocks with zero CPU cost when idle and wakes immediately when output arrives:

```rust
// Terminal::spawn returns (Terminal, Receiver<()>)
let result = Terminal::spawn(80, 24, Some(&cwd));
match result {
    Ok((t, rx)) => {
        self.terminal = Some(t);

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
    ...
}
```

On the reader thread side:

```rust
// bounded(1): at most one pending wakeup in the channel
let (tx, rx) = async_channel::bounded(1);

// In the reader loop:
let _ = tx.try_send(());  // non-blocking, drops if full
```

**Why bounded(1) with `try_send`?** The reader thread can produce output faster than the UI can repaint. If we used an unbounded channel, we'd queue thousands of wakeup signals for a single `cargo build`. Bounded(1) means: "there's new stuff" is a boolean, not a counter. One pending signal is enough — the UI will see all accumulated changes when it next repaints.

**Why this is better than polling:**

- Zero CPU when idle (no 30 FPS timer spinning)
- Zero latency (wakeup is immediate, not up to 33ms delayed)
- Backpressure is built in (bounded channel can't overflow)

#### `workspace/input.rs` — keyboard routing

Added a new intercept block after the command palette intercept:

```rust
if self.terminal_focus_handle.is_focused(window) && self.bottom_panel_visible {
    if cmd {
        // Let Cmd combos fall through to the action system
    } else if let Some(bytes) = key_to_bytes(key, key_char, shift, ctrl, alt, false) {
        if let Some(ref mut term) = self.terminal {
            // Snap back to live view when the user types.
            term.lock_grid().scroll_offset = 0;
            term.write_all(&bytes);
        }
        cx.notify();
        return;
    }
}
```

When the user types while scrolled up in the scrollback, `scroll_offset` is reset to 0 so the viewport snaps back to the live bottom before the keystroke is sent to the PTY.

**Important:** `Cmd+key` combos are NOT forwarded to the terminal. They fall through to the action system so `Cmd+B`, `Cmd+P`, `Cmd+S`, `Cmd+`\``etc. still work even when the terminal is focused. Only`Ctrl+key`goes to the terminal (which is correct —`Ctrl+C`should send SIGINT to the shell, not trigger a copy).

Additionally: `Cmd+V` (paste) is implemented for the terminal via the `Paste` action. When the bottom panel is focused, `Cmd+V` reads the system clipboard and writes the clipboard bytes directly to the PTY so pasted text is delivered to the running program. If the clipboard is empty, nothing is sent to the PTY.

#### Mouse reporting

The terminal supports mouse reporting modes requested by applications (e.g., `vim`, `htop`):

- **CSI ?1000h** — `ButtonEventTracking`: button press/release only
- **CSI ?1002h** — `ButtonMotionTracking`: button press/release + motion with button held
- **CSI ?1003h** — `AnyEventTracking`: all mouse motion events

Mouse events are encoded using SGR encoding (CSI `<btn;col;row M/m`) and forwarded to the PTY when:
1. The terminal panel is focused
2. The application has enabled one of the above modes
3. The event type matches the mode (e.g., motion without button only sent in `AnyEventTracking`)

The workspace tracks the last mouse position and button so mouse release events contain accurate coordinates, not generic (1,1) values.

#### `workspace/render_panels.rs` — live grid rendering

`render_bottom_panel` takes `&self` and `&mut Context<Self>`. It renders the terminal grid:

1. Lock the grid mutex
2. Iterate rows 0..rows, calling `grid.visible_line(r)` to get the correct line accounting for scrollback offset
3. For each row, group consecutive cells with the same fg/bg/bold into spans
4. Break spans at cursor boundaries so the cursor cell gets its own span
5. Only show the cursor when `grid.is_at_bottom()` (scrolled-up views hide the cursor)
6. Render cursor as inverted colors (swap fg/bg)
7. Call `term.mark_rendered()` to clear the dirty flag

The span-grouping optimization prevents creating one `div()` per character. A typical 80-column line with two color changes creates ~3 spans instead of 80 individual elements.

**Scrollback viewing:** The panel has an `on_scroll_wheel` handler (`handle_terminal_scroll`) that adjusts `grid.scroll_offset`. Scrolling up increases the offset (looking at older scrollback), scrolling down decreases it (toward live). The offset is clamped to `0..=scrollback.len()`. When the user types a key, the offset snaps back to 0 (live).

**Resizable panel:** A 4px drag handle sits at the top of the bottom panel. It shows `cursor_row_resize` on hover and highlights with the accent color (`#007acc`). Dragging follows the standard pattern: `on_mouse_down` captures `BottomPanelDrag { start_mouse_y, start_h }`, the root div's `on_mouse_move` computes `delta = start_mouse_y - current_y` (dragging up = bigger), and `on_mouse_up` clears the drag state. The height is clamped to 80–600px.

**Terminal resize is event-driven, not per-frame.** `sync_terminal_size()` is called only when something actually changes the available dimensions:

- During a panel drag (in `on_mouse_move`, only when height delta > 0.5px)
- When toggling the left or right panels (changes available width)
- When the window itself resizes (detected by comparing `last_window_size` in `render`)

This avoids locking the terminal grid mutex on every frame. The resize itself (`TerminalGrid::resize()`) preserves content correctly: when shrinking, excess top lines are pushed into scrollback and the cursor row adjusts to stay in place; when growing, lines are pulled back from scrollback (instead of adding blank lines) so previously visible content reappears.

#### `workspace/render_editor.rs` — unfocus terminal on editor click

A single line added to the editor's `on_mouse_down` handler:

```rust
this.focus_handle.focus(window);
```

Clicking the editor area moves GPUI focus back to the workspace handle, which takes it away from the terminal.

### Focus routing summary

| User action             | Focus goes to              | Keys go to |
| ----------------------- | -------------------------- | ---------- |
| `Cmd+`\`` (open panel)  | `terminal_focus_handle`    | Terminal   |
| Click terminal area     | `terminal_focus_handle`    | Terminal   |
| Click editor area       | `focus_handle` (workspace) | Editor     |
| `Cmd+`\`` (close panel) | `focus_handle` (workspace) | Editor     |

Focus is managed via two GPUI `FocusHandle`s — the workspace's main handle (for the editor) and `terminal_focus_handle` (attached to the bottom panel via `.track_focus()`). The render loop's force-focus guard only activates when _neither_ handle is focused.

### What works

- Interactive shell session (zsh/bash with prompt, command execution, output)
- Colors (16, 256, and truecolor)
- Cursor movement and positioning
- Screen clearing (`clear`, `Cmd+K` in shell)
- Programs that use alternate screen (vim, less, htop, top)
- Scroll regions (used by many TUI programs)
- Ctrl+C (sends SIGINT), Ctrl+D (sends EOF), Ctrl+Z (sends SIGTSTP)
- Tab completion (the shell handles it; we just shuttle bytes)
- Arrow keys for command history
- Bold text
- Scrollback viewing (scroll wheel to browse history, snaps back on keystroke)
- Dynamic terminal resize (grid dimensions computed from window size, synced on dimension changes)
- Resizable bottom panel (drag handle at top edge, 80–600px range)

### What doesn't work yet (future improvements)

| Feature                             | Why it's missing                                                                                                                                                                                                                                                                                        | Difficulty |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| PTY resize ioctl                    | Grid resizes correctly but the PTY itself doesn't get a SIGWINCH                                                                                                                                                                                                                                        | Medium     |
| Mouse events in terminal (DONE)     | ✅ Implemented: workspace forwards mouse events when the application requests mouse reporting (CSI ?1000h/1002h/1003h). Respects different tracking modes (button-only, button-motion, any-motion) and sends accurate coordinates on press/motion/release. Text selection/copy from terminal remains WIP | Medium     |
| Text selection / copy from terminal | No mouse selection in terminal area; requires tracking drag start/end cell, highlighting selected cells, copy on release                                                                                                                                                                                | Medium     |
| Open file from terminal             | Detect file paths under cursor (or in selection); `Cmd+Click` or a keybinding opens the file in the editor                                                                                                                                                                                              | Medium     |
| Scrollbar for terminal scrollback   | Scroll wheel works, but no visual scrollbar thumb                                                                                                                                                                                                                                                       | Low–Medium |
| Multiple terminal tabs              | Only one terminal instance                                                                                                                                                                                                                                                                              | Low–Medium |
| Italic, underline, strikethrough    | `SgrState` only tracks bold; need more attributes                                                                                                                                                                                                                                                       | Low        |
| Hyperlink detection (URLs)          | OSC 8 parsing                                                                                                                                                                                                                                                                                           | Low        |
| Terminal bell                       | Currently ignored                                                                                                                                                                                                                                                                                       | Low        |
| Window title from OSC               | Shell sets the window title via OSC 0/2; we ignore it                                                                                                                                                                                                                                                   | Low        |
| Persist panel height                | `bottom_panel_h` resets to default on restart; could save to preferences                                                                                                                                                                                                                                | Low        |

### Notes for catching up

**If you're new to terminal emulation**, here's the mental model:

1. A terminal is NOT a shell. The terminal is the _screen_ — it draws characters in a grid. The shell (zsh, bash) is the _program running inside_ the terminal. We are building the screen, not the shell.

2. The shell communicates with us through **escape sequences**. These are special byte patterns starting with `ESC` (0x1B). For example, `\e[31m` means "switch foreground to red." The `vte` crate parses these for us — we just implement the callbacks.

3. The **PTY** (pseudo-terminal) is the pipe between us and the shell. It's a kernel-level abstraction that makes the shell think it's talking to a real terminal. This is what `portable-pty` gives us.

4. **SGR** (Select Graphic Rendition) is the escape sequence family for colors and text styling. `\e[0m` = reset, `\e[1m` = bold, `\e[31m` = red, `\e[38;5;42m` = 256-color, `\e[38;2;255;128;0m` = truecolor.

5. The **alternate screen buffer** is a second screen that programs like vim use. When vim starts, it sends `\e[?1049h` (enter alt screen), does all its drawing there, and when you quit, sends `\e[?1049l` (leave alt screen) — your original terminal content reappears. This is why running vim and quitting doesn't leave vim's UI in your scrollback.

**If you're looking at the code**, the entry points are:

- `Terminal::spawn()` — creates everything, starts the reader thread, returns `(Terminal, Receiver<()>)`
- `Perform for TerminalGrid` — where bytes become cells (the VTE callback)
- `key_to_bytes()` — where keystrokes become bytes to send to the PTY
- `render_bottom_panel()` — where cells become GPUI elements
- `handle_key_down()` — where the terminal/editor focus split happens
