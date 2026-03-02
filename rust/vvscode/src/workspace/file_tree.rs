//! File tree — directory scanning, open/save, and collapse/expand logic.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use gpui::Context;

use super::Workspace;

// ── FsNode ───────────────────────────────────────────────────────────────────

pub(crate) struct FsNode {
    pub display_name: String,
    pub is_dir: bool,
    pub rel_path: Arc<str>,
}

// ── File tree helpers ────────────────────────────────────────────────────────

impl Workspace {
    pub(crate) fn refresh_file_tree(&mut self) {
        self.file_tree = Self::collect_file_tree(Path::new(&self.project_root), "", 0);
        self.left_panel_scroll = 0;
    }

    pub(crate) fn toggle_collapse_all(&mut self) {
        let total_dirs = self.file_tree.iter().filter(|node| node.is_dir).count();

        if self.collapsed_dirs.len() == total_dirs {
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

    /// Return only the entries that are visible (i.e. not hidden under a collapsed directory).
    pub(crate) fn visible_file_tree(&self) -> Vec<&FsNode> {
        let mut result = Vec::new();
        let mut skip_prefix: Option<Arc<str>> = None;

        for node in &self.file_tree {
            // If we are skipping children of a collapsed dir, check whether
            // this entry is still under that prefix.
            if let Some(ref prefix) = skip_prefix {
                let child_prefix = format!("{}/", prefix);
                if node.rel_path.starts_with(&child_prefix) {
                    // This entry (file or dir) is a child of the collapsed dir.
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

    /// Recursively collect directory entries into a flat list for the file explorer.
    pub(crate) fn collect_file_tree(dir: &Path, prefix: &str, depth: usize) -> Vec<FsNode> {
        let indent = "  ".repeat(depth);

        let mut dirs: Vec<_> = Vec::new();
        let mut files: Vec<_> = Vec::new();

        let Ok(read_dir) = std::fs::read_dir(dir) else {
            return Vec::new();
        };

        for entry in read_dir.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
            if is_dir {
                dirs.push(name);
            } else {
                files.push(name);
            }
        }

        dirs.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
        files.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

        let mut result: Vec<FsNode> = Vec::new();

        for d in dirs {
            let display_name = format!("{}{}/", indent, d);
            let child_path = dir.join(&d);
            let rel: Arc<str> = if prefix.is_empty() {
                Arc::from(d)
            } else {
                Arc::from(format!("{}/{}", prefix, d))
            };

            result.push(FsNode {
                display_name,
                is_dir: true,
                rel_path: Arc::clone(&rel),
            });
            let children = Self::collect_file_tree(&child_path, &rel, depth + 1);
            result.extend(children);
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
