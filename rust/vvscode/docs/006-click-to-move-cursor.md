# Architecture Decisions

## ADR-006: Mouse interaction — click, shift-click, double-click, gutter click, and drag-to-select

---

### Context

Cursor movement was keyboard-only. Pressing arrow keys, Home/End, Cmd+Arrow, and Alt+Arrow all worked correctly, but clicking anywhere in the editor area had no effect on cursor position. This is a fundamental usability gap — every real editor supports the full set of mouse interactions:

1. **Plain click** — place the cursor at the clicked position.
2. **Shift-click** — extend the selection from the current anchor to the clicked position.
3. **Double-click** — select the word under the cursor.
4. **Click in the gutter** — select the entire line.
5. **Click and drag** — start a selection and extend it as the mouse moves.

All five are implemented in this change.

---

### The coordinate conversion problem

The editor is a div that occupies the window minus the title bar, status bar, and any visible panels. When the user clicks somewhere in that div, GPUI delivers a `MouseDownEvent` with an `(x, y)` position in **window coordinates** — the origin is the top-left corner of the window, not the top-left corner of the editor content area.

To convert that to a (row, col), you need to account for everything between the window origin and the character grid:

```text
window (0, 0)
  ↓  TITLE_BAR_H (36px)
editor top edge
  ↓  y_in_editor = mouse_y - TITLE_BAR_H
  ↓  row = floor(y_in_editor / LINE_HEIGHT) + scroll_offset
line row

window (0, 0)
  ↓  left panel width (220px, if visible)
  ↓  GUTTER_W (50px)
  ↓  TEXT_PAD_LEFT (4px)
text origin on this line
  ↓  x_in_text = mouse_x - left_w - GUTTER_W - TEXT_PAD_LEFT
  ↓  col = round(x_in_text / CHAR_WIDTH) + h_scroll_offset
character column
```

All of these constants already existed in `workspace.rs` and were already used by `render_editor.rs` for layout — they just hadn't been used in the reverse direction (pixels → grid) before.

This same conversion is used in two places:

1. The `on_mouse_down` handler in `render_editor.rs` (for all click types).
2. The `on_mouse_move` handler in `workspace.rs` (for drag-to-select).

---

### `floor` for row, `round` for column

Row uses `floor`: clicking anywhere within a line's vertical band should land on that line, regardless of whether you're at the top or bottom of the line's pixel height. Floor gives you the line index, not the gap between lines.

Column uses `round`: clicking at the left edge of a character should place the cursor before it, clicking at the right edge should place it after. Rounding at the half-character boundary is the standard convention and matches how all mainstream editors behave — it feels like you're clicking "between" characters rather than "on" them.

---

### New methods on `Editor`

Three new methods in `editor/movement.rs`. All follow the same clamping pattern as the existing `move_*` methods — they never place the cursor at an invalid position.

#### `move_to_position`

```rs
pub fn move_to_position(&mut self, row: usize, col: usize, extend: bool) {
    let max_row = self.len_lines().saturating_sub(1);
    let target_row = row.min(max_row);
    let max_col = self.line_len(target_row);
    let target_col = col.min(max_col);
    self.cursor = self.rope.line_to_char(target_row) + target_col;
    if !extend {
        self.collapse_to_cursor();
    }
    self.preferred_col = None;
}
```

The `extend` parameter follows the same convention as every other `move_*` method: when `true`, the anchor stays in place and the selection grows. When `false`, selection collapses. This single parameter enables both plain click (`extend: false`) and shift-click/drag (`extend: true`).

Clamping happens inside the method rather than in the caller:

- Clicking below the last line places the cursor at the last line.
- Clicking past the end of a line places the cursor at the end of that line.
- Any future caller (go-to-line, tests) gets safe behaviour without duplicating the guard.

#### `select_line`

```rs
pub fn select_line(&mut self, row: usize) {
    let max_row = self.len_lines().saturating_sub(1);
    let target_row = row.min(max_row);
    self.anchor = self.rope.line_to_char(target_row);
    if target_row < max_row {
        self.cursor = self.rope.line_to_char(target_row + 1);
    } else {
        self.cursor = self.rope.len_chars();
    }
    self.preferred_col = None;
}
```

Sets anchor at the start of the line and cursor at the start of the next line — or end-of-document for the last line. This selects the line including its trailing newline, which matches VS Code's gutter click behaviour (pasting after a line selection inserts a whole line).

#### `select_word_at`

```rs
pub fn select_word_at(&mut self, row: usize, col: usize) {
    self.move_to_position(row, col, false);

    if self.cursor < self.rope.len_chars() && self.char_at(self.cursor).is_alphanumeric() {
        let mut start = self.cursor;
        while start > 0 && self.char_at(start - 1).is_alphanumeric() {
            start -= 1;
        }
        let max = self.rope.len_chars();
        let mut end = self.cursor;
        while end < max && self.char_at(end).is_alphanumeric() {
            end += 1;
        }
        self.anchor = start;
        self.cursor = end;
    } else if self.cursor > 0 && self.char_at(self.cursor - 1).is_alphanumeric() {
        let mut start = self.cursor - 1;
        while start > 0 && self.char_at(start - 1).is_alphanumeric() {
            start -= 1;
        }
        self.anchor = start;
    }
    self.preferred_col = None;
}
```

First places the cursor at the target position, then expands outward to word boundaries. Word characters are defined by `is_alphanumeric()` — the same predicate used by `prev_word_boundary` and `next_word_boundary` in `editing.rs`, so double-click word selection is consistent with Opt+Arrow word movement.

Two cases:

1. **Cursor lands on an alphanumeric character.** Expand both directions to the word boundary. Anchor goes to the start, cursor to the end.
2. **Cursor lands just past a word** (e.g. on a space, but the preceding char is alphanumeric — this can happen with `round()` placing the cursor at the right edge of the last character). Expand backward only. The cursor is already at the word end.

If the cursor is on whitespace or punctuation with no adjacent word character, nothing extra happens — the cursor just lands there. This matches VS Code's behaviour: double-clicking a space selects just the space (or rather, doesn't visibly select a word).

---

### The click handler dispatch

The `on_mouse_down` handler on the editor content div inspects the event to decide which action to take:

```rs
.on_mouse_down(
    MouseButton::Left,
    cx.listener(move |this, ev: &MouseDownEvent, window, cx| {
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
            this.editor.select_line(row);
        } else if ev.click_count == 2 {
            this.editor.select_word_at(row, col);
        } else if shift {
            this.editor.move_to_position(row, col, true);
        } else {
            this.editor.move_to_position(row, col, false);
            this.mouse_drag_selecting = true;
        }

        this.editor.clamp();
        let visible_lines = this.compute_visible_lines(window);
        let visible_cols = this.compute_visible_cols(window);
        this.editor.ensure_cursor_visible(visible_lines, visible_cols);
        cx.notify();
    }),
)
```

The priority order matters:

1. **Gutter** is checked first. A gutter click is a whole-line selection regardless of modifiers or click count.
2. **Double-click** is checked next. `click_count == 2` fires on the second rapid press. The first press already placed the cursor (as a plain click), so the second press replaces that with a word selection.
3. **Shift-click** extends from the existing anchor. The anchor was set by whatever the previous action was (plain click, word select, keyboard movement).
4. **Plain click** is the default. It places the cursor and begins tracking a potential drag.

#### Gutter hit detection

```rs
let in_gutter = x_in_text < 0.0
    && (mouse_x - click_left_w) >= 0.0
    && (mouse_x - click_left_w) < GUTTER_W;
```

The click is in the gutter when:

- `x_in_text < 0.0` — the click is to the left of the text area.
- `mouse_x - click_left_w >= 0.0` — the click is to the right of the left panel (if visible).
- `mouse_x - click_left_w < GUTTER_W` — the click is within the gutter's pixel width.

This correctly distinguishes a gutter click from a click inside the left panel or inside the text padding area.

#### Why `click_count` and not a custom timer

GPUI's `MouseDownEvent` provides `click_count: usize`, which the platform tracks automatically with the correct system double-click interval. Using it is both simpler and more correct than implementing a custom timer — the threshold matches the user's OS settings.

---

### Drag-to-select

#### State tracking

A new field on `Workspace`:

```rs
pub(crate) mouse_drag_selecting: bool,
```

Set to `true` on a plain click in the text area. Set to `false` on `MouseUpEvent` or when `MouseMoveEvent` reports no button pressed (safety catch for releases outside the window).

Only plain clicks initiate drag tracking. Gutter clicks, double-clicks, and shift-clicks do **not** set `mouse_drag_selecting = true` because:

- **Gutter:** Line selection is complete on mouse-down. Dragging after a gutter click isn't expected to extend the line selection (that would require a different interaction model — extending by whole lines).
- **Double-click:** Word selection is complete on mouse-down. Dragging after a double-click doesn't extend in mainstream editors either (some editors extend by whole words, but that's a different feature).
- **Shift-click:** The selection extension is complete on mouse-down. The user already achieved their goal.

#### The move handler

The drag-to-select logic lives in the root div's existing `on_mouse_move` handler, alongside the scrollbar drag handler:

```rs
// ── Click-drag to select ─────────────────────────────────────
if this.mouse_drag_selecting {
    if ev.pressed_button != Some(MouseButton::Left) {
        this.mouse_drag_selecting = false;
        return;
    }
    let mouse_x: f32 = ev.position.x.into();
    let mouse_y: f32 = ev.position.y.into();

    let left_w = if this.left_panel_visible { LEFT_PANEL_W } else { 0.0 };

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
    this.editor.ensure_cursor_visible(visible_lines, visible_cols);
    cx.notify();
}
```

Key differences from the click handler:

- **Live state instead of captured values.** The click handler captures `click_scroll_offset` and `click_left_w` at render time (because it's inside a `render_editor` closure). The move handler reads `this.editor.scroll_offset`, `this.editor.h_scroll_offset`, and `this.left_panel_visible` at event time — these are the live values on `self`. This means drag-to-select handles mid-drag scroll changes correctly: if `ensure_cursor_visible` shifts the viewport because the drag reaches the edge, the next move event uses the updated scroll offset.
- **Always `extend: true`.** The anchor was set by the initial click. Every subsequent move extends the selection.
- **`y_in_editor < 0.0` maps to row 0.** Instead of returning early (as the click handler does), the drag handler clamps to the first line. This lets the user drag above the editor to select toward the top of the document.

#### Why the root div

The `on_mouse_move` is on the root div, not the editor content div. Same reason as the scrollbar drag handler: during a drag the mouse can move anywhere — outside the editor area, into the panels, into the title bar. The root div covers the entire window, so it catches all movement.

The handler checks `this.mouse_drag_selecting` first and returns immediately when `false` (the common case), so the overhead on non-drag mouse moves is negligible.

#### The up handler

```rs
.on_mouse_up(
    MouseButton::Left,
    cx.listener(|this, _ev: &MouseUpEvent, _window, _cx| {
        this.scrollbar_drag = None;
        this.mouse_drag_selecting = false;
    }),
)
```

Clears both scrollbar drag and text drag in one place. The two can never be active simultaneously (a scrollbar `on_mouse_down` doesn't set `mouse_drag_selecting`, and the editor `on_mouse_down` doesn't set `scrollbar_drag`), but clearing both unconditionally is safe and simpler than checking which one is active.

#### Safety: button release outside the window

Same pattern as the scrollbar drag (documented in ADR-003): if the user drags outside the window and releases the button there, `MouseUpEvent` never fires. When the mouse re-enters the window, `MouseMoveEvent.pressed_button` is `None`, and the handler clears `mouse_drag_selecting`.

```rs
if ev.pressed_button != Some(MouseButton::Left) {
    this.mouse_drag_selecting = false;
    return;
}
```

---

### Interaction priority between scrollbar drag and text drag

The `on_mouse_move` handler checks scrollbar drag first:

```rs
if let Some(drag) = this.scrollbar_drag {
    // handle scrollbar drag
    return;
}
if this.mouse_drag_selecting {
    // handle text drag
}
```

The `return` after the scrollbar block means the two are mutually exclusive per move event. Since `scrollbar_drag` is set by the scrollbar thumb's `on_mouse_down` (which is a separate element from the editor content div), and `mouse_drag_selecting` is set by the editor content div's `on_mouse_down`, they cannot both be active from the same click.

---

### Interaction with scroll state

The click handler does **not** modify scroll offsets — it calls `ensure_cursor_visible`, which adjusts offsets only if the cursor is outside the viewport. For a click inside the visible area, the cursor always lands inside the viewport, so `ensure_cursor_visible` is a no-op and the view doesn't jump.

For drag-to-select, `ensure_cursor_visible` is what gives you auto-scroll at the edges: dragging the mouse below the last visible line pushes the viewport down, dragging above pushes it up. The same mechanism that keeps the cursor visible during keyboard movement now serves drag-to-select for free.

---

### Interaction with scrollbar drag

The vertical and horizontal scrollbar divs have their own `on_mouse_down` handlers. GPUI delivers mouse events to the topmost element under the cursor, so clicking on a scrollbar thumb or track fires the scrollbar handler, not the editor content handler. There is no conflict.

---

### What we don't do (yet)

- **Triple-click to select a paragraph/line.** `click_count == 3` is available from GPUI but not handled. Would be a small addition to the dispatch chain.
- **Drag from gutter to extend by whole lines.** Currently, gutter clicks select one line and don't initiate drag tracking. Extending by whole lines on drag would require tracking that the drag started in the gutter and adjusting to line-aligned boundaries.
- **Drag to auto-scroll faster at larger distances.** Currently auto-scroll speed is constant (one line per move event that crosses the edge). Real editors accelerate when the mouse is further past the edge.
- **Word-granularity drag after double-click.** Some editors snap the selection to word boundaries during a drag if the initial action was a double-click. Currently drag after double-click extends by character.
