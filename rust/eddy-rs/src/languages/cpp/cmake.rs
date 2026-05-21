use std::path::PathBuf;

use crate::{
    shared::base_pkg_name,
    types::{InstallStep, ToolInfo, Version},
};

#[cfg(target_os = "macos")]
const CMAKE_BIN_PATH: &str = "CMake.app/Contents/bin";
#[cfg(not(target_os = "macos"))]
const CMAKE_BIN_PATH: &str = "bin";

pub fn build(version: Version) -> ToolInfo {
    let ver = match &version {
        Version::Latest => "latest".to_string(),
        Version::SemVer(s) => s.clone(),
    };

    let pkg_name = {
        #[cfg(target_os = "windows")]
        { format!("cmake-{ver}-windows-x86_64.zip") }
        #[cfg(target_os = "macos")]
        { format!("cmake-{ver}-macos-universal.tar.gz") }
        #[cfg(target_os = "linux")]
        { format!("cmake-{ver}-linux-x86_64.tar.gz") }
    };

    let url = match &version {
        Version::Latest => format!(
            "https://github.com/Kitware/CMake/releases/latest/download/{pkg_name}"
        ),
        Version::SemVer(v) => format!(
            "https://github.com/Kitware/CMake/releases/download/v{v}/{pkg_name}"
        ),
    };

    let custom_bin_path = PathBuf::from(base_pkg_name(&pkg_name)).join(CMAKE_BIN_PATH);

    ToolInfo {
        lang: "cpp",
        name: "cmake",
        version,
        pkg_name,
        url,
        custom_bin_path: Some(custom_bin_path),
        links: Some(vec!["ccmake", "cmake", "cpack", "ctest"]),
        steps: vec![InstallStep::Extract],
    }
}
