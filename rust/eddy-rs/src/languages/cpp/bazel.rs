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
        custom_bin_path: None,
        links: None,
        steps: vec![InstallStep::Rename, InstallStep::Chmod],
    }
}
