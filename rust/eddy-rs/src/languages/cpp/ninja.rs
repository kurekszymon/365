use crate::types::{InstallStep, ToolInfo, Version};

pub fn build(version: Version) -> ToolInfo {
    // Ninja's package name doesn't include the version number — it's always
    // "ninja-mac.zip" regardless of which version is requested. The version
    // only appears in the URL path. This is why pkg_name doesn't need `ver`.
    let pkg_name = {
        #[cfg(target_os = "windows")]
        { "ninja-win.zip".to_string() }
        #[cfg(target_os = "macos")]
        { "ninja-mac.zip".to_string() }
        #[cfg(target_os = "linux")]
        { "ninja-linux.zip".to_string() }
    };
    // `.to_string()` on a string literal allocates a new String on the heap.
    // Alternative: if pkg_name were always `&'static str`, you could skip the allocation.
    // But ToolInfo.pkg_name is String (owned), so we have to allocate here anyway.

    // Ninja uses a `v` prefix in its tag (v1.13.2), unlike bazel which doesn't.
    let url = match &version {
        Version::Latest => format!(
            "https://github.com/ninja-build/ninja/releases/latest/download/{pkg_name}"
        ),
        Version::SemVer(v) => format!(
            "https://github.com/ninja-build/ninja/releases/download/v{v}/{pkg_name}"
        ),
    };

    ToolInfo {
        lang: "cpp",
        name: "ninja",
        version,
        pkg_name,
        url,
        custom_bin_path: None,
        links: None,
        // Extract only: the zip contains a single `ninja` executable at the root.
        steps: vec![InstallStep::Extract],
    }
}
