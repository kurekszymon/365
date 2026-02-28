//! Scrollbar drag state — shared types used by both panel and editor rendering.

// ── Scrollbar types ──────────────────────────────────────────────────────────

#[derive(Clone, Copy)]
pub(crate) enum ScrollbarDragKind {
    EditorVertical,
    EditorHorizontal,
    LeftPanel,
}

#[derive(Clone, Copy)]
pub(crate) struct ScrollbarDragState {
    pub kind: ScrollbarDragKind,
    pub start_mouse: f32,   // mouse position (Y or X) at drag start
    pub start_offset: f32,  // scroll offset at drag start
    pub scroll_per_px: f32, // scroll-offset units per pixel of mouse movement
    pub max_scroll: f32,    // maximum scroll offset (for clamping)
}
