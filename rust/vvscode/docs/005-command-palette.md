# Architecture Decisions

## ADR-005: Command palette — quick-open, go-to-line, and action runner

**Builds on:** ADR-002 (file preview / file tree), ADR-004 (module split)

---

### Context

The editor had no way to quickly open files by name, jump to a specific line, or discover and run workspace actions without a keybinding. VS Code's `Cmd+P` command palette solves all three problems with a single modal input box that changes behaviour based on a prefix character.

Three capabilities, one UI surface:

1. **File open** — fuzzy-filter files from the project directory and open one
2. **Go-to-line** — type `:48` to jump the cursor to line 48
3. **Action runner** — type `> Save File` to execute a registered workspace action

---

### The palette model

#### State

All palette state lives in a dedicated struct to keep `Workspace` fields manageable:

```rs
pub(crate) struct CommandPaletteState {
    pub open: bool,
    pub query: String,
    pub selected_index: usize,
    pub file_list: Vec<Arc<str>>,
}
```

`file_list` is rebuilt from the file tree every time the palette opens. This is cheap — each entry is an `Arc::clone` of the `FsNode`'s `rel_path`, so it's a ref-count bump rather than a deep string copy. It avoids stale entries if files were created or deleted since the last open.

The struct lives on `Workspace` as `pub(crate) command_palette: CommandPaletteState`.

#### Mode detection

The mode is not stored — it's derived from the query prefix on every access:

```rs
pub fn mode(&self) -> PaletteMode {
    if self.query.starts_with(':') {
        PaletteMode::GoToLine
    } else if self.query.starts_with('>') {
        PaletteMode::ActionRunner
    } else {
        PaletteMode::FileOpen
    }
}
```

This means the user can switch modes mid-session by editing the prefix. For example, typing `>` switches to action mode; deleting it with backspace returns to file-open mode. No explicit mode toggle is needed.

The `filter()` method strips the prefix so downstream code only sees the search text:

```rs
pub fn filter(&self) -> &str {
    match self.mode() {
        PaletteMode::GoToLine => self.query.strip_prefix(':').unwrap_or("").trim(),
        PaletteMode::ActionRunner => self.query.strip_prefix('>').unwrap_or("").trim(),
        PaletteMode::FileOpen => self.query.as_str(),
    }
}
```

---

### Input routing

The palette must intercept keyboard events before the normal editor handling. The approach: at the top of `handle_key_down` in `workspace/input.rs`, check if the palette is open and call `handle_palette_key`. If it returns `true` (consumed), return early — the editor never sees the event.

```rs
if self.command_palette.open {
    let consumed = self.handle_palette_key(
        key, keystroke.key_char.as_deref(),
        shift, cmd, ctrl, window, cx,
    );
    if consumed {
        return;
    }
}
```

Keys the palette handles:

| Key                  | Behaviour                                                                  |
| -------------------- | -------------------------------------------------------------------------- |
| **Escape**           | Close palette, discard query                                               |
| **Enter**            | Confirm selection (open file / jump to line / run action)                  |
| **Up / Down**        | Move selection in the filtered list                                        |
| **Backspace**        | Delete last character (or last word with Ctrl, or clear with Cmd)          |
| **Any printable**    | Append to query, reset selection to 0                                      |
| **Cmd/Ctrl + other** | Not consumed — falls through to normal handling (e.g. `Cmd+S` still saves) |

Modifier-only keys (`shift`, `alt`, `capslock`) and navigation keys (`tab`, `left`, `right`) are consumed but ignored, preventing them from leaking into the editor while the palette is open.

---

### The three modes

#### File open (no prefix)

Default mode. Lists all non-directory entries from the file tree, filtered by a case-insensitive substring match against the relative path.

Each item shows the filename prominently with the directory path dimmed, similar to VS Code's quick-open:

```
  main.rs              src/
  workspace.rs         src/
  input.rs             src/workspace/
```

On confirm, the selected file is opened via the existing `open_file` method, cursor visibility is ensured, and the palette closes.

On click, the clicked item is opened directly without needing Enter.

#### Go-to-line (`:` prefix)

When the query starts with `:`, the palette switches to go-to-line mode. Instead of a filterable list, it shows a single hint line with context:

- Empty filter: `Current line: 42. Type a number (1–500) to jump.`
- Valid number: `Go to line 48. Click or press Enter to confirm.`
- Out of range: `Line 999 is beyond the end of the file (500 lines).`
- Invalid: `Enter a valid line number.`

On confirm (Enter key or clicking the hint row), the cursor moves to the start of the target line (1-indexed, clamped to the file bounds), `ensure_cursor_visible` is called, and the palette closes.

#### Action runner (`>` prefix)

Lists all workspace actions defined in the `PALETTE_ACTIONS` constant, filtered by case-insensitive substring match on the label. Each action has a display label and a `PaletteActionTag` enum variant:

```rs
pub(crate) const PALETTE_ACTIONS: &[PaletteAction] = &[
    PaletteAction { label: "Toggle Left Panel",    tag: PaletteActionTag::ToggleLeftPanel },
    PaletteAction { label: "Toggle Bottom Panel",  tag: PaletteActionTag::ToggleBottomPanel },
    PaletteAction { label: "Toggle Right Panel",   tag: PaletteActionTag::ToggleRightPanel },
    PaletteAction { label: "Select All",            tag: PaletteActionTag::SelectAll },
    PaletteAction { label: "Toggle Collapse All",   tag: PaletteActionTag::ToggleCollapseAll },
    PaletteAction { label: "Save File",             tag: PaletteActionTag::SaveFile },
];
```

On confirm, the palette closes first, then `execute_palette_action` is called with the tag. This method contains a match on `PaletteActionTag` that mirrors the existing `.on_action()` handlers in the `Render` impl.

Adding a new action to the palette requires two steps:

1. Add a variant to `PaletteActionTag`
2. Add an entry to `PALETTE_ACTIONS` and a match arm in `execute_palette_action`

This is intentionally decoupled from gpui's `actions!` macro. The macro generates zero-sized action structs for the keybinding system; the palette uses its own enum because it needs display labels and filtering, which the macro types don't carry.

---

### Rendering

The palette is rendered as an absolutely-positioned overlay inside a relative container that wraps the main content area (between the title bar and status bar). This ensures it floats above the editor and panels without disrupting the flexbox layout.

A full-screen transparent **backdrop** (`div#palette-backdrop`) sits behind the palette panel. Clicking anywhere on this backdrop calls `close_command_palette` and notifies, giving the expected "click outside to dismiss" behaviour without adding a separate focus or blur mechanism. The DOM nesting is:

```
palette-wrapper          (absolute, size_full)
├── palette-backdrop     (absolute, size_full, on_click → close)
└── palette panel        (absolute, top/left positioned, shadow, border)
    ├── input box
    └── item list
```

Visual diagram:

```
┌─────────────────────────────────┐
│  Title bar                      │
├─────────────────────────────────┤
│  ┌─────(relative wrapper)─────┐ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │  ← transparent backdrop (click to close)
│  │▓▓┌──── palette ────┐▓▓▓▓▓▓│ │  ← palette panel on top
│  │▓▓│ > Toggle Left…  │▓▓▓▓▓▓│ │
│  │▓▓│   Toggle Bottom…│▓▓▓▓▓▓│ │
│  │▓▓└─────────────────┘▓▓▓▓▓▓│ │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│  └────────────────────────────┘ │
├─────────────────────────────────┤
│  Status bar                     │
└─────────────────────────────────┘
```

Layout constants:

| Constant            | Value  | Purpose                                       |
| ------------------- | ------ | --------------------------------------------- |
| `PALETTE_WIDTH`     | 480 px | Fixed width, horizontally centered            |
| `PALETTE_TOP`       | 60 px  | Distance from the top of the relative wrapper |
| `INPUT_HEIGHT`      | 34 px  | Height of the text input row                  |
| `ITEM_HEIGHT`       | 28 px  | Height of each result row                     |
| `MAX_VISIBLE_ITEMS` | 12     | Scroll window — avoids an unbounded list      |

The input row shows a blinking-cursor-style `│` character appended to the query text. When the query is empty, a placeholder hint is shown in dimmed text that varies by mode.

The item list handles scrolling: if the `selected_index` is beyond the visible window of `MAX_VISIBLE_ITEMS`, the scroll start adjusts so the selected item is always visible.

---

### Keybinding

Two keybindings, two actions:

| Shortcut      | Action                 | Behaviour                                                      |
| ------------- | ---------------------- | -------------------------------------------------------------- |
| `Cmd+P`       | `ToggleCommandPalette` | Opens palette in file-open mode (or closes it if already open) |
| `Cmd+Shift+P` | `OpenActionPalette`    | Opens palette directly in action-runner mode (`> ` pre-filled) |

```rs
actions!(workspace, [ ..., ToggleCommandPalette, OpenActionPalette ]);

// in main.rs:
KeyBinding::new("cmd-p", ToggleCommandPalette, Some("Workspace")),
KeyBinding::new("cmd-shift-p", OpenActionPalette, Some("Workspace")),
```

`OpenActionPalette` calls `open_command_palette()` (which rebuilds the file list and resets state) and then sets the query to `"> "`. Because mode is derived from the prefix, this is enough — no separate "action mode" flag is needed.

Pressing `Cmd+P` when the palette is already open closes it (toggle behaviour). `Cmd+Shift+P` always opens in action mode regardless of current state.

---

### Module placement

Following ADR-004's module split pattern, the command palette lives in its own file:

```
src/workspace/command_palette.rs   ← state, mode detection, filtering,
                                     input handling, action dispatch,
                                     rendering
```

It's declared as `pub mod command_palette` in `workspace.rs` because `CommandPaletteState` appears in the `Workspace` struct's field types (same reasoning as `scrollbar` and `file_tree`).

The file is self-contained: it defines the state struct, the mode enum, the action registry, the input handler, and the render method. This avoids scattering palette logic across `input.rs`, `render_chrome.rs`, and `workspace.rs`.

---

### Selection clamping and empty-state handling

The initial implementation panicked when the filtered result list was empty — for example, typing a query that matched no files. The root cause was a stale `selected_index` surviving a filter change.

#### The bug

1. User opens the palette. `selected_index = 0`, file list has 20 entries.
2. User presses Down a few times. `selected_index = 3`.
3. User types characters that narrow the filter to zero matches. `selected_index` stays at `3`.
4. The render path computes scroll window arithmetic:

```rs
let visible_count = files.len().min(MAX_VISIBLE_ITEMS); // 0
let scroll_start = if selected_index >= visible_count {  // 3 >= 0 → true
    selected_index - visible_count + 1                   // 3 - 0 + 1 = 4
} else { 0 };
let scroll_end = (scroll_start + MAX_VISIBLE_ITEMS).min(files.len()); // min(16, 0) = 0
// files[4..0] → panic: slice index starts at 4 but ends at 0
```

#### The fix — three layers of defence

**Layer 1: `clamp_palette_selection()`** — called on every keystroke that changes the query (typing, backspace, clear) and before confirm. Ensures `selected_index` is always within `0..count`, or `0` when count is zero:

```rs
pub(crate) fn clamp_palette_selection(&mut self) {
    let count = self.palette_item_count();
    if count == 0 {
        self.command_palette.selected_index = 0;
    } else if self.command_palette.selected_index >= count {
        self.command_palette.selected_index = count - 1;
    }
}
```

**Layer 2: `clamped_index` in render** — the render function computes a locally clamped index before any scroll math. Even if `selected_index` is stale for one frame (e.g. a race between input and render), the arithmetic cannot underflow:

```rs
let clamped_index = {
    let count = /* filtered count for current mode */;
    if count == 0 { 0 } else { self.command_palette.selected_index.min(count - 1) }
};
```

**Layer 3: Empty-state rows** — when the filtered list is empty, a hint row ("No matching files" / "No matching actions") is rendered instead of iterating an empty slice. The height calculation accounts for this by returning `1` for the hint row:

```rs
let item_count = match mode {
    PaletteMode::FileOpen => {
        let n = self.palette_filtered_files().len();
        if n == 0 { 1 } else { n.min(MAX_VISIBLE_ITEMS) }
    }
    // ...
};
```

The three layers are intentionally redundant. Layer 1 is the primary fix — it keeps `selected_index` valid at all times. Layer 2 is a safety net for the render path. Layer 3 ensures the UI never shows an empty void where results should be.

---

### Why `&'static str` for action labels

`PaletteAction.label` is `&'static str` because the action list is a compile-time constant (`const PALETTE_ACTIONS: &[PaletteAction]`). The string literals live in the binary's read-only data segment for the entire process lifetime — that's exactly what `'static` means. Using `String` would heap-allocate at startup for no reason, and plain `&str` would require a lifetime parameter on `PaletteAction` that would propagate to every function returning or storing one.

### Why the palette has its own action registry

gpui's `actions!` macro generates zero-sized unit structs (`struct ToggleLeftPanel;`) for the keybinding dispatch system. These types carry no metadata — no display label, no description, no category. The palette needs human-readable names for filtering and display, so it defines its own `PaletteAction` struct with a `label` and a `PaletteActionTag` enum.

`execute_palette_action` is the bridge: it matches on `PaletteActionTag` and runs the same logic as the corresponding `.on_action()` handlers in the `Render` impl. Adding a new action to the palette requires:

1. A variant in `PaletteActionTag`
2. An entry in `PALETTE_ACTIONS`
3. A match arm in `execute_palette_action`

This is intentional duplication — the alternative (making gpui action structs carry labels) would require forking the framework. The palette registry is the single source of truth for "what can the user discover and run by name."

---

### What we don't do (yet)

- **True fuzzy matching** — currently uses case-insensitive substring. A proper fuzzy scorer (like fzf's algorithm) would rank `wri` → `workspace/render_editor.rs` higher than `workspace/scrollbar.rs`, but substring matching is good enough for small-to-medium projects.
- **Keyboard shortcut hints** — VS Code shows `Cmd+B` next to "Toggle Left Panel" in the palette. We could add a `shortcut: Option<&'static str>` field to `PaletteAction`.
- **Recently opened files** — sorting file results by recency would improve the default ordering. Requires tracking open history.
- **`:` inside file-open mode** — VS Code lets you type `foo.rs:42` to open a file and jump to a line in one go. Our modes are mutually exclusive.
- ~~**Mouse interaction for go-to-line**~~ — _done_. The hint row is now clickable and navigates to EOF when line out of range. Hover highlight and pointer cursor indicate interactivity.
- ~~**Backdrop / click-outside-to-close**~~ — _done_. A full-screen transparent `div#palette-backdrop` sits behind the palette panel. Clicking it calls `close_command_palette`, matching the expected dismiss behaviour.

---

### File tree after this change

```text
src/
├── main.rs                      ← MODIFIED: cmd-p + cmd-shift-p keybindings
├── editor.rs
├── editor/
│   ├── editing.rs
│   ├── movement.rs
│   ├── scrolling.rs
│   └── selection.rs
├── workspace.rs                 ← MODIFIED: actions!, CommandPaletteState field, overlay wrapper
└── workspace/
    ├── command_palette.rs       ← NEW: state, filtering, input, rendering
    ├── file_tree.rs
    ├── input.rs                 ← MODIFIED: palette intercept at top of handle_key_down
    ├── render_chrome.rs
    ├── render_editor.rs
    ├── render_panels.rs
    └── scrollbar.rs
```
