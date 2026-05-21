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
        custom_bin_path: Some(PathBuf::from("bin")),
        links: None,
        steps: vec![InstallStep::Extract],
    }
}
