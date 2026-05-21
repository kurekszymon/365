// Each `pub mod` declaration here loads the sub-module and re-exports it.
// The directory structure mirrors the module tree:
//   src/languages/mod.rs      → crate::languages
//   src/languages/go.rs       → crate::languages::go
//   src/languages/cpp/mod.rs  → crate::languages::cpp
pub mod cpp;
pub mod go;

use anyhow::Result;

use crate::types::{ToolInfo, Version};

// `build` is the registry dispatch function — the equivalent of `languages[tool](version)`
// from the TS index. It's async because `go::build` may need to fetch the latest version.
// The cpp builders are synchronous; wrapping them in `Ok(...)` lifts their return type
// into `Result<ToolInfo>` to match the async arm.
pub async fn build(tool: &str, version: Version) -> Result<ToolInfo> {
    // String patterns in `match` work on &str. The compiler checks that the arms
    // cover all specified cases — but it can't verify completeness for strings
    // (unlike enum variants, which are exhaustive). The catch-all `other` arm
    // handles any unknown tool name.
    match tool {
        "go" => go::build(version).await,
        // `Ok(...)` wraps the synchronous Result-free value into the Result type
        // expected by the async match arm. This is the "lift into context" pattern.
        "cmake" => Ok(cpp::cmake::build(version)),
        "bazel" => Ok(cpp::bazel::build(version)),
        "ninja" => Ok(cpp::ninja::build(version)),
        "conan" => Ok(cpp::conan::build(version)),
        // `other` binds the unmatched value — useful for the error message.
        // Alternative: use `_` if you don't need the value.
        other => anyhow::bail!("unknown tool: {other}"),
    }
}
