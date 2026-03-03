# Architecture Decisions

## ADR-007: Undo/redo and clipboard support (copy, paste, cut)

---

### Context

The editor had no way to undo changes, and no clipboard integration. Every keystroke was permanent — one wrong `Cmd+A` followed by a character would erase the entire buffer with no recovery. Copy and paste required leaving the app entirely.

This ADR also documents a rejected feature: cursor blinking.

---

### Undo/redo

#### Design: snapshot-based history

Each undo entry stores a full clone of the rope, plus the cursor and anchor positions at the time of the snapshot. This is the simplest correct approach — no need for operation transforms, inversion logic, or change tracking.

```text
editor/undo.rs
  Snapshot { text: Rope, cursor: usize, anchor: usize }
  UndoHistory { undo_stack: Vec<Snapshot>, redo_stack: Vec<Snapshot> }
```

**Trade-off:** cloning the entire rope on every keystroke sounds expensive, but `ropey::Rope::clone()` is O(n) in the number of tree nodes, not the number of characters — for typical file sizes (< 100k lines) this is sub-millisecond. The stack is capped at 1000 entries. For a hobby editor this is perfectly fine; a production editor would use incremental operation logging.

#### How it works

1. Every editing method (`insert_char`, `insert_newline`, `backspace`, `delete`, `delete_word_backward`, `delete_to_line_start`, `insert_text`) calls `self.commit_history()` **before** mutating state.
2. `commit_history()` pushes the current `(rope, cursor, anchor)` onto `undo_stack` and **clears `redo_stack`** — any redo history is forfeited the moment you make a new edit.
3. `undo()` pops from `undo_stack`, pushes the _current_ state onto `redo_stack`, then restores the popped snapshot.
4. `redo()` does the reverse — pops from `redo_stack`, pushes current onto `undo_stack`, restores.
5. `load_text()` clears both stacks (loading a new file starts fresh).

#### Granularity

Every individual mutation is a separate undo step. Typing "hello" produces 5 undo entries. This matches how many editors work at the simplest level. A future improvement could coalesce consecutive character inserts into a single undo group (e.g. group until a whitespace/pause boundary), but the current approach is correct and predictable.

#### Key bindings

| Binding       | Action |
| ------------- | ------ |
| `Cmd+Z`       | Undo   |
| `Cmd+Shift+Z` | Redo   |

---

### Clipboard: copy, paste, cut

#### Platform clipboard access

GPUI exposes clipboard through methods on `App` (which `Context` derefs to):

- `cx.write_to_clipboard(ClipboardItem::new_string(text))` — write
- `cx.read_from_clipboard() -> Option<ClipboardItem>` — read
- `item.text() -> Option<String>` — extract text from a clipboard item

This uses the real macOS pasteboard, so copy/paste works across applications.

#### New helpers on `Editor`

| Method              | Purpose                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `selected_text()`   | Returns the selected text as a `String`, or `""` if no selection     |
| `insert_text(&str)` | Replaces selection (if any) with the given string, with undo support |

`insert_text` is distinct from `insert_char` — it handles multi-character paste in a single undo step (one `commit_history()` call before the whole insertion, not one per character).

#### Action behaviour

| Action  | Binding | Behaviour                                                                          |
| ------- | ------- | ---------------------------------------------------------------------------------- |
| `Copy`  | `Cmd+C` | If selection exists, write it to clipboard. No mutation.                           |
| `Cut`   | `Cmd+X` | If selection exists, write it to clipboard, then delete it. Marks dirty.           |
| `Paste` | `Cmd+V` | Read from clipboard. If text, insert at cursor (replacing selection). Marks dirty. |

Copy and cut are no-ops when there's no selection — this avoids accidentally overwriting the clipboard with an empty string.

---

### Rejected: cursor blinking

An initial implementation added cursor blinking via:

- A `cursor_visible: bool` field on `Workspace`
- An async timer spawned in `Workspace::new()` that toggled the bool every 500ms and called `cx.notify()` to trigger a re-render
- Conditional cursor color: `rgba(0xd4d4d4ff)` when visible, `rgba(0xd4d4d400)` when hidden
- Reset to visible on every keystroke, mouse click, undo, paste, etc.

**Why it was removed:**

- Re-rendering the entire view tree every 500ms just to toggle a 2px bar is wasteful. GPUI doesn't have a way to invalidate only the cursor element — `cx.notify()` triggers a full render pass.
- The `Workspace::new()` constructor had to be restructured to assign `Self` to a variable, spawn the timer, then return — adding complexity to a constructor that was previously a clean struct literal.
- Every action handler that moved the cursor needed a `cursor_visible = true` reset line, adding noise across 6+ call sites.
- The visual benefit is marginal. VS Code blinks its cursor, but for a learning project the implementation cost outweighs the polish.

If revisited, a better approach would be to blink only the cursor element using a CSS-animation-like mechanism (if GPUI ever supports it), or to use a dedicated lightweight timer that only repaints the cursor overlay rather than the full view.

---

### Files changed

| File                | Change                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor.rs`         | Added `history: UndoHistory` field, `selected_text()`, `insert_text()`, `commit_history()`, `undo()`, `redo()`. History cleared on `load_text()`. |
| `editor/undo.rs`    | **New.** `Snapshot` struct and `UndoHistory` with `save`, `undo`, `redo`, `clear`.                                                                |
| `editor/editing.rs` | Added `commit_history()` call at the top of every mutation method.                                                                                |
| `workspace.rs`      | Added `Undo`, `Redo`, `Copy`, `Paste`, `Cut` actions and their handlers. Imports `ClipboardItem`.                                                 |
| `main.rs`           | Added key bindings: `cmd-z`, `cmd-shift-z`, `cmd-c`, `cmd-v`, `cmd-x`.                                                                            |

### File tree (new file highlighted)

```text
src/
├── main.rs
├── editor.rs
├── editor/
│   ├── editing.rs
│   ├── movement.rs
│   ├── scrolling.rs
│   ├── selection.rs
│   └── undo.rs              ← NEW
├── workspace.rs
└── workspace/
    ├── command_palette.rs
    ├── file_tree.rs
    ├── input.rs
    ├── render_chrome.rs
    ├── render_editor.rs
    ├── render_panels.rs
    └── scrollbar.rs
```
