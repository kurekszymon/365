mod editor;
mod workspace;

use gpui::{
    App, AppContext, Application, Bounds, KeyBinding, WindowBounds, WindowOptions, px, size,
};
use workspace::{SelectAll, ToggleBottomPanel, ToggleLeftPanel, ToggleRightPanel, Workspace};

// ── Main ─────────────────────────────────────────────────────────────────────

fn main() {
    Application::new().run(|cx: &mut App| {
        cx.bind_keys([
            KeyBinding::new("cmd-b", ToggleLeftPanel, Some("Workspace")),
            KeyBinding::new("cmd-`", ToggleBottomPanel, Some("Workspace")),
            KeyBinding::new("cmd-r", ToggleRightPanel, Some("Workspace")),
            KeyBinding::new("cmd-a", SelectAll, Some("Workspace")),
        ]);

        let bounds = Bounds::centered(None, size(px(1200.), px(800.0)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                ..Default::default()
            },
            |_, cx| cx.new(|cx| Workspace::new(cx)),
        )
        .unwrap();
    });
}
