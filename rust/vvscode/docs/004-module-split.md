# Architecture Decisions

## ADR-004: Module split — making editor and workspace readable at a glance

---

### Context

`workspace.rs` had grown to ~1340 lines and `editor.rs` to ~450 lines. Both files mixed concerns: struct definitions sat next to rendering code, input handling shared a file with scrollbar geometry, and file-tree logic was interleaved with panel layout. Reading any one concern meant scrolling past several others.

The goal: split each file into focused submodules so you can find code by filename, without over-fragmenting into dozens of tiny files that are harder to maintain than one big one.

---

### Rust 2024 module style

The Rust 2024 edition (which this project uses — see `Cargo.toml`) supports two ways to declare submodules:

```text
# Legacy (mod.rs style)
src/workspace/mod.rs        ← the module root
src/workspace/input.rs      ← submodule

# Modern (file + directory style)
src/workspace.rs            ← the module root
src/workspace/input.rs      ← submodule
```

Both work in all editions, but the modern style is preferred because:

- The module root keeps its descriptive name (`workspace.rs`) instead of becoming an anonymous `mod.rs`.
- Opening multiple modules in an editor doesn't give you a wall of `mod.rs` tabs.
- It matches how the compiler actually resolves paths since Rust 2018.

We use the modern style throughout.

---

### The split

#### `editor.rs` → `editor.rs` + `editor/*.rs`

| File                  | Lines | Responsibility                                                                                                                                                   |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor.rs`           | ~120  | Struct definition, `new()`, derived position info (`cursor_row`, `cursor_col`, `line_len`, etc.), `char_at`, `clamp`, `load_text`                                |
| `editor/selection.rs` | ~80   | `has_selection`, `selection_start`/`end`, `delete_selection`, `collapse_to_cursor`, `select_all`, `selection_on_line`                                            |
| `editor/editing.rs`   | ~115  | `insert_char`, `insert_newline`, `backspace`, `delete`, `insert_tab`, `delete_word_backward`, `delete_to_line_start`, `prev_word_boundary`, `next_word_boundary` |
| `editor/movement.rs`  | ~140  | All `move_*` methods — left/right/up/down, home/end, word left/right, doc start/end                                                                              |
| `editor/scrolling.rs` | ~30   | `ensure_cursor_visible`                                                                                                                                          |

The struct and its fields stay in the root `editor.rs`. Each submodule adds an `impl Editor` block with related methods. Rust merges them at compile time — it's purely an organizational split.

Why word boundary helpers live in `editing.rs` and not `movement.rs`: they're called by both `delete_word_backward` (editing) and `move_word_left`/`move_word_right` (movement), but their primary purpose is to support the delete operations. The movement methods just call `self.prev_word_boundary()` / `self.next_word_boundary()`, which are `pub` on `Editor` anyway.

#### `workspace.rs` → `workspace.rs` + `workspace/*.rs`

| File                         | Lines | Responsibility                                                                                                                                                  |
| ---------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace.rs`               | ~160  | Struct definition, constants, actions, `new()`, viewport geometry helpers (`compute_visible_lines`, `compute_visible_cols`, etc.), `Render` trait impl          |
| `workspace/scrollbar.rs`     | ~20   | `ScrollbarDragKind` enum + `ScrollbarDragState` struct — shared types used by multiple render files                                                             |
| `workspace/file_tree.rs`     | ~230  | `FsNode` struct, `scan_single_dir`, `refresh_file_tree` (async), `expand_or_collapse_dir`, `toggle_collapse_all`, `visible_file_tree`, `open_file`, `save_file` |
| `workspace/input.rs`         | ~160  | `handle_key_down`, `scroll_delta`, `handle_scroll_wheel`, `handle_left_panel_scroll`                                                                            |
| `workspace/render_chrome.rs` | ~75   | `render_title_bar`, `render_status_bar`                                                                                                                         |
| `workspace/render_editor.rs` | ~410  | `render_editor` — text lines, gutter, cursor overlay, selection highlight, vertical & horizontal scrollbars                                                     |
| `workspace/render_panels.rs` | ~315  | `render_left_panel`, `render_right_panel`, `render_bottom_panel`                                                                                                |

---

### Why this granularity and not finer/coarser

**Not coarser (e.g. just `render.rs` for all rendering):** `render_editor` alone is ~410 lines. Combining it with panels and chrome would be ~800 lines — barely better than the original. Splitting rendering by area (editor vs. panels vs. chrome) maps to how you think about the UI.

**Not finer (e.g. `render_vertical_scrollbar.rs`):** Scrollbar rendering is tightly coupled to the editor content it's embedded in — they share geometry calculations (`editor_h`, `editor_w`, `left_w`). Pulling it out would mean either passing a dozen parameters or creating a geometry struct just to move 80 lines to a new file. Not worth it.

**Not finer (e.g. `open_file.rs` separate from `file_tree.rs`):** `open_file` and `save_file` are 60 lines combined and both operate on `current_file` + `project_root`. Splitting them from the file tree logic that populates the explorer would scatter related filesystem code across three files.

The rule of thumb: split when a file has **two or more clearly separable concerns** that are each substantial enough to warrant their own mental context. Don't split just because a file is long if all the code serves one purpose.

---

### Visibility

Submodule methods use `pub(crate)` instead of `pub` — they're called by other parts of the workspace module (e.g. `input.rs` calls `self.compute_visible_lines()` which lives in the root) but shouldn't be part of the public API.

Struct fields on `Workspace` changed from private to `pub(crate)` so submodules can access them directly. This is the standard Rust pattern for splitting an `impl` across files — the alternative (accessor methods for every field) would add boilerplate without adding safety, since all the code is in the same crate.

The `scrollbar` and `file_tree` submodules are declared `pub mod` because their types (`ScrollbarDragState`, `FsNode`) are used in the `Workspace` struct's field types, which means they need to be visible to anything that can see the struct's fields.

---

### What didn't change

- **`main.rs`** — unchanged. It imports `Workspace` and the action types, which are still re-exported from `workspace.rs`.
- **All behaviour** — zero functional changes. This is a pure restructuring.
- **Existing ADRs** — still accurate. The code they describe just moved to different files.

---

### File tree after the split

```text
src/
├── main.rs
├── editor.rs                    ← module root: struct + position helpers
├── editor/
│   ├── editing.rs               ← insert, delete, backspace, word boundaries
│   ├── movement.rs              ← arrow keys, home/end, word/doc movement
│   ├── scrolling.rs             ← ensure_cursor_visible
│   └── selection.rs             ← selection queries and manipulation
├── workspace.rs                 ← module root: struct + constants + Render impl
└── workspace/
    ├── file_tree.rs             ← FsNode, directory scanning, open/save
    ├── input.rs                 ← keyboard + scroll-wheel handlers
    ├── render_chrome.rs         ← title bar, status bar
    ├── render_editor.rs         ← editor area + scrollbars
    ├── render_panels.rs         ← left/right/bottom panels
    └── scrollbar.rs             ← ScrollbarDragKind, ScrollbarDragState
```
