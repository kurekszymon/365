use std::path::PathBuf;

use crate::{
    shared::base_pkg_name,
    types::{InstallStep, ToolInfo, Version},
};

// Compile-time constants: `const` is evaluated at compile time and inlined wherever
// used. `&'static str` is the type of a string literal — zero allocation, lives forever.
// `#[cfg(target_os = "macos")]` makes this constant only exist in the macOS build.
// `#[cfg(not(target_os = "macos"))]` covers all other platforms.
// Alternative: use a `const fn` or a `match` at runtime if the choice needs more
// than two branches (but two cfg attrs is clear enough here).
#[cfg(target_os = "macos")]
const CMAKE_BIN_PATH: &str = "CMake.app/Contents/bin";
#[cfg(not(target_os = "macos"))]
const CMAKE_BIN_PATH: &str = "bin";

// Synchronous: all information to build ToolInfo is available without I/O.
// Returns ToolInfo directly (not Result) because nothing can fail here.
// This is the right signature — don't add Result just for uniformity.
pub fn build(version: Version) -> ToolInfo {
    // `match &version` — borrow `version` for the match so we can still use it
    // below when constructing ToolInfo. If we wrote `match version` (without &),
    // the enum would be moved into the match and unavailable afterwards.
    let ver = match &version {
        Version::Latest => "latest".to_string(),
        Version::SemVer(s) => s.clone(),
    };
    // Improvement: this pattern (extract a string from Version) is repeated in every
    // cpp builder. It could live on Version itself:
    //   impl Version { fn to_url_segment(&self) -> &str { ... } }
    // Or you could pass &str to the builders and let the caller resolve Version → &str.

    let pkg_name = {
        #[cfg(target_os = "windows")]
        { format!("cmake-{ver}-windows-x86_64.zip") }
        #[cfg(target_os = "macos")]
        { format!("cmake-{ver}-macos-universal.tar.gz") }
        #[cfg(target_os = "linux")]
        { format!("cmake-{ver}-linux-x86_64.tar.gz") }
    };

    // Re-match `&version` to build the URL. The version determines the URL path
    // ("releases/latest" vs "releases/download/vX.Y.Z").
    let url = match &version {
        Version::Latest => format!(
            "https://github.com/Kitware/CMake/releases/latest/download/{pkg_name}"
        ),
        Version::SemVer(v) => format!(
            "https://github.com/Kitware/CMake/releases/download/v{v}/{pkg_name}"
        ),
    };

    // base_pkg_name strips the archive extension to get the extracted directory name.
    // PathBuf::from(...).join(...) chains path segments without string concatenation.
    let custom_bin_path = PathBuf::from(base_pkg_name(&pkg_name)).join(CMAKE_BIN_PATH);

    // Struct literal syntax: all fields must be specified (no partial construction).
    // This is intentional — if you add a field to ToolInfo, every builder becomes
    // a compile error until you fill in the new field.
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
