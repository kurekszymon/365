use crate::types::{InstallStep, ToolInfo, Version};

pub fn build(version: Version) -> ToolInfo {
    let ver = match &version {
        Version::Latest => "latest".to_string(),
        Version::SemVer(s) => s.clone(),
    };

    let pkg_name = {
        #[cfg(target_os = "windows")]
        { format!("bazel-{ver}-windows-x86_64.exe") }
        #[cfg(target_os = "macos")]
        { format!("bazel-{ver}-darwin-arm64") }
        #[cfg(target_os = "linux")]
        { format!("bazel-{ver}-linux-x86_64") }
    };

    // Note: bazel's URL does NOT use a `v` prefix before the version number
    // (unlike cmake and ninja which use `v4.1.4` and `v1.13.2`).
    // This mirrors the TS implementation exactly. Easy to miss — the type system
    // won't catch it, which is why the download tests exist.
    let url = match &version {
        Version::Latest => format!(
            "https://github.com/bazelbuild/bazel/releases/latest/download/{pkg_name}"
        ),
        Version::SemVer(v) => format!(
            "https://github.com/bazelbuild/bazel/releases/download/{v}/{pkg_name}"
        ),
    };

    ToolInfo {
        lang: "cpp",
        name: "bazel",
        version,
        pkg_name,
        url,
        // None means "use the tool directory itself as the bin dir".
        // Option::None is how Rust spells "absence" — there's no null/undefined.
        custom_bin_path: None,
        // None means "symlink using the tool name" (blueprint.rs checks this).
        links: None,
        // Rename: downloaded file is `bazel-X.Y.Z-darwin-arm64`, renamed to `bazel`.
        // Chmod: the binary needs execute permission (not set by GitHub downloads).
        steps: vec![InstallStep::Rename, InstallStep::Chmod],
    }
}
