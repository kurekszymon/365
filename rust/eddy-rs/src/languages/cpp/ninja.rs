use crate::types::{InstallStep, ToolInfo, Version};

pub fn build(version: Version) -> ToolInfo {
    let pkg_name = {
        #[cfg(target_os = "windows")]
        { "ninja-win.zip".to_string() }
        #[cfg(target_os = "macos")]
        { "ninja-mac.zip".to_string() }
        #[cfg(target_os = "linux")]
        { "ninja-linux.zip".to_string() }
    };

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
        steps: vec![InstallStep::Extract],
    }
}
