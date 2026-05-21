use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use indicatif::{ProgressBar, ProgressStyle};
use regex::Regex;
use reqwest::Client;

use crate::consts::{eddy_bin_dir, eddy_dir};

pub fn ensure_tool_dir(sub: &str) -> PathBuf {
    let dir = eddy_dir().join(sub);
    if !dir.exists() {
        std::fs::create_dir_all(&dir).expect("failed to create tool dir");
    }
    dir
}

pub fn ensure_tool_dir_check(sub: &str) -> PathBuf {
    eddy_dir().join(sub)
}

pub async fn download_file(file_path: &Path, url: &str) -> Result<()> {
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .use_rustls_tls()
        .build()?;

    let resp = client.get(url).send().await?.error_for_status()?;
    let total = resp.content_length();

    let pb = if let Some(len) = total {
        let bar = ProgressBar::new(len);
        bar.set_style(
            ProgressStyle::with_template(
                "Downloading {msg}: [{bar:25}] {percent}%",
            )
            .unwrap()
            .progress_chars("=> "),
        );
        let name = file_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        bar.set_message(name);
        Some(bar)
    } else {
        None
    };

    let mut dest = tokio::fs::File::create(file_path).await?;
    let mut stream = resp.bytes_stream();

    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        if let Some(ref bar) = pb {
            bar.inc(chunk.len() as u64);
        }
        dest.write_all(&chunk).await?;
    }

    if let Some(bar) = pb {
        bar.finish_and_clear();
    }
    println!();
    Ok(())
}

pub fn extract(archive_path: &Path, out_dir: &Path) -> Result<()> {
    if !out_dir.exists() {
        std::fs::create_dir_all(out_dir)?;
    }
    eprintln!("Extracting {} to {}...", archive_path.display(), out_dir.display());
    let status = std::process::Command::new("tar")
        .args(["-xf", &archive_path.to_string_lossy(), "-C", &out_dir.to_string_lossy()])
        .status()
        .context("failed to run tar")?;
    if !status.success() {
        anyhow::bail!("tar exited with status {}", status);
    }
    Ok(())
}

pub fn symlink_bin(dir: &Path, filename: &str) -> Result<()> {
    let bin_dir = eddy_bin_dir();
    if !bin_dir.exists() {
        std::fs::create_dir_all(&bin_dir)?;
    }
    let target = bin_dir.join(filename);
    if target.exists() || target.is_symlink() {
        std::fs::remove_file(&target)?;
    }
    let src = dir.join(filename);
    #[cfg(unix)]
    std::os::unix::fs::symlink(&src, &target)
        .with_context(|| format!("symlink {} -> {}", src.display(), target.display()))?;
    #[cfg(windows)]
    std::os::windows::fs::symlink_file(&src, &target)
        .with_context(|| format!("symlink {} -> {}", src.display(), target.display()))?;
    Ok(())
}

pub fn chmod_755(dir: &Path, filename: &str) -> Result<()> {
    let bin = dir.join(filename);
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&bin, std::fs::Permissions::from_mode(0o755))
            .with_context(|| format!("chmod 755 {}", bin.display()))?;
    }
    Ok(())
}

pub fn rename_dir(pathname: &Path, old_name: &str, new_name: &str) -> Result<()> {
    let new_path = pathname.join(new_name);
    if new_path.exists() {
        eprintln!("{} already exists; skipping rename", new_path.display());
        return Ok(());
    }
    std::fs::rename(pathname.join(old_name), &new_path)
        .with_context(|| format!("rename {} -> {}", old_name, new_name))?;
    Ok(())
}

pub fn remove_path(path: &Path) -> Result<()> {
    if !path.exists() {
        return Ok(());
    }
    if path.is_dir() {
        std::fs::remove_dir_all(path)?;
    } else {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

pub async fn resolve_latest_version(url: &str) -> Result<String> {
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .use_rustls_tls()
        .build()?;

    let resp = client.head(url).send().await?;
    let location = resp
        .headers()
        .get("location")
        .context("no Location header in HEAD response")?
        .to_str()?;

    let re = Regex::new(r"(\d+\.\d+\.\d+)")?;
    let caps = re.captures(location).context("no semver in redirect URL")?;
    Ok(caps[1].to_string())
}

pub fn format_bytes(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}

pub fn base_pkg_name(pkg_name: &str) -> &str {
    let name = Path::new(pkg_name)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(pkg_name);
    name.trim_end_matches(".tar.gz")
        .trim_end_matches(".zip")
        .trim_end_matches(".tgz")
}
