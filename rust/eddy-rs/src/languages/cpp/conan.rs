use std::path::PathBuf;

use crate::types::{InstallStep, ToolInfo, Version};

pub fn build(version: Version) -> ToolInfo {
    let ver = match &version {
        Version::Latest => "latest".to_string(),
        Version::SemVer(s) => s.clone(),
    };

    let pkg_name = {
        #[cfg(target_os = "windows")]
        { format!("conan-{ver}-windows-x86_64.zip") }
        #[cfg(target_os = "macos")]
        { format!("conan-{ver}-macos-arm64.tgz") }
        #[cfg(target_os = "linux")]
        { format!("conan-{ver}-linux-x86_64.tgz") }
    };

    // Conan's tag does NOT use a `v` prefix (unlike cmake/ninja).
    let url = match &version {
        Version::Latest => format!(
            "https://github.com/conan-io/conan/releases/latest/download/{pkg_name}"
        ),
        Version::SemVer(v) => format!(
            "https://github.com/conan-io/conan/releases/download/{v}/{pkg_name}"
        ),
    };

    ToolInfo {
        lang: "cpp",
        name: "conan",
        version,
        pkg_name,
        url,
        // The conan binary lives inside a `bin/` subdirectory of the extracted archive.
        // PathBuf::from("bin") is just a path value — no filesystem access happens here.
        custom_bin_path: Some(PathBuf::from("bin")),
        // links: None means the symlink uses the tool name ("conan") directly.
        links: None,
        steps: vec![InstallStep::Extract],
    }
}
