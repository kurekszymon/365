//! File tree — directory scanning, open/save, and collapse/expand logic.
//!
//! ## Performance
//!
//! 1. **Off-main-thread scan** — [`refresh_file_tree`] launches the
//!    root-level listing via `cx.spawn` so the UI thread is never blocked.
//!    The panel stays hidden until the listing arrives.
//!
//! 2. **Lazy expansion** — only the immediate children of a directory are
//!    scanned when the user first expands it.  Unexpanded directories are
//!    never touched on disk.  This mirrors VS Code's explorer behaviour.
//!
//! 3. **Hidden directories** — `.git` is unconditionally hidden (see
//!    [`HIDDEN_DIRS`]).  Everything else — `node_modules`, `target`, etc. —
//!    is shown but starts collapsed, so it costs nothing until expanded.
//!
//! 4. **Cached tree across panel toggles** — toggling the explorer panel does
//!    not re-scan the filesystem; the cached tree is reused.  Call
//!    [`refresh_file_tree`] to force a re-scan.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use gpui::Context;

use super::Workspace;

// ── Constants ────────────────────────────────────────────────────────────────

/// Directories that are unconditionally hidden from the file explorer.
/// Everything else (node_modules, target, …) is shown but starts collapsed.
const HIDDEN_DIRS: &[&str] = &[".git"];

// ── FsNode ───────────────────────────────────────────────────────────────────

pub(crate) struct FsNode {
    pub display_name: String,
    pub is_dir: bool,
    pub rel_path: Arc<str>,
}

// ── File tree helpers ────────────────────────────────────────────────────────

impl Workspace {
    // ── Refresh ──────────────────────────────────────────────────────────

    /// Scan the project root off the main thread via `cx.spawn`.
    ///
    /// Preserves the user's expand/collapse state: directories that were
    /// expanded before the refresh are re-expanded (and their children
    /// re-scanned) automatically.  New directories default to collapsed.
    pub(crate) fn refresh_file_tree(&mut self, cx: &mut Context<Self>) {
        // Snapshot which directories were expanded (i.e. loaded but NOT collapsed).
        let previously_expanded: HashSet<Arc<str>> = self
            .loaded_dirs
            .iter()
            .filter(|d| !self.collapsed_dirs.contains(*d))
            .cloned()
            .collect();

        self.file_tree.clear();
        self.loaded_dirs.clear();
        self.collapsed_dirs.clear();
        let root = self.project_root.clone();

        cx.spawn(async move |this, cx| {
            let tree = Workspace::scan_single_dir(Path::new(&root), "", 0);

            let _ = this.update(cx, |ws, cx| {
                ws.file_tree = tree;

                // Default-collapse every root directory.
                for node in &ws.file_tree {
                    if node.is_dir {
                        ws.collapsed_dirs.insert(Arc::clone(&node.rel_path));
                    }
                }

                // Re-expand directories that were open before the refresh.
                // This triggers lazy-load scanning for each, rebuilding
                // their children in the flat list.
                let to_expand: Vec<Arc<str>> = previously_expanded
                    .iter()
                    .cloned()
                    .collect();
                for dir in to_expand {
                    ws.expand_or_collapse_dir(&dir);
                }

                ws.left_panel_visible = true;
                cx.notify();
            });
        })
        .detach();
    }

    // ── Lazy expand / collapse ───────────────────────────────────────────

    /// Toggle a directory open or closed.
    ///
    /// On first expansion the directory's immediate children are scanned from
    /// disk and spliced into the flat `file_tree` list.  Subsequent
    /// expand/collapse cycles reuse the cached entries.
    pub(crate) fn expand_or_collapse_dir(&mut self, rel_path: &Arc<str>) {
        if self.collapsed_dirs.contains(rel_path) {
            // ── Expand ───────────────────────────────────────────────
            self.collapsed_dirs.remove(rel_path);

            if !self.loaded_dirs.contains(rel_path) {
                let full_path = PathBuf::from(&self.project_root).join(&**rel_path);
                let depth = rel_path.matches('/').count() + 1;
                let children = Self::scan_single_dir(&full_path, rel_path, depth);

                // New child directories start collapsed.
                for child in &children {
                    if child.is_dir {
                        self.collapsed_dirs.insert(Arc::clone(&child.rel_path));
                    }
                }

                // Splice right after the directory entry in the flat list.
                if let Some(idx) =
                    self.file_tree.iter().position(|n| n.rel_path == *rel_path)
                {
                    self.file_tree.splice(idx + 1..idx + 1, children);
                }

                self.loaded_dirs.insert(Arc::clone(rel_path));
            }
        } else {
            // ── Collapse ─────────────────────────────────────────────
            self.collapsed_dirs.insert(Arc::clone(rel_path));
        }
    }

    // ── Collapse / expand all ────────────────────────────────────────────

    pub(crate) fn toggle_collapse_all(&mut self) {
        let total_dirs = self.file_tree.iter().filter(|n| n.is_dir).count();

        if self.collapsed_dirs.len() == total_dirs {
            // Expand all *loaded* directories — we intentionally do not
            // trigger new scans here to preserve the lazy-loading benefit.
            self.collapsed_dirs.clear();
        } else {
            for node in &self.file_tree {
                if node.is_dir {
                    self.collapsed_dirs.insert(Arc::clone(&node.rel_path));
                }
            }
        }

        self.left_panel_scroll = 0;
    }

    // ── Visibility filter ────────────────────────────────────────────────

    /// Return only the entries that are visible (i.e. not hidden under a
    /// collapsed directory).
    pub(crate) fn visible_file_tree(&self) -> Vec<&FsNode> {
        let mut result = Vec::new();
        let mut skip_prefix: Option<Arc<str>> = None;

        for node in &self.file_tree {
            // If we are skipping children of a collapsed dir, check whether
            // this entry is still under that prefix.
            if let Some(ref prefix) = skip_prefix {
                let child_prefix = format!("{}/", prefix);
                if node.rel_path.starts_with(&child_prefix) {
                    continue;
                }
                // We've left the collapsed subtree.
                skip_prefix = None;
            }

            result.push(node);

            // If this is a collapsed directory, start skipping its children.
            if node.is_dir && self.collapsed_dirs.contains(&node.rel_path) {
                skip_prefix = Some(Arc::clone(&node.rel_path));
            }
        }

        result
    }

    // ── Single-level directory scanner ───────────────────────────────────

    /// Read **one** directory level and return sorted [`FsNode`] entries.
    ///
    /// Directories listed in [`IGNORED_DIRS`] are silently skipped.
    /// No recursive descent — children are loaded lazily via
    /// [`expand_or_collapse_dir`](Self::expand_or_collapse_dir).
    pub(crate) fn scan_single_dir(dir: &Path, prefix: &str, depth: usize) -> Vec<FsNode> {
        let indent = "  ".repeat(depth);

        let Ok(read_dir) = std::fs::read_dir(dir) else {
            return Vec::new();
        };

        let mut dirs: Vec<String> = Vec::new();
        let mut files: Vec<String> = Vec::new();

        for entry in read_dir.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);

            if is_dir {
                if !HIDDEN_DIRS.contains(&name.as_str()) {
                    dirs.push(name);
                }
            } else {
                files.push(name);
            }
        }

        dirs.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
        files.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

        let mut result = Vec::with_capacity(dirs.len() + files.len());

        for d in dirs {
            let display_name = format!("{}{}/", indent, d);
            let rel: Arc<str> = if prefix.is_empty() {
                Arc::from(d)
            } else {
                Arc::from(format!("{}/{}", prefix, d))
            };

            result.push(FsNode {
                display_name,
                is_dir: true,
                rel_path: rel,
            });
            // No recursive descent — lazy expansion handles children.
        }

        for f in files {
            let rel_path: Arc<str> = if prefix.is_empty() {
                Arc::from(f.as_str())
            } else {
                Arc::from(format!("{}/{}", prefix, f))
            };
            result.push(FsNode {
                display_name: format!("{}{}", indent, f),
                is_dir: false,
                rel_path,
            });
        }

        result
    }

    // ── Open / Save ──────────────────────────────────────────────────────

    pub(crate) fn open_file(&mut self, relative_path: &str) {
        let full_path = std::path::PathBuf::from(&self.project_root).join(relative_path);

        match std::fs::read_to_string(&full_path) {
            Ok(content) => {
                self.editor.load_text(&content);
                self.current_file = Some(relative_path.to_string());
                self.dirty = false;
            }
            Err(e) => {
                self.editor
                    .load_text(&format!("Error opening {}: {}", relative_path, e));
                self.current_file = Some(relative_path.to_string());
                self.dirty = false;
            }
        }
    }

    pub(crate) fn save_file(&mut self, cx: &mut Context<Self>) {
        if let Some(relative_path) = self.current_file.clone() {
            // Known file — write directly
            let full_path = PathBuf::from(&self.project_root).join(&relative_path);
            let content: String = self.editor.rope.to_string();
            match std::fs::write(&full_path, &content) {
                Ok(_) => self.dirty = false,
                Err(e) => eprintln!("Error saving {}: {}", relative_path, e),
            }
        } else {
            // Untitled / new file — show native Save dialog
            let directory = PathBuf::from(&self.project_root);
            let receiver = cx.prompt_for_new_path(&directory, Some("untitled"));
            let content: String = self.editor.rope.to_string();

            cx.spawn(async move |this, cx| {
                if let Ok(Ok(Some(path))) = receiver.await {
                    let _ = this.update(cx, |workspace, cx| {
                        match std::fs::write(&path, &content) {
                            Ok(_) => {
                                // Derive a display name from the chosen path
                                let display = path
                                    .file_name()
                                    .map(|n| n.to_string_lossy().to_string())
                                    .unwrap_or_else(|| path.to_string_lossy().to_string());
                                workspace.current_file = Some(display);
                                workspace.dirty = false;
                                workspace.refresh_file_tree(cx);
                            }
                            Err(e) => eprintln!("Error saving {:?}: {}", path, e),
                        }
                        cx.notify();
                    });
                }
            })
            .detach();
        }
    }
}
