use anyhow::Result;
use serde::Deserialize;

use crate::types::{InstallStep, ToolInfo, Version};

#[derive(Deserialize)]
struct GoRelease {
    version: String,
}

pub async fn fetch_latest() -> Result<String> {
    let releases: Vec<GoRelease> = reqwest::Client::builder()
        .use_rustls_tls()
        .build()?
        .get("https://go.dev/dl/?mode=json")
        .send()
        .await?
        .json()
        .await?;
    // strip the leading "go" prefix: "go1.25.5" -> "1.25.5"
    let raw = &releases[0].version;
    let ver = raw.strip_prefix("go").unwrap_or(raw).to_string();
    Ok(ver)
}

pub async fn build(version: Version) -> Result<ToolInfo> {
    let ver = match version {
        Version::Latest => fetch_latest().await?,
        Version::SemVer(ref s) => s.clone(),
    };

    let pkg_name = {
        #[cfg(target_os = "macos")]
        { format!("go{ver}.darwin-arm64.tar.gz") }
        #[cfg(target_os = "windows")]
        { format!("go{ver}.windows-386.zip") }
        #[cfg(target_os = "linux")]
        { format!("go{ver}.linux-amd64.tar.gz") }
    };

    let url = format!("https://go.dev/dl/{pkg_name}");

    Ok(ToolInfo {
        lang: "go",
        name: "go-language",
        version: Version::SemVer(ver),
        pkg_name,
        url,
        custom_bin_path: Some(std::path::PathBuf::from("go/bin")),
        links: Some(vec!["go", "gofmt"]),
        steps: vec![InstallStep::Extract],
    })
}
