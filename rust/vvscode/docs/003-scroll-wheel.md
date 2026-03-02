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
    // The cached tree is now a typed struct for clarity:
    //
    // struct FsNode {
    //     display_name: String, // what is rendered in the explorer (with indentation)
    //     is_dir: bool,
    //     rel_path: Arc<str>,     // relative path from project root, e.g. "src" or "src/components"
    // }
    //
    file_tree: Vec<FsNode>,                  // cached: FsNode entries
    left_panel_scroll: usize,                // entry offset for left panel scrolling
    collapsed_dirs: HashSet<Arc<str>>,       // set of collapsed directory rel_paths
}
```

The tree is built once in `new()` and refreshed explicitly via `refresh_file_tree()`. `collapsed_dirs` starts empty (all directories expanded).

```rs
fn refresh_file_tree(&mut self) {
    self.file_tree = Self::collect_file_tree(Path::new(&self.project_root), "", 0);
    self.left_panel_scroll = 0;
}
```

`collect_file_tree` now stores the relative path for directory entries (e.g. `"src"`, `"src/components"`) in the third tuple element. Previously this was `String::new()` — the change is needed so collapsed directories can be identified by their path.

A `visible_file_tree()` helper filters the cached `file_tree` at render time, skipping children of any directory whose rel_path is in `collapsed_dirs`:

```rs
fn visible_file_tree(&self) -> Vec<&FsNode> {
    let mut result = Vec::new();
    let mut skip_prefix: Option<Arc<str>> = None;

    for node in &self.file_tree {
        if let Some(ref prefix) = skip_prefix {
            let child_prefix = format!("{}/", prefix);
            if node.rel_path.starts_with(&child_prefix) {
                // This entry (file or dir) is a child of the collapsed dir.
                continue;
            }
            // We've left the collapsed subtree.
            skip_prefix = None;
        }

        // Add the node reference to the visible list.
        result.push(node);

        // If this is a collapsed directory, start skipping its children.
        if node.is_dir && self.collapsed_dirs.contains(&node.rel_path) {
            skip_prefix = Some(Arc::clone(&node.rel_path));
        }
    }
    result
}
```

Because `collect_file_tree` emits entries depth-first (directory, then its children, then siblings), the `skip_prefix` approach works: once a collapsed directory is encountered, all subsequent entries with `rel_path` starting with `collapsed_dir/` are skipped until an entry outside the subtree is reached.

#### `toggle_collapse_all` (collapse / expand all toggle)

Toggles between collapsing and expanding all directories:

```rs
fn toggle_collapse_all(&mut self) {
    // Count directories using the typed FsNode representation
    let total_dirs = self.file_tree.iter().filter(|node| node.is_dir).count();

    if self.collapsed_dirs.len() == total_dirs {
        // All collapsed -> expand all
        self.collapsed_dirs.clear();
    } else {
        // Collapse all: insert every directory's rel_path
        for node in &self.file_tree {
            if node.is_dir {
                self.collapsed_dirs.insert(Arc::clone(&node.rel_path));
            }
        }
    }

    self.left_panel_scroll = 0;
}
```

The method counts all directories in the cached `file_tree` and compares that to the size of `collapsed_dirs`. If they differ (at least one directory is still expanded), it collapses all — inserting every directory's `rel_path` into the set via `Arc::clone` (a cheap ref-count bump, not a deep string copy). If they're equal (everything is already collapsed), it expands all by clearing the set. This gives a natural toggle: press once to collapse, press again to expand. `left_panel_scroll` resets to 0 in both cases since the visible list changes dramatically.

Available via:

- **`Cmd+Shift+E`** keybinding (`ToggleCollapseAll` action registered in `main.rs`)
- **⊟ button** in the EXPLORER header bar (rendered as a clickable icon right-aligned next to "EXPLORER")

#### Why `collapsed_dirs` and not `expanded_dirs`

We considered flipping the flag — tracking which directories are _expanded_ rather than which are _collapsed_. With `expanded_dirs`, "Collapse All" becomes `expanded_dirs.clear()`, which is simpler. But `collapsed_dirs` is the better choice:

- **Default UX.** All dirs expanded on open — you see the full tree immediately. With `expanded_dirs`, the user would have to manually expand every folder after opening the panel or refreshing the tree.
- **Tree refresh.** New directories created between refreshes appear expanded automatically. With `expanded_dirs`, new dirs would be invisible until manually expanded.
- **Memory.** Typical usage: most directories are expanded, user collapses a few. `collapsed_dirs` stores the minority.
- **Toggle is simple.** Compare `collapsed_dirs.len()` to directory count — collapse all or `clear()`.

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
    let filtered_tree = self.visible_file_tree();
    let visible_entries = self.compute_visible_panel_entries(window);
    let start = self.left_panel_scroll.min(filtered_tree.len().saturating_sub(1));
    let end = (start + visible_entries).min(filtered_tree.len());

    // ...
    for node in &filtered_tree[start..end] {
        // use `node.display_name`, `node.is_dir`, `node.rel_path`
        // files open on click as before (capture node.rel_path.clone() into the click closure)
    }
}
```

This is the same virtual scrolling strategy the editor uses — slice the data to the visible range, render only that slice. A project with 10,000 files still renders at most ~30 entries per frame. With collapsible folders, the slice operates on the filtered tree (excluding children of collapsed directories), so the scroll range and visible window adapt dynamically.

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
        let total_visible = self.visible_file_tree().len();
        let max_offset = total_visible.saturating_sub(visible);
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
- Can't scroll past `visible_file_tree().len() - visible_entries` (last entry at bottom of panel)
- If the filtered tree fits entirely in the panel, `max_offset` is 0 and scrolling is locked
- Horizontal scrolling is ignored — file names are short, `overflow_hidden` clips long ones
- When a directory is collapsed (individually or via the collapse/expand toggle), `left_panel_scroll` is clamped to the new filtered tree length to prevent it from pointing past the end. `toggle_collapse_all()` resets it to 0 directly since the visible list changes dramatically in both directions.

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

| Source                     | Mechanism                                        |
| -------------------------- | ------------------------------------------------ |
| `handle_left_panel_scroll` | Scroll gesture over left panel area              |
| `refresh_file_tree`        | Reset to 0 on tree rebuild                       |
| Directory collapse toggle  | Clamped to filtered tree length after collapsing |
| `toggle_collapse_all`      | Reset to 0 after collapse/expand all toggle      |

---

### Scrollbars

Visual indicators of scroll position, rendered as absolutely-positioned overlay divs. The thumbs are draggable — grab any scrollbar thumb and drag to scroll the corresponding content.

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
- **Cursor:** `cursor_pointer` on hover, signaling the thumb is interactive

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

Shown when `visible_file_tree().len() > visible_entries` (i.e. the filtered tree, after excluding children of collapsed directories, is taller than the panel). The entries section is wrapped in a `relative()` container that also holds the scrollbar:

```rs
let total_entries = filtered_tree.len();
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

`render_editor` now takes `window: &Window` and `cx: &mut Context<Self>` instead of `visible_lines: usize`, and computes everything internally:

```rs
fn render_editor(&self, window: &Window, cx: &mut Context<Self>) -> impl IntoElement {
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

The `cx` parameter is needed so the thumb divs can register `on_mouse_down` handlers via `cx.listener()`.

These pixel dimensions are approximations — they use the same layout constants (`TITLE_BAR_H`, `LEFT_PANEL_W`, etc.) that the rest of the code uses. A few pixels off doesn't cause visual bugs, it just shifts the scrollbar thumb slightly. The important thing is that the thumb stays within the track bounds, which is guaranteed by the `.clamp(0.0, 1.0)` on the scroll ratio.

The outer editor div is now `.relative()` so the scrollbar children (`.absolute()`) are positioned relative to it rather than the window.

#### Corner gap

Both scrollbars leave a `SCROLLBAR_SIZE`-pixel gap in the bottom-right corner:

- Vertical track height = `editor_h - SCROLLBAR_SIZE`
- Horizontal track width = `editor_w - SCROLLBAR_SIZE`

This prevents the two scrollbar thumbs from overlapping in the corner. It also matches VS Code's behavior — there's a small empty square in the bottom-right when both scrollbars are visible.

---

### Scrollbar drag-to-scroll

All three scrollbar thumbs (editor vertical, editor horizontal, left panel vertical) are draggable. Grab the thumb and drag to scroll the corresponding content continuously. Clicking the track (outside the thumb) jumps the viewport to that position and seamlessly transitions into a drag.

#### Drag state

```rs
#[derive(Clone, Copy)]
enum ScrollbarDragKind {
    EditorVertical,
    EditorHorizontal,
    LeftPanel,
}

#[derive(Clone, Copy)]
struct ScrollbarDragState {
    kind: ScrollbarDragKind,
    start_mouse: f32,   // mouse position (Y or X) at drag start
    start_offset: f32,  // scroll offset at drag start
    scroll_per_px: f32, // scroll-offset units per pixel of mouse movement
    max_scroll: f32,    // maximum scroll offset (for clamping)
}
```

`Workspace` stores `scrollbar_drag: Option<ScrollbarDragState>`. It's `None` when idle and `Some(...)` during a drag.

#### The `scroll_per_px` conversion factor

The key insight: the scrollbar thumb maps a scroll offset range to a pixel range. If the thumb can slide across `track_length - thumb_size` pixels, and the scroll offset ranges from `0` to `max_scroll`, then:

```
scroll_per_px = max_scroll / (track_length - thumb_size)
```

This is a constant (for a given frame) that converts pixel movement of the mouse into scroll offset change. It's computed at render time and captured by the `on_mouse_down` closure.

For the editor vertical scrollbar:

```rs
let scroll_per_px_v = max_v_offset / (track_h - thumb_h).max(1.0);
```

The `.max(1.0)` prevents division by zero when the thumb fills the entire track.

#### Mouse event wiring: three handlers

**1. `on_mouse_down` on each thumb** — initiates the drag:

```rs
// On the vertical scrollbar thumb div:
.on_mouse_down(MouseButton::Left, cx.listener(move |this, ev: &MouseDownEvent, _window, _cx| {
    let mouse_y: f32 = ev.position.y.into();
    this.scrollbar_drag = Some(ScrollbarDragState {
        kind: ScrollbarDragKind::EditorVertical,
        start_mouse: mouse_y,
        start_offset: this.editor.scroll_offset as f32,
        scroll_per_px: scroll_per_px_v,
        max_scroll: max_v_offset,
    });
}))
```

Note that `start_offset` reads the _current_ scroll offset at event time (`this.editor.scroll_offset`), not the one captured at render time. This handles the case where the offset changed between render and click (e.g., from a scroll wheel event).

`scroll_per_px` and `max_scroll` are captured at render time. They depend on window geometry and document size, which are unlikely to change between render and click. If the window resizes, the next render recomputes them.

Each scrollbar kind (editor vertical, editor horizontal, left panel) has its own `on_mouse_down` with the appropriate `ScrollbarDragKind`, `scroll_per_px`, and axis.

**2. `on_mouse_move` on the root div** — updates scroll during drag:

```rs
.on_mouse_move(cx.listener(|this, ev: &MouseMoveEvent, _window, cx| {
    if let Some(drag) = this.scrollbar_drag {
        // Safety: if button was released outside the window, clear drag
        if ev.pressed_button != Some(MouseButton::Left) {
            this.scrollbar_drag = None;
            return;
        }
        let current: f32 = match drag.kind {
            ScrollbarDragKind::EditorVertical | ScrollbarDragKind::LeftPanel => {
                ev.position.y.into()
            }
            ScrollbarDragKind::EditorHorizontal => ev.position.x.into(),
        };
        let delta = current - drag.start_mouse;
        let new_offset = (drag.start_offset + delta * drag.scroll_per_px)
            .round()
            .clamp(0.0, drag.max_scroll);
        match drag.kind {
            ScrollbarDragKind::EditorVertical => {
                this.editor.scroll_offset = new_offset as usize;
            }
            ScrollbarDragKind::EditorHorizontal => {
                this.editor.h_scroll_offset = new_offset as usize;
            }
            ScrollbarDragKind::LeftPanel => {
                this.left_panel_scroll = new_offset as usize;
            }
        }
        cx.notify();
    }
}))
```

The handler early-returns when `scrollbar_drag` is `None` (the common case — most mouse moves aren't drags). This keeps the overhead negligible.

**3. `on_mouse_up` on the root div** — ends the drag:

```rs
.on_mouse_up(MouseButton::Left, cx.listener(|this, _ev: &MouseUpEvent, _window, _cx| {
    this.scrollbar_drag = None;
}))
```

#### Why the root div for move/up handlers

The `on_mouse_down` is on the thumb, but `on_mouse_move` and `on_mouse_up` are on the root div (`size_full()`, covering the entire window). This is necessary because during a drag, the mouse moves away from the thumb — it could be anywhere in the window. If these handlers were on the thumb div, they'd stop firing as soon as the cursor left the thumb bounds.

GPUI's `on_mouse_move` has a `hitbox.is_hovered()` check, so it only fires when the mouse is within the element's bounds. The root div covers the entire window, so it catches all movement within the window.

#### Safety: detecting button release outside the window

If the user drags the scrollbar thumb, moves the mouse outside the application window, and releases the button there, the `on_mouse_up` event never fires (it's outside the root div's bounds). The drag state would be stuck.

The `on_mouse_move` handler guards against this:

```rs
if ev.pressed_button != Some(MouseButton::Left) {
    this.scrollbar_drag = None;
    return;
}
```

`MouseMoveEvent.pressed_button` reports which button is currently held. When the mouse re-enters the window after an external release, `pressed_button` is `None`, and the handler clears the stale drag state.

#### Interaction with scroll wheel

Scroll wheel and scrollbar drag both write to the same offset fields (`scroll_offset`, `h_scroll_offset`, `left_panel_scroll`). There's no conflict:

- During a drag, `start_offset` was captured at mouse-down time. Scroll wheel events during a drag would change the offset, but the next mouse-move overwrites it based on `start_offset + delta * scroll_per_px`. The visual effect is that the drag "wins" — the scroll wheel change is immediately overridden. This is acceptable because simultaneously dragging a scrollbar and using the scroll wheel is not a realistic user scenario.
- After a drag ends (`on_mouse_up`), scroll wheel events work normally.

#### Interaction with autoscroll

Like scroll wheel, scrollbar drag does **not** call `ensure_cursor_visible`. The cursor may scroll off-screen. The next keystroke will snap the viewport back to the cursor via autoscroll.

---

### Click-to-scroll on scrollbar tracks

Clicking the scrollbar track (the empty area outside the thumb) jumps the viewport so the thumb centers on the click position. This matches VS Code's default `editor.scrollbar.scrollByPage: false` behavior.

#### How it works

Each track div has its own `on_mouse_down` handler in addition to the thumb's handler. GPUI events bubble from inner to outer, so a click on the thumb fires the thumb handler first, then the track handler. The track handler detects this and skips:

```rs
// On the editor vertical scrollbar track div:
.on_mouse_down(MouseButton::Left, cx.listener(move |this, ev: &MouseDownEvent, _window, cx| {
    let mouse_y: f32 = ev.position.y.into();
    let y_in_track = mouse_y - v_track_top;
    // Skip if click is on the thumb (thumb handler already fired)
    if y_in_track >= thumb_top && y_in_track <= thumb_top + thumb_h {
        return;
    }
    // Center thumb on click position
    let target_top = (y_in_track - thumb_h / 2.0).clamp(0.0, track_h - thumb_h);
    let ratio = target_top / (track_h - thumb_h).max(1.0);
    let new_offset = (ratio * max_v_offset).round().clamp(0.0, max_v_offset);
    this.editor.scroll_offset = new_offset as usize;
    // Initiate drag so user can keep sliding after click
    this.scrollbar_drag = Some(ScrollbarDragState {
        kind: ScrollbarDragKind::EditorVertical,
        start_mouse: mouse_y,
        start_offset: new_offset,
        scroll_per_px: scroll_per_px_v,
        max_scroll: max_v_offset,
    });
    cx.notify();
}))
```

#### Window-to-track coordinate conversion

The track is absolutely positioned within a parent div. To convert from window-relative mouse coordinates to track-relative coordinates, we subtract the track's known top (or left) position in window space:

| Scrollbar           | Offset formula                                        | Why                                                       |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Editor vertical     | `y_in_track = mouse_y - TITLE_BAR_H`                  | Editor starts below the title bar                         |
| Editor horizontal   | `x_in_track = mouse_x - left_w`                       | Editor starts after the left panel (0 if panel is hidden) |
| Left panel vertical | `y_in_track = mouse_y - TITLE_BAR_H - PANEL_HEADER_H` | Entries area starts below title bar + "EXPLORER" header   |

These are the same layout-constant approximations used everywhere else. A few pixels off just shifts the jump target slightly — the `.clamp()` keeps it within bounds.

#### Centering the thumb on the click

The goal is to place the thumb's center at the click position:

```
target_top = (y_in_track - thumb_h / 2).clamp(0, track_h - thumb_h)
ratio = target_top / (track_h - thumb_h)
new_offset = ratio * max_scroll
```

The `.clamp()` ensures the thumb doesn't go above the top or below the bottom of the track. Clicking near the very top centers as high as possible; clicking near the very bottom centers as low as possible.

#### Seamless click-then-drag

After jumping, the handler also sets `scrollbar_drag` with the current mouse position and the _new_ (post-jump) offset. This means the existing `on_mouse_move` handler on the root div immediately takes over. The user can click the track and, without releasing, drag to fine-tune the position. This feels natural — it's the same behavior as VS Code and macOS system scrollbars.

#### Thumb hit-test to avoid double-fire

When the user clicks on the thumb itself, both handlers fire (bubble order: thumb first, then track). The track handler checks whether the click falls within the thumb's bounds:

```rs
if y_in_track >= thumb_top && y_in_track <= thumb_top + thumb_h {
    return;
}
```

If it does, the track handler returns early. The thumb's own handler already set up the drag state. Without this guard, the track handler would overwrite the drag's `start_offset` with a re-centered position, causing a visual jump when dragging starts.

---

### What we don't do (yet)

1. **Smooth (sub-line) scrolling.** Touchpad pixel deltas are converted to integer line offsets via `.round()`. True smooth scrolling would require a fractional `scroll_offset: f32` and rendering partial lines at the top of the viewport. This is a significant change to the rendering model.
2. **Scroll momentum / inertia.** macOS provides momentum events after a touchpad swipe (the `TouchPhase` field on `ScrollWheelEvent`). We don't distinguish between direct and momentum phases — they all scroll equally. To add inertia damping or cancellation on touch, we'd check `ev.touch_phase`.
3. **Scrollbar hover highlight.** VS Code brightens the thumb on hover (`scrollbarSlider.hoverBackground`). Would need an `.id()` on the thumb div and a `.hover()` style with a brighter `rgba` value, e.g. `rgba(0x797979aa)`.
4. **File watcher for tree refresh.** The cached file tree goes stale while the panel is open. External file changes (git checkout, file creation) won't appear until the panel is toggled. A `notify`-based file watcher or manual refresh keybinding would fix this.
5. **Right panel scrolling.** When git preview or other content lands in the right panel, it will need its own scroll offset and the same separate-handler treatment.
6. **Cached `max_line_len`.** Currently computed from scratch every frame by iterating all lines. Should be cached and invalidated on text edits for large files.
7. **Persistent collapse state.** `collapsed_dirs` is in-memory only — collapsing a folder is lost when the app restarts. Could be serialized to a workspace settings file.
8. **Lazy tree expansion.** Currently `collect_file_tree` walks the entire directory tree recursively on startup. With collapsible folders, we could defer loading children until a directory is first expanded, improving startup time on large projects.
9. ~~**Expand All action.** The inverse of `ToggleCollapseAll` — would be `collapsed_dirs.clear()`. Not yet wired up as an action or button.~~ → Done. `toggle_collapse_all()` now toggles: if all dirs are collapsed it expands all, otherwise it collapses all. Same `Cmd+Shift+E` keybinding and ⊟ button.
