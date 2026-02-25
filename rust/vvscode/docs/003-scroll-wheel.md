# Architecture Decisions

## ADR-003: Scroll wheel and touchpad scrolling

**Builds on:** ADR-002 (autoscroll), which established `scroll_offset` and `h_scroll_offset` on `Editor`

---

### Context

ADR-002 introduced autoscrolling — the viewport follows the cursor when you type or move with arrow keys. But there was no way to scroll the viewport independently of the cursor. If you wanted to look at code 200 lines above the cursor, you had to move the cursor there.

Every real editor supports two kinds of scrolling input:

1. **Mouse wheel** — discrete steps, typically ±3 lines per click
2. **Touchpad** — pixel-precise continuous deltas from two-finger swipe gestures

GPUI provides both through a single event type (`ScrollWheelEvent`) with a discriminated delta (`ScrollDelta::Lines` vs `ScrollDelta::Pixels`).

---

### The implementation

#### Event wiring

A single handler is attached to the root div in `render()`:

```rs
.on_key_down(cx.listener(Self::handle_key_down))
.on_scroll_wheel(cx.listener(Self::handle_scroll_wheel))
```

This is on the outermost div that covers the entire window, so scroll events are captured regardless of where the pointer is. GPUI dispatches `ScrollWheelEvent` to the element under the pointer, and since the root div fills the window, it catches everything.

#### The handler

```rs
fn handle_scroll_wheel(
    &mut self,
    ev: &ScrollWheelEvent,
    window: &mut Window,
    cx: &mut Context<Self>,
) {
    let total_lines = self.editor.len_lines();
    let visible_lines = self.compute_visible_lines(window);

    let (delta_x, delta_y): (f32, f32) = match ev.delta {
        ScrollDelta::Pixels(point) => {
            let dy: f32 = point.y.into();
            let dx: f32 = point.x.into();
            (-dx / CHAR_WIDTH, -dy / LINE_HEIGHT)
        }
        ScrollDelta::Lines(point) => {
            (-point.x * SCROLL_SENSITIVITY, -point.y * SCROLL_SENSITIVITY)
        }
    };

    // Vertical
    if delta_y.abs() > 0.01 {
        let max_offset = total_lines.saturating_sub(visible_lines);
        let new = (self.editor.scroll_offset as f32 + delta_y)
            .round()
            .clamp(0.0, max_offset as f32);
        self.editor.scroll_offset = new as usize;
    }

    // Horizontal
    if delta_x.abs() > 0.01 {
        let new = (self.editor.h_scroll_offset as f32 + delta_x)
            .round()
            .max(0.0);
        self.editor.h_scroll_offset = new as usize;
    }

    cx.notify();
}
```

---

### Delta conversion

GPUI's `ScrollDelta` has two variants:

| Variant                  | Source           | Units                          | Conversion                              |
| ------------------------ | ---------------- | ------------------------------ | --------------------------------------- |
| `ScrollDelta::Pixels`   | Touchpad         | Exact pixel displacement       | Divide by `LINE_HEIGHT` / `CHAR_WIDTH`  |
| `ScrollDelta::Lines`    | Mouse wheel      | Line counts (typically ±1–3)   | Multiply by `SCROLL_SENSITIVITY`        |

#### Why negate the deltas

GPUI (and the underlying platform) reports scroll deltas in "content movement" direction:

- Swipe up on touchpad → positive Y delta → content should move down → viewport scrolls up
- Swipe down on touchpad → negative Y delta → content should move up → viewport scrolls down

Our `scroll_offset` is a line index — increasing it scrolls the viewport down (shows later lines). So we negate: `-dy / LINE_HEIGHT`. A negative Y delta (swipe down) becomes a positive change to `scroll_offset`, scrolling the viewport down. This matches natural scrolling on macOS.

The same logic applies to horizontal: `-dx / CHAR_WIDTH`. A leftward swipe (negative X delta) increases `h_scroll_offset`, scrolling the text left (showing later columns).

#### Pixel to line conversion

For touchpad events, the raw delta is in pixels. Dividing by `LINE_HEIGHT` (22.0) converts to fractional line counts. A small touchpad gesture might produce deltas of 5–10 pixels, which is 0.2–0.5 lines. The `.round()` before assignment to `scroll_offset` means:

- Small gestures (< 0.5 lines) accumulate and eventually round to 1
- Larger gestures snap to the nearest integer line

This gives a discrete, line-by-line scrolling feel even with continuous touchpad input. It's simpler than true pixel-smooth scrolling (which would require a fractional scroll offset and sub-line rendering) but responsive enough.

#### `Pixels` type conversion

GPUI's `Pixels` struct has a private inner `f32`. You can't access `.0` directly. Instead, use the `From<Pixels> for f32` implementation:

```rs
let dy: f32 = point.y.into();
let dx: f32 = point.x.into();
```

This is the idiomatic way to extract the raw float from GPUI geometry types.

---

### `SCROLL_SENSITIVITY`

```rs
const SCROLL_SENSITIVITY: f32 = 1.0;
```

A multiplier for `ScrollDelta::Lines` (mouse wheel) events. At `1.0`, a single mouse wheel click scrolls the number of lines the OS reports (typically 3). Increase to scroll faster, decrease for finer control. Does not affect touchpad scrolling — those pixel deltas are already proportional to gesture speed.

---

### Clamping

#### Vertical

```rs
let max_offset = total_lines.saturating_sub(visible_lines);
let new = (self.editor.scroll_offset as f32 + delta_y)
    .round()
    .clamp(0.0, max_offset as f32);
```

- **Floor:** can't scroll above line 0
- **Ceiling:** `total_lines - visible_lines` — the last line of the document appears at the bottom of the viewport. You can't scroll past the end.

If the document is shorter than the viewport (`total_lines < visible_lines`), `saturating_sub` returns 0, so `max_offset` is 0 and scrolling is locked.

#### Horizontal

```rs
let new = (self.editor.h_scroll_offset as f32 + delta_x)
    .round()
    .max(0.0);
```

- **Floor:** can't scroll left of column 0
- **No ceiling:** unlike vertical, there's no maximum. You can scroll past the longest line into empty space. This matches VS Code behavior — the viewport doesn't snap back when you scroll right past line endings.

---

### Dead zone

```rs
if delta_y.abs() > 0.01 { ... }
if delta_x.abs() > 0.01 { ... }
```

Tiny deltas (< 0.01 lines/cols) are ignored. This prevents jitter from touchpad noise and avoids unnecessary `round()` → offset update → `cx.notify()` → re-render cycles when the delta would round to zero anyway.

---

### Scroll wheel vs autoscroll: how they interact

| Mechanism      | Moves viewport? | Moves cursor? | Keeps cursor visible? |
| -------------- | --------------- | ------------- | --------------------- |
| Autoscroll     | Yes             | No (cursor already moved) | Yes — that's its purpose |
| Scroll wheel   | Yes             | No            | No                    |

Scroll wheel scrolling does **not** call `ensure_cursor_visible`. This means you can scroll the cursor off-screen. The cursor stays where it was — it's just not visible. The next keystroke or cursor movement will trigger `ensure_cursor_visible` again, snapping the viewport back to the cursor.

This is standard editor behavior. It lets you peek at distant code without losing your editing position.

---

### Where `scroll_offset` and `h_scroll_offset` are modified

After this change, there are three sources of scroll offset mutation:

| Source                       | Vertical | Horizontal | Mechanism                              |
| ---------------------------- | -------- | ---------- | -------------------------------------- |
| `ensure_cursor_visible`      | ✓        | ✓          | Adjusts to keep cursor in viewport     |
| `handle_scroll_wheel`        | ✓        | ✓          | Direct manipulation from user gesture  |
| `Editor::load_text`          | ✓        | ✓          | Resets to 0 when loading a new file    |

There is no conflict between autoscroll and scroll wheel — they both write to the same fields. If you scroll the cursor off-screen and then type, `ensure_cursor_visible` overwrites the scroll offset to bring the cursor back. If the cursor is visible and you scroll, `handle_scroll_wheel` overwrites the offset. Last write wins, and both are triggered by user actions, so the behavior is always what you'd expect.

---

### What we don't do (yet)

1. **Smooth (sub-line) scrolling.** Touchpad pixel deltas are converted to integer line offsets via `.round()`. True smooth scrolling would require a fractional `scroll_offset: f32` and rendering partial lines at the top of the viewport. This is a significant change to the rendering model.
2. **Scroll momentum / inertia.** macOS provides momentum events after a touchpad swipe (the `TouchPhase` field on `ScrollWheelEvent`). We don't distinguish between direct and momentum phases — they all scroll equally. To add inertia damping or cancellation on touch, we'd check `ev.touch_phase`.
3. **Scroll bars.** No visual indicator of scroll position. Would need `scroll_offset / total_lines` for vertical thumb position and some max-column computation for horizontal.
4. **Editor-area-only scrolling.** The `on_scroll_wheel` handler is on the root div, so scrolling works even when the pointer is over the side panels or status bar. A more refined approach would attach the handler only to the editor area and potentially add separate scroll behavior for the file explorer.
