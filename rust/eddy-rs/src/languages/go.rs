use anyhow::Result;
// Deserialize is a serde trait. #[derive(Deserialize)] on a struct auto-generates
// JSON (or any serde-supported format) deserialization code at compile time via a
// proc-macro. No runtime reflection — the code is generated during `cargo build`.
use serde::Deserialize;

use crate::types::{InstallStep, ToolInfo, Version};

// Only the `version` field is needed from the JSON response; serde ignores unknown
// fields by default. The JSON shape is: [{"version":"go1.25.5","stable":true,...}, ...]
#[derive(Deserialize)]
struct GoRelease {
    version: String,
}

pub async fn fetch_latest() -> Result<String> {
    // Method chaining through build → get → send → json:
    // Each step returns a Result or future. `?` propagates any error immediately.
    // `.json::<Vec<GoRelease>>()` deserializes the response body using serde.
    // The turbofish `::<Vec<GoRelease>>` provides the type parameter explicitly;
    // without it the compiler couldn't infer what type to deserialize into.
    let releases: Vec<GoRelease> = reqwest::Client::builder()
        .use_rustls_tls()
        .build()?
        .get("https://go.dev/dl/?mode=json")
        .send()
        .await?
        .json()
        .await?;

    let raw = &releases[0].version; // &String, borrowed from the Vec
    // strip_prefix returns Option<&str>: Some("1.25.5") or None if "go" wasn't there.
    // .unwrap_or(raw) falls back to the full string if the prefix wasn't found.
    // .to_string() converts &str → String (allocates), giving us ownership to return.
    let ver = raw.strip_prefix("go").unwrap_or(raw).to_string();
    Ok(ver)
}

pub async fn build(version: Version) -> Result<ToolInfo> {
    // Destructure the enum to get a plain String version string.
    // `ref s` in the SemVer arm borrows `s` from inside the Version enum
    // rather than moving it out — needed because `version` is moved into
    // the returned ToolInfo below, and we can't partially move an enum.
    let ver = match version {
        Version::Latest => fetch_latest().await?,
        Version::SemVer(ref s) => s.clone(),
    };

    // `#[cfg(target_os = "...")]` gates compilation of the entire expression.
    // Each branch is a separate compile-time world — only one branch exists in
    // the compiled binary. This is unlike `if cfg!(...)` which is a runtime
    // bool and keeps all branches in the binary.
    // The braces `{ ... }` make each cfg-gated section a block expression that
    // evaluates to the inner String. Rust requires all cfg branches to produce
    // the same type.
    let pkg_name = {
        #[cfg(target_os = "macos")]
        { format!("go{ver}.darwin-arm64.tar.gz") }
        #[cfg(target_os = "windows")]
        { format!("go{ver}.windows-386.zip") }
        #[cfg(target_os = "linux")]
        { format!("go{ver}.linux-amd64.tar.gz") }
    };

    // format! is Rust's string interpolation macro. `{pkg_name}` in a format string
    // is equivalent to template literals in TS. The variable name in {} is shorthand
    // for `{0}` where 0 is the positional arg — this is "implicit capture" added in
    // Rust 1.58. It requires the variable to be in scope, not an arbitrary expression.
    let url = format!("https://go.dev/dl/{pkg_name}");

    Ok(ToolInfo {
        lang: "go",
        name: "go-language",
        // Always store the resolved version — never "latest" in the struct.
        // This was a latent bug in the TS version where version could remain "latest"
        // even after resolution. The Rust port fixes it by always wrapping `ver`.
        version: Version::SemVer(ver),
        pkg_name,
        url,
        // std::path::PathBuf::from("go/bin") constructs a relative PathBuf.
        // It's just a value — no filesystem access happens here.
        custom_bin_path: Some(std::path::PathBuf::from("go/bin")),
        // &'static str: string literals live in the binary's read-only data segment.
        links: Some(vec!["go", "gofmt"]),
        steps: vec![InstallStep::Extract],
    })
}
