# Architecture Decisions

## ADR-002: Autoscrolling, horizontal scroll, and file preview

**Builds on:** ADR-001 (char offset as source of truth), which established `scroll_offset` as a field on `Editor`

---

### Context

The editor originally rendered a fixed window of 40 lines starting from `scroll_offset`, but nothing ever updated `scroll_offset`. If you typed past line 40, the cursor moved into invisible territory — the viewport stayed pinned to the top. There was also no horizontal scrolling at all: lines longer than the visible width were clipped by `overflow_hidden`, and the cursor could disappear off the right edge.

The left panel had a static file explorer with entries from current directory.

Three problems, one pass:

1. **Vertical autoscroll** — viewport follows the cursor when it moves beyond visible lines
2. **Horizontal autoscroll** — viewport follows the cursor when it moves beyond visible columns
3. **File preview** — clicking a file in the explorer loads it into the editor

---

### The scrolling model

#### Two offsets on `Editor`

```rs
pub struct Editor {
    // ...
    pub scroll_offset: usize,    // first visible line index
    pub h_scroll_offset: usize,  // first visible column index
}
```

Both are in logical units (line indices, char column indices), not pixels. The renderer converts them to visual offsets.

#### `ensure_cursor_visible`

A single method adjusts both offsets so the cursor stays in the viewport:

```rs
pub fn ensure_cursor_visible(&mut self, visible_lines: usize, visible_cols: usize) {
    let row = self.cursor_row();
    let col = self.cursor_col();

    // Vertical: keep cursor row inside [scroll_offset, scroll_offset + visible_lines)
    if row < self.scroll_offset {
        self.scroll_offset = row;
    } else if row >= self.scroll_offset + visible_lines {
        self.scroll_offset = row.saturating_sub(visible_lines - 1);
    }

    // Horizontal: keep cursor col inside [h_scroll_offset, h_scroll_offset + visible_cols)
    let h_margin = 5;
    if col < self.h_scroll_offset {
        self.h_scroll_offset = col.saturating_sub(h_margin);
    } else if col >= self.h_scroll_offset + visible_cols {
        self.h_scroll_offset = col.saturating_sub(visible_cols - 1) + h_margin;
    }
}
```

Key details:

- **Called after every operation that moves the cursor.** This includes keystrokes (`handle_key_down`), `SelectAll`, and `on_click`. It is NOT called inside `Editor` movement methods themselves — the workspace layer calls it after the operation completes, passing the viewport dimensions.
- **Vertical scroll is exact.** If the cursor is above the viewport, `scroll_offset` snaps to the cursor row. If below, it shifts just enough to put the cursor on the last visible line.
- **Horizontal scroll has a margin (`h_margin = 5`).** When the cursor crosses the right edge, the viewport shifts so there are ~5 extra columns visible past the cursor. This prevents the cursor from sitting flush against the edge, which makes it hard to read surrounding context.
- **Scrolling up/left snaps with a smaller margin** (`saturating_sub(h_margin)`) so you see a few columns before the cursor when scrolling back.

#### Layout constants

All layout dimensions live as constants at the top of `workspace.rs`:

```rs
const TITLE_BAR_H: f32 = 36.0;
const STATUS_BAR_H: f32 = 24.0;
const BOTTOM_PANEL_H: f32 = 180.0;
const LINE_HEIGHT: f32 = 22.0;  // Monaco text_sm — approximation
const LEFT_PANEL_W: f32 = 220.0;
const RIGHT_PANEL_W: f32 = 200.0;
const GUTTER_W: f32 = 50.0;
const TEXT_PAD_LEFT: f32 = 4.0;
const CHAR_WIDTH: f32 = 8.41;   // Monaco text_sm — approximation
```

These are **hardcoded values, not runtime measurements.** Each constant is used in both rendering (e.g. `.w(px(LEFT_PANEL_W))`) and viewport computation (e.g. subtracted from window width in `compute_visible_cols`), so at least they're defined once and stay in sync with each other.

**What's actually dynamic at runtime:**

- Window dimensions — read from `window.viewport_size()` each time
- Panel toggle state — `left_panel_visible`, `right_panel_visible`, `bottom_panel_visible`

**What needs a manual update if you change it:**

| Constant                                        | When to update                                        |
| ----------------------------------------------- | ----------------------------------------------------- |
| `TITLE_BAR_H`, `STATUS_BAR_H`, `BOTTOM_PANEL_H` | You resize the title bar, status bar, or bottom panel |
| `LEFT_PANEL_W`, `RIGHT_PANEL_W`                 | You change a side panel's width                       |
| `GUTTER_W`, `TEXT_PAD_LEFT`                     | You change the line number gutter or text padding     |
| `LINE_HEIGHT`                                   | You change font family, font size, or line spacing    |
| `CHAR_WIDTH`                                    | You change font family or font size                   |

The first seven are exact — they drive both the `.w()`/`.h()` calls and the arithmetic, so they can't drift. The last two (`LINE_HEIGHT`, `CHAR_WIDTH`) are approximations of what the font renderer actually produces. Monaco at `text_sm` gives roughly 22px line height and 8.41px character width on macOS. These don't need to be pixel-perfect — they only control when `ensure_cursor_visible` shifts the scroll offset. If they're slightly off, the cursor just stays a few pixels further from the edge than intended.

#### `visible_lines`

Not a field on `Workspace` — computed locally at each call site from the `window` parameter:

```rs
fn compute_visible_lines(&self, window: &Window) -> usize {
    let window_h: f32 = window.viewport_size().height.into();
    let chrome = TITLE_BAR_H + STATUS_BAR_H;
    let bottom = if self.bottom_panel_visible { BOTTOM_PANEL_H } else { 0.0 };
    let available = (window_h - chrome - bottom).max(0.0);
    (available / LINE_HEIGHT).floor().max(1.0) as usize
}
```

`render_editor` receives it as a parameter since it doesn't have access to `window` itself.

On an 800px window:

- Without bottom panel: `(800 - 36 - 24) / 22 = 33` lines
- With bottom panel: `(800 - 36 - 24 - 180) / 22 = 25` lines

#### `visible_cols`

Same pattern — computed locally, not stored:

```rs
fn compute_visible_cols(&self, window: &Window) -> usize {
    let window_w: f32 = window.viewport_size().width.into();
    let left = if self.left_panel_visible { LEFT_PANEL_W } else { 0.0 };
    let right = if self.right_panel_visible { RIGHT_PANEL_W } else { 0.0 };
    let available = (window_w - left - right - GUTTER_W - TEXT_PAD_LEFT).max(0.0);
    (available / CHAR_WIDTH).floor().max(1.0) as usize
}
```

On a 1200px window:

- No panels: `(1200 - 50 - 4) / 8.41 = 136` columns
- Left panel open: `(1200 - 220 - 50 - 4) / 8.41 = 110` columns
- Both panels open: `(1200 - 220 - 200 - 50 - 4) / 8.41 = 86` columns

---

### Horizontal scroll rendering

The original renderer drew full line text with absolute-positioned overlays for the cursor and selection. Horizontal scrolling reuses this architecture by slicing the text before rendering.

#### The display text transform

For each line, before building any UI elements:

```rs
let h_off = self.editor.h_scroll_offset;

let (display_text, display_len) = if h_off < line_visual_len {
    let byte_offset = line_text
        .char_indices()
        .nth(h_off)
        .map_or(line_text.len(), |(b, _)| b);
    (line_text[byte_offset..].to_string(), line_visual_len - h_off)
} else {
    (String::new(), 0)
};
```

This slices the line string to skip the first `h_off` characters. Everything downstream — cursor position, selection bounds, invisible spacers — uses `display_text` and `display_len` instead of the original `line_text` and `line_visual_len`.

#### Column adjustment

Cursor and selection columns are shifted by `h_off`:

```rs
let display_cursor_col = cursor_col.saturating_sub(h_off);

let display_selection = selection.and_then(|(s, e)| {
    let ds = s.saturating_sub(h_off);
    let de = e.saturating_sub(h_off);
    if ds >= de { None } else { Some((ds, de)) }
});
```

If a selection starts before `h_off`, `saturating_sub` clamps `ds` to 0 — the highlight starts at the left edge. If the entire selection is before `h_off`, `ds >= de` and it returns `None` — no highlight rendered. This is correct: you shouldn't see a selection that's scrolled off-screen.

#### Why slice the text instead of using pixel offsets?

The alternative was to keep the full text and shift it left by `h_off * CHAR_WIDTH` pixels (negative margin). This has two problems:

1. **Char width estimation compounds.** `CHAR_WIDTH` is already an approximation. A 0.1px error per character means 10px drift at column 100. Slicing the text avoids per-character accumulation — the invisible spacers are measured by the font renderer, not by us.

2. **The invisible-spacer technique requires matching text.** The cursor and selection overlays use invisible text as spacers to position themselves. If the visible text and spacer text don't reference the same string range, the cursor drifts. Slicing keeps them in agreement.

#### Overflow clipping

Each line's text area has `overflow_hidden()`:

```rs
.child(
    div()
        .flex()
        .flex_1()
        .pl(px(TEXT_PAD_LEFT))
        .overflow_hidden()
        .child(text_content),
)
```

This clips text that extends beyond the right edge of the editor area.

---

### File preview

#### Architecture

Two new fields on `Workspace`:

```rs
pub struct Workspace {
    // ...
    current_file: Option<String>,  // relative path of the open file, e.g. "src/main.rs"
    project_root: String,          // absolute path, from std::env::current_dir()
}
```

And a new method on `Editor`:

```rs
pub fn load_text(&mut self, text: &str) {
    self.rope = Rope::from_str(text);
    self.cursor = 0;
    self.anchor = 0;
    self.preferred_col = None;
    self.scroll_offset = 0;
    self.h_scroll_offset = 0;
}
```

`load_text` replaces the entire buffer and resets ALL cursor/scroll state. This is intentional — when you open a new file, you want to start at the top with no selection.

#### File loading

```rs
fn open_file(&mut self, relative_path: &str) {
    let full_path = format!("{}/{}", self.project_root, relative_path);
    match std::fs::read_to_string(&full_path) {
        Ok(content) => {
            self.editor.load_text(&content);
            self.current_file = Some(relative_path.to_string());
        }
        Err(e) => {
            self.editor.load_text(&format!("Error opening {}: {}", relative_path, e));
            self.current_file = Some(relative_path.to_string());
        }
    }
}
```

Uses `std::fs::read_to_string` — synchronous, blocking. Fine for now. The project's own source files are small (< 1KB). For large files, this would need async I/O.

On error (file not found, permission denied), the error message is loaded into the editor as text. The file is still marked as `current_file` so the title bar and explorer highlight update. This is a deliberate UX choice — you see what went wrong without a separate error dialog.

#### Clickable file entries

The left panel file entries are rendered with GPUI's `on_click` handler:

```rs
let mut entry = div()
    .id(entry_id)          // required for stateful interactions
    .cursor_pointer()      // visual affordance
    // ...styling...
    .on_click(cx.listener(move |this, _: &ClickEvent, window, cx| {
        this.open_file(&path_owned);
        let visible_lines = this.compute_visible_lines(window);
        let visible_cols = this.compute_visible_cols(window);
        this.editor.ensure_cursor_visible(visible_lines, visible_cols);
        cx.notify();
    }));
```

Key implementation details:

- **`.id()` is required.** GPUI's `on_click` needs the element to be `Stateful<Div>`, not plain `Div`. Adding `.id()` makes it stateful. Without it, the code won't compile.
- **Every entry gets an `.id()`, not just clickable ones.** Directory entries and file entries must have the same type (`Stateful<Div>`) so they can be accumulated in the same container. Giving directories an id like `"dir-src"` and files `"file-src/main.rs"` ensures uniqueness and type consistency.
- **`cx.listener()` captures the file path by move.** Each closure owns its own `String` with the relative path. The `move` keyword is necessary because the closure outlives the loop iteration.
- **`cx.notify()` triggers a re-render** so the editor content, title bar, and explorer highlight all update.

#### Current file highlighting

The explorer highlights the currently open file:

```rs
let is_current = self.current_file.as_deref() == Some(path);
let entry_bg = if is_current { rgb(0x2c313a) } else { rgb(0x21252b) };
```

The active file gets a darker background (`#2c313a`) matching the hover color, so it's visually distinct even without hovering.

#### Title bar

The title bar dynamically shows the current file:

```rs
let title = match &self.current_file {
    Some(f) => format!("vvscode — {}", f),
    None => "vvscode — untitled".to_string(),
};
```

---

### Where `ensure_cursor_visible` is called

It's called in three places, always right before `cx.notify()`:

| Call site                     | Why                                          |
| ----------------------------- | -------------------------------------------- |
| `handle_key_down` (end)       | Every keystroke — typing, movement, deletion |
| `SelectAll` action handler    | Cursor moves to end of document              |
| `on_click` file entry handler | New file loaded, cursor at 0                 |

It is NOT called inside `Editor` methods. This is intentional — `Editor` is a data model that doesn't know about viewport size. The workspace layer computes `visible_lines` and `visible_cols` from the window at the call site and passes them in.

---

### What we don't do (yet)

1. ~~**Mouse wheel scrolling.** `scroll_offset` can be adjusted by mouse events, but no handler is wired up yet.~~ → Done. See **ADR-003** (scroll wheel and touchpad scrolling).
2. **Measured font metrics.** `LINE_HEIGHT` and `CHAR_WIDTH` are hardcoded approximations. They'd need to be queried from GPUI's text layout to be truly accurate, but GPUI doesn't expose that simply at the application level.
3. **Smooth scrolling.** The viewport jumps instantly. Animation would require interpolating `scroll_offset` over frames.
4. **Scroll bar.** No visual indicator of scroll position. Would need the ratio `scroll_offset / total_lines` to render a thumb.
5. **Horizontal scroll reset.** When switching files, `h_scroll_offset` resets to 0 (via `load_text`). But navigating within a file doesn't reset it when moving to a short line — the viewport stays scrolled right even if the line is shorter. This matches VS Code behavior.

---

### Summary

```text
What's actually dynamic (adapts at runtime):
  window.viewport_size() — responds to window resize
  Panel toggle state — bottom/left/right panels change available space

What's hardcoded (update the constant if you change it):
  TITLE_BAR_H, STATUS_BAR_H, BOTTOM_PANEL_H — chrome heights
  LEFT_PANEL_W, RIGHT_PANEL_W — side panel widths
  GUTTER_W, TEXT_PAD_LEFT — editor internals
  LINE_HEIGHT, CHAR_WIDTH — font metric approximations (Monaco text_sm)

Vertical autoscroll:
  scroll_offset adjusted by ensure_cursor_visible()
  visible_lines = (window_height - chrome - panels) / LINE_HEIGHT
  No struct field — computed locally at each call site

Horizontal autoscroll:
  h_scroll_offset adjusted by ensure_cursor_visible() with a 5-column margin
  visible_cols = (window_width - panels - gutter - padding) / CHAR_WIDTH
  No struct field — computed locally at each call site
  Rendering slices line text at h_scroll_offset (avoids pixel estimation drift)
  Cursor/selection columns shifted by saturating_sub(h_off)

File preview:
  project_root from std::env::current_dir()
  open_file() reads with std::fs::read_to_string, loads via Editor::load_text()
  Explorer tree built dynamically by collect_file_tree() (recursive read_dir)
  Entries are clickable (on_click + cx.listener)
  All entries get .id() for Stateful<Div> type consistency
  Current file highlighted in explorer + shown in title bar
```
