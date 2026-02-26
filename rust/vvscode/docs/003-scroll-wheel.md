# Architecture Decisions

## ADR-003: Scroll wheel, touchpad scrolling, file tree caching, left panel scrolling, and scrollbars

**Builds on:** ADR-002 (autoscroll), which established `scroll_offset` and `h_scroll_offset` on `Editor`

---

### Context

ADR-002 introduced autoscrolling — the viewport follows the cursor when you type or move with arrow keys. But there was no way to scroll the viewport independently of the cursor. If you wanted to look at code 200 lines above the cursor, you had to move the cursor there.

Every real editor supports two kinds of scrolling input:

1. **Mouse wheel** — discrete steps, typically ±3 lines per click
2. **Touchpad** — pixel-precise continuous deltas from two-finger swipe gestures

GPUI provides both through a single event type (`ScrollWheelEvent`) with a discriminated delta (`ScrollDelta::Lines` vs `ScrollDelta::Pixels`).

At the same time, the left panel had two problems:

1. **Performance.** `collect_file_tree` did a full recursive `std::fs::read_dir` walk on every render frame. Opening the panel on any non-trivial project made the UI sluggish.
2. **No scrolling.** If the file tree was taller than the window, entries below the fold were invisible with no way to reach them.

---

### File tree caching

#### The problem

`render_left_panel` called `collect_file_tree` directly:

```rs
fn render_left_panel(&self, cx: &mut Context<Self>) -> impl IntoElement {
    let files = Self::collect_file_tree(Path::new(&self.project_root), "", 0);
    // ... render all entries ...
}
```

`render_left_panel` is called from `render()`, which runs on every frame. `collect_file_tree` is recursive — it calls `std::fs::read_dir` for every directory, sorts entries, and builds a flat `Vec`. On a project with hundreds of files and nested directories, this is noticeable. It's not loading file _contents_ into memory — it's the filesystem I/O of walking the directory tree on every single repaint that kills performance.

Even with virtual scrolling (rendering only visible entries), the full tree still has to be built to know what to slice. The filesystem walk is the bottleneck, not the rendering.

#### The fix

Cache the tree as a field on `Workspace`:

```rs
pub struct Workspace {
    // ... existing fields ...
    file_tree: Vec<(String, bool, String)>,  // cached: (display_name, is_dir, rel_path)
    left_panel_scroll: usize,                // entry offset for left panel scrolling
}
```

The tree is built once in `new()` and refreshed explicitly via `refresh_file_tree()`:

```rs
fn refresh_file_tree(&mut self) {
    self.file_tree = Self::collect_file_tree(Path::new(&self.project_root), "", 0);
    self.left_panel_scroll = 0;
}
```

#### When the cache is rebuilt

| Trigger                     | Why                                    |
| --------------------------- | -------------------------------------- |
| `Workspace::new`            | Initial tree on startup                |
| `ToggleLeftPanel` (opening) | Refresh when the panel becomes visible |

The toggle action refreshes on open:

```rs
.on_action(cx.listener(|this, _: &ToggleLeftPanel, _window, cx| {
    this.left_panel_visible = !this.left_panel_visible;
    if this.left_panel_visible {
        this.refresh_file_tree();
    }
    cx.notify();
}))
```

This means the tree is stale while the panel is open — creating or deleting files externally won't show up until you toggle the panel off and on. That's acceptable for now. A file watcher or manual refresh keybinding can be added later.

---

### Left panel virtual scrolling

#### Layout constants

```rs
const PANEL_ENTRY_H: f32 = 24.0;  // left panel entry height (text_sm + py(3) padding)
const PANEL_HEADER_H: f32 = 34.0; // "EXPLORER" header height (text_xs + py(10) + px(12))
```

Like `LINE_HEIGHT` and `CHAR_WIDTH`, these are approximations of what the font renderer produces. They only control when scroll clamping kicks in — a few pixels off doesn't cause visual bugs.

#### Visible entry count

```rs
fn compute_visible_panel_entries(&self, window: &Window) -> usize {
    let window_h: f32 = window.viewport_size().height.into();
    let chrome = TITLE_BAR_H + STATUS_BAR_H;
    let bottom = if self.bottom_panel_visible { BOTTOM_PANEL_H } else { 0.0 };
    let available = (window_h - chrome - bottom - PANEL_HEADER_H).max(0.0);
    (available / PANEL_ENTRY_H).floor().max(1.0) as usize
}
```

Same pattern as `compute_visible_lines` — subtract chrome, divide by entry height.

#### Rendering only visible entries

```rs
fn render_left_panel(&self, window: &Window, cx: &mut Context<Self>) -> impl IntoElement {
    let visible_entries = self.compute_visible_panel_entries(window);
    let start = self.left_panel_scroll;
    let end = (start + visible_entries).min(self.file_tree.len());

    // ...
    for (name, is_dir, path) in &self.file_tree[start..end] {
        // render entry
    }
}
```

This is the same virtual scrolling strategy the editor uses — slice the data to the visible range, render only that slice. A project with 10,000 files still renders at most ~30 entries per frame.

Note: `render_left_panel` now takes `window: &Window` so it can compute the visible entry count. The call site in `render()` passes it through.

---

### Scroll architecture: shared helper, separate handlers

#### The shared `scroll_delta` helper

Delta conversion logic is the same regardless of which area is being scrolled. It lives in a single static helper:

```rs
fn scroll_delta(delta: &ScrollDelta) -> (f32, f32) {
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
```

Returns `(delta_x, delta_y)` in columns and lines respectively. Both handlers call this instead of duplicating the conversion.

#### Two separate handlers

**`handle_scroll_wheel`** — attached to the root div, handles editor scrolling:

```rs
fn handle_scroll_wheel(&mut self, ev: &ScrollWheelEvent, window: &mut Window, cx: &mut Context<Self>) {
    // Skip if pointer is over the left panel — handled by its own handler.
    let pointer_x: f32 = ev.position.x.into();
    if self.left_panel_visible && pointer_x < LEFT_PANEL_W {
        return;
    }

    let total_lines = self.editor.len_lines();
    let visible_lines = self.compute_visible_lines(window);
    let (delta_x, delta_y) = Self::scroll_delta(&ev.delta);

    // vertical + horizontal editor scroll ...
}
```

**`handle_left_panel_scroll`** — attached to the left panel div, handles panel scrolling:

```rs
fn handle_left_panel_scroll(&mut self, ev: &ScrollWheelEvent, window: &mut Window, cx: &mut Context<Self>) {
    let (_delta_x, delta_y) = Self::scroll_delta(&ev.delta);

    if delta_y.abs() > 0.01 {
        let visible = self.compute_visible_panel_entries(window);
        let max_offset = self.file_tree.len().saturating_sub(visible);
        let new = (self.left_panel_scroll as f32 + delta_y)
            .round()
            .clamp(0.0, max_offset as f32);
        self.left_panel_scroll = new as usize;
    }

    cx.notify();
}
```

#### Why two handlers instead of one with routing

The user's scroll intent is determined by where the pointer is. Two approaches:

1. **One handler on root, route by pointer position.** Simple, but mixes concerns.
2. **Separate handlers on separate elements.** Each scrollable area owns its handler.

We use approach 2. The left panel div gets its own `on_scroll_wheel`:

```rs
// in render_left_panel:
div()
    // ... panel chrome ...
    .child(entries)
    .on_scroll_wheel(cx.listener(Self::handle_left_panel_scroll))
```

The root div keeps its `on_scroll_wheel` for the editor, but guards against the left panel area with a pointer check:

```rs
let pointer_x: f32 = ev.position.x.into();
if self.left_panel_visible && pointer_x < LEFT_PANEL_W {
    return;
}
```

This guard is necessary because GPUI bubbles scroll events from inner to outer elements. Without it, scrolling over the left panel would fire both handlers. The inner handler (`handle_left_panel_scroll`) scrolls the panel, then the event bubbles to the root handler (`handle_scroll_wheel`) which would also scroll the editor. The pointer guard prevents the double-fire.

#### Left panel scroll clamping

- Can't scroll above entry 0
- Can't scroll past `file_tree.len() - visible_entries` (last entry at bottom of panel)
- If the tree fits entirely in the panel, `max_offset` is 0 and scrolling is locked
- Horizontal scrolling is ignored — file names are short, `overflow_hidden` clips long ones

---

### Delta conversion

GPUI's `ScrollDelta` has two variants:

| Variant               | Source      | Units                        | Conversion                             |
| --------------------- | ----------- | ---------------------------- | -------------------------------------- |
| `ScrollDelta::Pixels` | Touchpad    | Exact pixel displacement     | Divide by `LINE_HEIGHT` / `CHAR_WIDTH` |
| `ScrollDelta::Lines`  | Mouse wheel | Line counts (typically ±1–3) | Multiply by `SCROLL_SENSITIVITY`       |

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

### Editor scroll clamping

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

Tiny deltas (< 0.01 lines/cols) are ignored. This prevents jitter from touchpad noise and avoids unnecessary `round()` → offset update → `cx.notify()` → re-render cycles when the delta would round to zero anyway. Applied in both the editor and left panel handlers.

---

### Scroll wheel vs autoscroll: how they interact

| Mechanism    | Moves viewport? | Moves cursor?             | Keeps cursor visible?    |
| ------------ | --------------- | ------------------------- | ------------------------ |
| Autoscroll   | Yes             | No (cursor already moved) | Yes — that's its purpose |
| Scroll wheel | Yes             | No                        | No                       |

Scroll wheel scrolling does **not** call `ensure_cursor_visible`. This means you can scroll the cursor off-screen. The cursor stays where it was — it's just not visible. The next keystroke or cursor movement will trigger `ensure_cursor_visible` again, snapping the viewport back to the cursor.

This is standard editor behavior. It lets you peek at distant code without losing your editing position.

---

### Where scroll state is modified

#### Editor scroll offsets (`scroll_offset`, `h_scroll_offset`)

| Source                  | Vertical | Horizontal | Mechanism                             |
| ----------------------- | -------- | ---------- | ------------------------------------- |
| `ensure_cursor_visible` | ✓        | ✓          | Adjusts to keep cursor in viewport    |
| `handle_scroll_wheel`   | ✓        | ✓          | Direct manipulation from user gesture |
| `Editor::load_text`     | ✓        | ✓          | Resets to 0 when loading a new file   |

There is no conflict between autoscroll and scroll wheel — they both write to the same fields. Last write wins, and both are triggered by user actions, so the behavior is always what you'd expect.

#### Left panel scroll offset (`left_panel_scroll`)

| Source                     | Mechanism                           |
| -------------------------- | ----------------------------------- |
| `handle_left_panel_scroll` | Scroll gesture over left panel area |
| `refresh_file_tree`        | Reset to 0 on tree rebuild          |

---

### Scrollbars

Visual indicators of scroll position, rendered as absolutely-positioned overlay divs. Purely decorative for now — no click-to-drag interaction.

#### Layout constants

```rs
const SCROLLBAR_SIZE: f32 = 14.0;     // width for vertical scrollbar, height for horizontal
const SCROLLBAR_MIN_THUMB: f32 = 20.0; // minimum thumb dimension in pixels
```

`SCROLLBAR_SIZE` is the total width (vertical) or height (horizontal) of the scrollbar track area. The thumb itself is inset by 2px on each side, giving a 10px-wide rounded pill inside a 14px track. `SCROLLBAR_MIN_THUMB` prevents the thumb from becoming an invisible sliver on very long files.

#### Thumb appearance

- **Track:** transparent — no visible background, matching VS Code's default
- **Thumb:** `rgba(0x79797966)` — semi-transparent gray, same as VS Code's `scrollbarSlider.background`
- **Shape:** `rounded(px(5.0))` — pill-shaped with 5px border radius
- **Inset:** 2px from the track edges (`left(px(2.0))` for vertical, `top(px(2.0))` for horizontal) so the thumb doesn't touch the viewport border

#### Editor vertical scrollbar

Shown when `total_lines > visible_lines`. Positioned at the right edge of the editor area.

```rs
let track_h = editor_h - SCROLLBAR_SIZE; // leave corner for horizontal scrollbar
let thumb_ratio = visible_lines as f32 / total_lines as f32;
let thumb_h = (thumb_ratio * track_h).max(SCROLLBAR_MIN_THUMB).min(track_h);

let max_v_offset = total_lines.saturating_sub(visible_lines) as f32;
let v_scroll_ratio = if max_v_offset > 0.0 {
    (self.editor.scroll_offset as f32 / max_v_offset).clamp(0.0, 1.0)
} else {
    0.0
};
let thumb_top = v_scroll_ratio * (track_h - thumb_h);
```

The thumb height is proportional to `visible_lines / total_lines` — if you can see half the file, the thumb fills half the track. Clamped to `[SCROLLBAR_MIN_THUMB, track_h]` so it's always visible and never overflows.

The thumb position maps `scroll_offset / max_scroll_offset` to `[0, track_h - thumb_h]`. At offset 0, the thumb is at the top. At max offset, the thumb is at the bottom.

The track height is `editor_h - SCROLLBAR_SIZE` to leave a square corner gap at the bottom-right where the horizontal scrollbar ends. This avoids visual overlap.

#### Editor horizontal scrollbar

Shown when the content is wider than the viewport. The "content width" is:

```rs
let max_col = self.max_line_len();
let total_content_cols = max_col.max(self.editor.h_scroll_offset + visible_cols);
```

`max_line_len()` iterates all lines and returns the longest `line_len`. Since horizontal scroll has no ceiling (you can scroll past the longest line into empty space), we take `max(max_line_len, h_scroll_offset + visible_cols)` to ensure the scrollbar still makes sense when scrolled past the end.

```rs
let track_w = editor_w - SCROLLBAR_SIZE; // leave corner for vertical scrollbar
let thumb_ratio = visible_cols as f32 / total_content_cols as f32;
let thumb_w = (thumb_ratio * track_w).max(SCROLLBAR_MIN_THUMB).min(track_w);

let max_h_scroll = total_content_cols.saturating_sub(visible_cols) as f32;
let h_scroll_ratio = if max_h_scroll > 0.0 {
    (self.editor.h_scroll_offset as f32 / max_h_scroll).clamp(0.0, 1.0)
} else {
    0.0
};
let thumb_left = h_scroll_ratio * (track_w - thumb_w);
```

Same proportional math as the vertical scrollbar, applied horizontally. Track width is `editor_w - SCROLLBAR_SIZE` to leave the corner gap.

#### `max_line_len` helper

```rs
fn max_line_len(&self) -> usize {
    let total = self.editor.len_lines();
    let mut max = 0;
    for i in 0..total {
        let ll = self.editor.line_len(i);
        if ll > max { max = ll; }
    }
    max
}
```

O(n_lines) per frame. Each `line_len` call is O(1) on the Rope (just checks the last character of the line slice). For typical files (< 10k lines), this is negligible. For very large files, we'd want to cache this value and invalidate on edit — but that's premature optimization for now.

#### Left panel vertical scrollbar

Shown when `file_tree.len() > visible_entries`. The entries section is wrapped in a `relative()` container that also holds the scrollbar:

```rs
let mut entries_wrapper = div().relative().flex_1().overflow_hidden().child(entries);

if total_entries > visible_entries {
    let track_h = (panel_h - PANEL_HEADER_H).max(0.0);
    let thumb_ratio = visible_entries as f32 / total_entries as f32;
    let thumb_h = (thumb_ratio * track_h).max(SCROLLBAR_MIN_THUMB).min(track_h);
    // ... position thumb based on left_panel_scroll / max_offset ...
    entries_wrapper = entries_wrapper.child(scrollbar_div);
}
```

The track height is the panel height minus the "EXPLORER" header (`PANEL_HEADER_H`), since the header doesn't scroll. The thumb position maps `left_panel_scroll / max_offset` to the track range, same as the editor scrollbar.

No horizontal scrollbar on the left panel — file names are short, and `overflow_hidden` clips long ones.

#### How `render_editor` gets pixel dimensions

`render_editor` now takes `window: &Window` instead of `visible_lines: usize`, and computes everything internally:

```rs
fn render_editor(&self, window: &Window) -> impl IntoElement {
    let visible_lines = self.compute_visible_lines(window);
    let visible_cols = self.compute_visible_cols(window);

    // Pixel dimensions for scrollbar positioning
    let window_h: f32 = window.viewport_size().height.into();
    let window_w: f32 = window.viewport_size().width.into();
    let editor_h = (window_h - TITLE_BAR_H - STATUS_BAR_H - bottom_panel_h).max(0.0);
    let editor_w = (window_w - left_panel_w - right_panel_w).max(0.0);
    // ...
}
```

These pixel dimensions are approximations — they use the same layout constants (`TITLE_BAR_H`, `LEFT_PANEL_W`, etc.) that the rest of the code uses. A few pixels off doesn't cause visual bugs, it just shifts the scrollbar thumb slightly. The important thing is that the thumb stays within the track bounds, which is guaranteed by the `.clamp(0.0, 1.0)` on the scroll ratio.

The outer editor div is now `.relative()` so the scrollbar children (`.absolute()`) are positioned relative to it rather than the window.

#### Corner gap

Both scrollbars leave a `SCROLLBAR_SIZE`-pixel gap in the bottom-right corner:

- Vertical track height = `editor_h - SCROLLBAR_SIZE`
- Horizontal track width = `editor_w - SCROLLBAR_SIZE`

This prevents the two scrollbar thumbs from overlapping in the corner. It also matches VS Code's behavior — there's a small empty square in the bottom-right when both scrollbars are visible.

---

### What we don't do (yet)

1. **Smooth (sub-line) scrolling.** Touchpad pixel deltas are converted to integer line offsets via `.round()`. True smooth scrolling would require a fractional `scroll_offset: f32` and rendering partial lines at the top of the viewport. This is a significant change to the rendering model.
2. **Scroll momentum / inertia.** macOS provides momentum events after a touchpad swipe (the `TouchPhase` field on `ScrollWheelEvent`). We don't distinguish between direct and momentum phases — they all scroll equally. To add inertia damping or cancellation on touch, we'd check `ev.touch_phase`.
3. **Scrollbar click-to-scroll.** Clicking on the scrollbar track should jump the viewport to that position. Would need `on_mouse_down` on the track div, converting click Y position to a scroll offset.
4. **Scrollbar drag.** Dragging the thumb should continuously scroll. Would need `on_drag` / mouse capture, tracking the delta from the initial click position and mapping it to scroll offset changes.
5. **Scrollbar hover highlight.** VS Code brightens the thumb on hover (`scrollbarSlider.hoverBackground`). Would need a `.hover()` style on the thumb div with a brighter `rgba` value, e.g. `rgba(0x797979aa)`.
6. **File watcher for tree refresh.** The cached file tree goes stale while the panel is open. External file changes (git checkout, file creation) won't appear until the panel is toggled. A `notify`-based file watcher or manual refresh keybinding would fix this.
7. **Right panel scrolling.** When git preview or other content lands in the right panel, it will need its own scroll offset and the same separate-handler treatment.
8. **Cached `max_line_len`.** Currently computed from scratch every frame by iterating all lines. Should be cached and invalidated on text edits for large files.
