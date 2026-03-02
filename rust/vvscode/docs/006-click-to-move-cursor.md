# Architecture Decisions

## ADR-006: Click to move cursor

---

### Context

Cursor movement was keyboard-only. Pressing arrow keys, Home/End, Cmd+Arrow, and Alt+Arrow all worked correctly, but clicking anywhere in the editor area had no effect on cursor position. This is a fundamental usability gap — every real editor lets you click to place the cursor.

The fix required two things:

1. A new method on `Editor` that places the cursor at a given (row, col).
2. A mouse click handler on the editor content div that converts pixel coordinates to a (row, col) and calls that method.

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

---

### `move_to_position`

A new method on `Editor` in `editor/movement.rs`:

```rs
pub fn move_to_position(&mut self, row: usize, col: usize) {
    let max_row = self.len_lines().saturating_sub(1);
    let target_row = row.min(max_row);
    let max_col = self.line_len(target_row);
    let target_col = col.min(max_col);
    self.cursor = self.rope.line_to_char(target_row) + target_col;
    self.collapse_to_cursor();
    self.preferred_col = None;
}
```

It clamps both row and col to valid bounds before computing the char offset. This means:

- Clicking below the last line places the cursor at the last line.
- Clicking past the end of a line places the cursor at the end of that line.
- Clicking into the gutter (x_in_text < 0) gives col = 0, placing the cursor at line start.

After `move_to_position`, `anchor` equals `cursor` (selection is collapsed) and `preferred_col` is cleared. Both match the behaviour of keyboard movement without Shift held.

---

### Why clamp in `move_to_position` and not in the click handler

The click handler could clamp itself before calling the method, but clamping in `move_to_position` is cleaner for two reasons:

1. Any future caller (tests, other features) gets the same safe behaviour without duplicating the guard.
2. The method matches the contract of all the other `move_*` methods: they never put the cursor in an invalid position.

The only exception is `clamp()` on `Editor`, which is a global safety net called after keyboard operations. It's still called after a click too, for consistency — but since `move_to_position` already clamps, `clamp()` is a no-op in practice.

---

### The click handler

Added as an `on_mouse_down(MouseButton::Left, ...)` on the editor content div in `render_editor.rs`. The handler is attached at the div level, not per line-element, so one handler covers the entire text area.

```rs
.on_mouse_down(
    MouseButton::Left,
    cx.listener(move |this, ev: &MouseDownEvent, window, cx| {
        let mouse_x: f32 = ev.position.x.into();
        let mouse_y: f32 = ev.position.y.into();

        let y_in_editor = mouse_y - TITLE_BAR_H;
        if y_in_editor < 0.0 {
            return;
        }
        let row = (y_in_editor / LINE_HEIGHT).floor() as usize + click_scroll_offset;

        let x_in_text = mouse_x - click_left_w - GUTTER_W - TEXT_PAD_LEFT;
        let col = if x_in_text < 0.0 {
            0
        } else {
            (x_in_text / CHAR_WIDTH).round() as usize + click_h_scroll_offset
        };

        this.editor.move_to_position(row, col);
        this.editor.clamp();
        let visible_lines = this.compute_visible_lines(window);
        let visible_cols = this.compute_visible_cols(window);
        this.editor.ensure_cursor_visible(visible_lines, visible_cols);
        cx.notify();
    }),
)
```

Three values that come from the outer `render_editor` scope are captured by the closure:

| Captured variable       | What it is                             | Why captured and not read from `this` |
| ----------------------- | -------------------------------------- | ------------------------------------- |
| `click_scroll_offset`   | `editor.scroll_offset` at render time  | Closures can't borrow `this` twice; the value is stable within a frame |
| `click_h_scroll_offset` | `editor.h_scroll_offset` at render time | Same reason                           |
| `click_left_w`          | Left panel width in pixels at render time | Depends on `left_panel_visible`, already computed in render |

This follows the same pattern used by the scrollbar `on_mouse_down` closures in the same file.

---

### `floor` for row, `round` for column

Row uses `floor`: clicking anywhere within a line's vertical band should land on that line, regardless of whether you're at the top or bottom of the line's pixel height. Floor gives you the line index, not the gap between lines.

Column uses `round`: clicking at the left edge of a character should place the cursor before it, clicking at the right edge should place it after. Rounding at the half-character boundary is the standard convention and matches how all mainstream editors behave — it feels like you're clicking "between" characters rather than "on" them.

---

### Interaction with scroll state

The click handler does **not** modify scroll offsets — it calls `ensure_cursor_visible`, which will adjust offsets only if the cursor is already outside the viewport. For a click inside the visible area, the cursor always lands inside the viewport, so `ensure_cursor_visible` is a no-op and the view doesn't jump.

If `move_to_position` is ever called programmatically with a position outside the current viewport (e.g. from a "go to line" feature), `ensure_cursor_visible` will scroll the view to reveal it.

---

### Interaction with scrollbar drag

The vertical and horizontal scrollbar divs have their own `on_mouse_down` handlers. GPUI delivers mouse events to the topmost element under the cursor, so clicking on a scrollbar thumb or track fires the scrollbar handler, not the editor content handler. There is no conflict.

---

### What we don't do (yet)

- **Click and drag to select.** Holding the mouse button and dragging should extend a selection. This would require handling `on_mouse_move` while the button is held (similar to the scrollbar drag pattern) and calling `move_to_position` with `extend: true`. Not implemented yet.
- **Double-click to select a word.** Standard editor behaviour. Requires detecting a double-click event and calling `move_word_left` + `move_word_right` to extend selection to word boundaries.
- **Shift-click to extend selection.** Clicking while Shift is held should move the cursor while keeping the anchor, extending the selection. `MouseDownEvent` exposes `modifiers.shift`, so this would be a small addition to the existing handler.
- **Click in the gutter.** Currently clicking in the gutter (x < `GUTTER_W`) places the cursor at column 0. In real editors, clicking the gutter selects the whole line or toggles a breakpoint. Not implemented.
