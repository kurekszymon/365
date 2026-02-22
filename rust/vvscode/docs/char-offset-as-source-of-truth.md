# Architecture Decisions

## ADR-001: Char offset as the cursor's source of truth

**Supersedes:** The original `(cursor_row, cursor_col)` pair from the initial implementation

---

### Context

The editor was initially built with two fields tracking cursor position:

```rs
struct Editor {
    rope: Rope,
    cursor_row: usize,    // line index
    cursor_col: usize,    // column within that line
    scroll_offset: usize,
}
```

Every editing operation had to maintain both values in sync. This worked for basic typing, but the approach doesn't scale once you add selection, clipboard, search, undo, or multi-cursor.

---

### The problem with (row, col) as source of truth

#### 1. Two values that must always agree

Every operation has to update both `cursor_row` and `cursor_col` correctly. Inserting a newline means incrementing `cursor_row` AND resetting `cursor_col`. Backspace at column 0 means decrementing `cursor_row` AND setting `cursor_col` to the previous line's length. Every method is a chance to get one of them wrong while the other is right — and the bug only shows up as a cursor in the wrong place.

#### 2. Selection requires FOUR fields

Selection means tracking where the user started selecting (the anchor) and where the cursor is now. With (row, col):

```text
anchor_row: usize,
anchor_col: usize,
cursor_row: usize,
cursor_col: usize,
```

That's 4 fields to keep in sync. Every movement and editing operation needs to update the right pair. With char offsets:

```text
anchor: usize,
cursor: usize,
```

Two fields. One number each.

#### 3. Comparing positions is awkward

"Is the cursor before or after the anchor?" With (row, col):

```rs
fn cursor_before_anchor(&self) -> bool {
    self.cursor_row < self.anchor_row
        || (self.cursor_row == self.anchor_row && self.cursor_col < self.anchor_col)
}
```

With char offsets:

```rs
fn cursor_before_anchor(&self) -> bool {
    self.cursor < self.anchor
}
```

Integer comparison vs. lexicographic pair comparison. This matters everywhere — computing selection ranges, determining deletion direction, checking if a position is inside a selection.

#### 4. Range operations need char offsets anyway

The rope operates on char offsets. Every editing operation was already converting (row, col) to a char offset:

```rs
fn cursor_char_offset(&self) -> usize {
    self.rope.line_to_char(self.cursor_row) + self.cursor_col
}
```

Then calling `rope.insert_char(offset, ch)` or `rope.remove(offset..offset+1)`. The (row, col) was the source of truth, but the rope was the actual data — so every mutation went through a conversion. With char offsets as the source of truth, the conversion disappears from mutation paths and only happens at the display boundary.

#### 5. Multi-cursor multiplies all of this

If multiple cursors will ever be implemented, each one needs the full position state. With (row, col):

```rs
cursors: Vec<(anchor_row, anchor_col, cursor_row, cursor_col)>  // 4 values each
```

With char offsets:

```text
cursors: Vec<(anchor, cursor)>  // 2 values each
```

And sorting cursors (needed for non-overlapping edits) is just sorting by integer, not by (row, col) pairs.

---

### The decision

Switch to a single `cursor: usize` (char offset into the rope) as the source of truth. Add `anchor: usize` for selection. Derive `(row, col)` on demand for display.

```rs
struct Editor {
    rope: Rope,
    cursor: usize,                // char offset — THE position
    anchor: usize,                // selection start (== cursor when no selection)
    preferred_col: Option<usize>, // for up/down movement memory
    scroll_offset: usize,         // line offset for vertical scrolling
}
```

#### Deriving (row, col) for display

```rs
fn cursor_row(&self) -> usize {
    self.rope.char_to_line(self.cursor)
}

fn cursor_col(&self) -> usize {
    self.cursor - self.rope.line_to_char(self.cursor_row())
}
```

Both are O(log n) via ropey's B-tree. Called once per render frame, per cursor. Negligible cost.

---

### Before vs After: every operation

#### insert_char

BEFORE (row, col) | AFTER (char offset)
────────────────── ───────────────────
fn insert_char(&mut self, ch: char) { | fn insert_char(&mut self, ch: char) {
self.clamp_cursor_col(); | self.delete_selection();
let offset = | self.rope.insert_char(self.cursor, ch);
self.cursor_char_offset(); | self.cursor += 1;
self.rope.insert_char(offset, ch); | self.anchor = self.cursor;
self.cursor_col += 1; | self.preferred_col = None;
} }

No clamping needed — the char offset is always valid (or we ensure it is in one place). Selection deletion is free — if anchor == cursor, `delete_selection()` is a no-op.

#### backspace

```rs
// BEFORE
if self.cursor_col > 0 {
    self.clamp_cursor_col();
    let offset = self.cursor_char_offset();
    self.rope.remove(offset - 1..offset);
    self.cursor_col -= 1;
} else if self.cursor_row > 0 {
    let prev_len = self.line_len(self.cursor_row - 1);
    let line_start = self.rope.line_to_char(self.cursor_row);
    self.rope.remove(line_start - 1..line_start);
    self.cursor_row -= 1;
    self.cursor_col = prev_len;
}

// AFTER
if self.has_selection() {
    self.delete_selection();
} else if self.cursor > 0 {
    self.rope.remove(self.cursor - 1..self.cursor);
    self.cursor -= 1;
    self.anchor = self.cursor;
}
```

The (row, col) version has two branches because "backspace at column 0" is a special case that crosses a line boundary. With char offsets, there's no special case — cursor - 1 is cursor - 1, whether it crosses a newline or not. The rope handles it.

#### move_left

```rs
// BEFORE
if self.cursor_col > 0 {
    self.cursor_col -= 1;
} else if self.cursor_row > 0 {
    self.cursor_row -= 1;
    self.cursor_col = self.line_len(self.cursor_row);
}

// AFTER
fn move_left(&mut self, extend: bool) {
    if !extend && self.has_selection() {
        self.cursor = self.selection_start();
        self.anchor = self.cursor;
    } else if self.cursor > 0 {
        self.cursor -= 1;
        if !extend {
            self.anchor = self.cursor;
        }
    }
    self.preferred_col = None;
}
```

The char offset version gains selection awareness for free. If Shift isn't held and there's a selection, collapse to the start. Otherwise just decrement. No line-boundary special case.

#### move_up / move_down (the hard one)

This is the one operation where (row, col) seems simpler. Moving up means "go to the same column on the previous line." With char offsets, you need to compute the row, find the target row, and compute the offset there.

But even with (row, col), there's a subtlety: the **preferred column problem**.

---

### The preferred column problem

Consider this text, cursor at `|`:

```text
line 1: "hello world"     cursor at col 10
line 2: "hi"              cursor at col 2 (clamped)
line 3: "another long line"
```

If you're at column 10 on line 1 and press Down, you land at column 2 (end of "hi"). Press Down again — where should you go? Column 2 on line 3? Or column 10?

Every real editor goes back to column 10. The cursor "remembers" where it wanted to be. This is the **preferred column** (also called "goal column" or "sticky column").

With (row, col), you'd need an extra field anyway:

```rs
struct Editor {
    ...
    cursor_row: usize,
    cursor_col: usize,             // actual col (clamped to line length)
    preferred_col: Option<usize>,  // desired col (set by horizontal movement)
}
```

With char offsets:

```rs
struct Editor {
    ...
    cursor: usize,
    preferred_col: Option<usize>,
}
```

The logic is the same either way:

- Horizontal movement (left, right, home, end, typing) **sets** `preferred_col` to `None` (or to the new column).
- Vertical movement (up, down) **reads** `preferred_col`. If it's `Some(col)`, try to land at that column. If it's `None`, compute the current column, save it as `preferred_col`, and use it.

```rs
fn move_up(&mut self, extend: bool) {
    let row = self.cursor_row();
    if row == 0 { return; }

    let current_col = self.cursor_col();
    let target_col = self.preferred_col.unwrap_or(current_col);
    self.preferred_col = Some(target_col);

    let prev_row = row - 1;
    let prev_line_len = self.line_len(prev_row);
    let clamped_col = target_col.min(prev_line_len);

    self.cursor = self.rope.line_to_char(prev_row) + clamped_col;
    if !extend { self.anchor = self.cursor; }
}
```

---

### Selection model

With char offsets, selection is defined by two positions:

```text
anchor: usize   — where the selection started (or == cursor if no selection)
cursor: usize   — where the cursor is now
```

The selected range is `min(anchor, cursor)..max(anchor, cursor)`. The cursor can be before or after the anchor (left-to-right or right-to-left selection).

#### Key behaviors

| Action                             | anchor                        | cursor                        |
| ---------------------------------- | ----------------------------- | ----------------------------- |
| Type a character                   | set to cursor (after insert)  | advances by 1                 |
| Arrow key (no Shift)               | set to cursor                 | moves                         |
| Arrow key (Shift held)             | stays                         | moves (extends selection)     |
| Backspace/Delete with selection    | set to start of deleted range | set to start of deleted range |
| Backspace/Delete without selection | set to cursor (after delete)  | moves by 1                    |
| Select All                         | 0                             | rope.len_chars()              |

#### Rendering selection

For each visible line, compute which columns are selected:

```rs
fn selection_on_line(&self, line_idx: usize) -> Option<(usize, usize)>
```

Returns `Some((start_col, end_col))` if the line overlaps the selection, `None` otherwise. The renderer splits the line text into up to three spans: before-selection (normal), selected (highlighted background), after-selection (normal).

When there IS a selection, the block cursor is not shown (same as VS Code — the selection endpoints imply the cursor position). When there is NO selection (anchor == cursor), the block cursor renders at the cursor position.

---

### What we lose

1. **Directness for display.** We used to just read `cursor_row` and `cursor_col`. Now we compute them with `rope.char_to_line()` and subtraction. This is O(log n) per call, which is trivially fast, but it is an extra step.

2. **Simplicity for trivial cases.** If you never need selection, multi-cursor, or undo, (row, col) is easier to reason about. But it IS needed for an editor.

3. **`clamp_cursor_col` disappears.** With (row, col), the col could become stale after edits to other lines. With char offsets, the offset always points to a valid position in the rope (as long as you keep it ≤ `rope.len_chars()`). We just need one guard: `self.cursor = self.cursor.min(self.rope.len_chars())`.

---

### What we gain

- **Selection is two integers.** Not four.
- **Position comparison is integer comparison.** Not lexicographic pair comparison.
- **No (row, col) sync bugs.** There's one source of truth, not two.
- **Editing operations have fewer branches.** Backspace doesn't need a "column 0" special case.
- **Multi-cursor is a `Vec<(usize, usize)>`.** Sorted by position, trivially.
- **Undo snapshots are smaller.** Save `(cursor, anchor)` not `(cursor_row, cursor_col, anchor_row, anchor_col)`.
- **The cursor is always valid.** A char offset of 5 means "5 chars in." It doesn't go stale when other lines change length. (The row/col derived from it might change, but the offset is still the same logical position — unless text before it was inserted/deleted, in which case you'd adjust it anyway.)

---

### Summary

```text
(row, col) as source of truth:
  ✗ Two values to sync on every operation
  ✗ Selection needs four values
  ✗ Position comparison is lexicographic
  ✗ Line-boundary special cases in every movement method
  ✗ Must convert to char offset for every rope operation anyway
  ✓ Display values are directly available

char offset as source of truth:
  ✓ One value to maintain
  ✓ Selection needs two values
  ✓ Position comparison is integer comparison
  ✓ No line-boundary special cases
  ✓ Rope operations use the value directly
  ✗ Must convert to (row, col) for display (O(log n), negligible)
```

The trade-off is obvious. The only cost is an O(log n) derivation at render time, and the gains compound with every feature added.

```

```
