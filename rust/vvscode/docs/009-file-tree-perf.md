# Architecture Decisions

## ADR-009: File tree performance — lazy expansion, async scanning, caching

---

### Problem

`collect_file_tree` did a **synchronous, recursive `std::fs::read_dir`** of the entire project tree on the main thread. For a large repo every directory and every file was visited before the first frame could render — walking into `target/`, `node_modules/`, `.git/`, etc.

---

### Lazy expansion

`collect_file_tree` → `scan_single_dir`: only reads **one directory level** at a time. When the panel first opens we scan only the project root. Subdirectory contents are loaded on-demand the first time the user clicks to expand them. This is the same strategy VS Code uses.

**New state:**

| Field         | Purpose                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `loaded_dirs` | `HashSet<Arc<str>>` — directories whose children have been scanned and spliced into the flat list. |

**New method:** `expand_or_collapse_dir(&mut self, rel_path)` — toggles a directory open/closed. On first expansion it calls `scan_single_dir`, marks child directories as collapsed, splices the results into `file_tree`, and adds the directory to `loaded_dirs`.

---

### Hidden directories

Only `.git` is unconditionally hidden from the explorer (`HIDDEN_DIRS` constant). Everything else — `node_modules`, `target`, `build`, etc. — is shown but starts collapsed. Since expansion is lazy, those directories cost nothing until the user explicitly opens them. This keeps the explorer useful for cases where you do need to peek inside `node_modules` or `target`.

---

### Off-main-thread scan

`refresh_file_tree` launches the root-level listing via `cx.spawn`. The panel doesn't open until the scan completes — no loading indicator, no flicker. Because we only read one directory level this typically finishes in < 1 ms, but moving it off the synchronous call path guarantees the UI thread is never blocked.

---

### Cached tree across panel toggles

Toggling the explorer (`Cmd-B` / command palette) no longer re-scans the filesystem. If the tree has already been scanned it is reused as-is. A fresh scan only happens when:

- The panel is opened **and** `file_tree` is empty (first time).
- An explicit "Refresh Explorer" action is added in the future.

---

### Files changed

| File                               | What changed                                                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/workspace/file_tree.rs`       | Replaced recursive scan with single-level `scan_single_dir`. Added `expand_or_collapse_dir`, `refresh_file_tree`, `HIDDEN_DIRS`.        |
| `src/workspace.rs`                 | Added `loaded_dirs` field. Removed `file_tree_loading`. Constructor starts with empty tree. `ToggleLeftPanel` uses cached tree + async. |
| `src/workspace/render_panels.rs`   | Dir click handler delegates to `expand_or_collapse_dir`. Removed loading indicator.                                                     |
| `src/workspace/command_palette.rs` | `ToggleLeftPanel` palette action uses cached tree + async refresh.                                                                      |
