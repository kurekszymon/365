// Path is the borrowed, unsized path type — like &str for strings.
// PathBuf is the owned, heap-allocated path type — like String.
// Function parameters should take &Path (borrowed) when they only need to read;
// return PathBuf (owned) when constructing a new value.
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use indicatif::{ProgressBar, ProgressStyle};
use regex::Regex;
use reqwest::Client;

use crate::consts::{eddy_bin_dir, eddy_dir};

// Takes &str (borrowed slice) not String (owned) — the function only needs to
// read the value, not own it. Callers can pass &str, String, or &String
// interchangeably via deref coercion. This is the idiomatic Rust input convention.
pub fn ensure_tool_dir(sub: &str) -> PathBuf {
    let dir = eddy_dir().join(sub);
    if !dir.exists() {
        // .expect() panics on error. Acceptable in "path setup" code where
        // a failure means the environment is fundamentally broken.
        // Alternative: propagate via Result and let main handle it.
        std::fs::create_dir_all(&dir).expect("failed to create tool dir");
    }
    dir
}

// A "check-only" variant that skips creation. Two functions is cleaner than a
// boolean parameter (boolean params make call sites unreadable: ensure_tool_dir("x", true)).
// Alternative pattern: a builder `ToolDir::new("x").create(true).path()`.
pub fn ensure_tool_dir_check(sub: &str) -> PathBuf {
    eddy_dir().join(sub)
}

// `async fn` returns an `impl Future<Output = Result<()>>`. Nothing happens until
// the caller `.await`s it — Rust futures are lazy (unlike JS Promises which start
// executing immediately on creation).
pub async fn download_file(file_path: &Path, url: &str) -> Result<()> {
    // Builder pattern: configure the client, then `.build()` to finalize.
    // Rust has no named/optional function parameters, so builders are the standard
    // way to express "many optional configuration fields".
    // The `?` at the end of `.build()?` is the error propagation operator:
    // if build() returns Err(e), the function returns Err(e) immediately.
    // It replaces every `try { ... } catch` in TS.
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .use_rustls_tls()
        .build()?;

    // Method chaining with `?` on each step. Each `?` is a potential early return.
    // `error_for_status()` converts a 4xx/5xx response into an Err.
    let resp = client.get(url).send().await?.error_for_status()?;

    // Option<u64>: the server may or may not send Content-Length.
    let total = resp.content_length();

    // `if let Some(len)` unpacks Option — only executes if the value is Some.
    // The whole expression evaluates to Option<ProgressBar>.
    let pb = if let Some(len) = total {
        let bar = ProgressBar::new(len);
        bar.set_style(
            ProgressStyle::with_template(
                "Downloading {msg}: [{bar:25}] {percent}%",
            )
            // .unwrap() is safe here because the template string is a compile-time
            // constant — it can only fail if we typo'd the format string, which
            // we'd catch in tests. Alternative: use a const validated at startup.
            .unwrap()
            .progress_chars("=> "),
        );
        // OsStr::to_string_lossy() handles non-UTF-8 filenames gracefully by
        // replacing invalid bytes with U+FFFD. On macOS/Linux, filenames are
        // arbitrary bytes, not guaranteed UTF-8. The .to_string() call converts
        // the Cow<str> result to an owned String.
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

    // tokio::fs is the async version of std::fs. `.await?` = async equivalent of
    // blocking I/O + error propagation.
    let mut dest = tokio::fs::File::create(file_path).await?;

    // bytes_stream() returns a Stream — the async equivalent of an iterator.
    // Streams are lazy: each chunk is produced on demand.
    let mut stream = resp.bytes_stream();

    // `use` inside a function body: imports are scoped to the block they appear in.
    // This avoids polluting the module namespace for traits only needed here.
    use futures_util::StreamExt;   // brings `.next()` into scope for the stream
    use tokio::io::AsyncWriteExt;  // brings `.write_all()` into scope for the file

    // `while let Some(chunk)` drives the stream: keep consuming until it's exhausted.
    // Each iteration is a `.await` point — the executor can run other tasks while
    // waiting for the next chunk to arrive from the network.
    while let Some(chunk) = stream.next().await {
        // Inner `?`: the chunk itself might be a network error.
        let chunk = chunk?;
        // `if let Some(ref bar)`: `ref` borrows from inside the Option instead of
        // moving out of it. Without `ref`, the match would consume `pb`, but we
        // need it again at `bar.finish_and_clear()` below.
        if let Some(ref bar) = pb {
            // `as u64` is an explicit numeric cast. Unlike TS, Rust never coerces
            // numeric types implicitly. chunk.len() returns usize; bar.inc() wants u64.
            bar.inc(chunk.len() as u64);
        }
        dest.write_all(&chunk).await?;
    }

    if let Some(bar) = pb {
        // Here `pb` is consumed (moved into `bar`) — fine because we no longer need it.
        bar.finish_and_clear();
    }
    println!();
    Ok(())
}

pub fn extract(archive_path: &Path, out_dir: &Path) -> Result<()> {
    if !out_dir.exists() {
        // `?` on a std::io::Error converts it into anyhow::Error automatically
        // because anyhow implements `From<std::io::Error>`.
        std::fs::create_dir_all(out_dir)?;
    }
    eprintln!("Extracting {} to {}...", archive_path.display(), out_dir.display());
    // std::process::Command is the synchronous shell-out API.
    // For this project we shell out to system `tar` (same as the TS version).
    // Alternative: pure-Rust extraction with the `tar` + `flate2` + `zip` crates —
    // more portable (no system tar dependency) but ~200 extra lines for the same behavior.
    let status = std::process::Command::new("tar")
        // to_string_lossy(): Path → OsStr → Cow<str>; tar only accepts str args.
        .args(["-xf", &archive_path.to_string_lossy(), "-C", &out_dir.to_string_lossy()])
        .status()
        // .context("...") attaches a human-readable message to any error that
        // propagates through `?`. Lazy alternative: .with_context(|| format!("..."))
        // avoids allocating the message string if no error occurs.
        .context("failed to run tar")?;
    if !status.success() {
        // anyhow::bail! is a macro that returns Err(anyhow!("...")) immediately.
        // Equivalent to: return Err(anyhow::anyhow!("tar exited with status {}", status));
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
    // `is_symlink()` returns true even for broken symlinks, while `exists()` returns
    // false for broken symlinks. We need both checks to handle the "already symlinked
    // but the target was deleted" case without leaving a dangling link in place.
    if target.exists() || target.is_symlink() {
        std::fs::remove_file(&target)?;
    }
    let src = dir.join(filename);

    // #[cfg(unix)] is a compile-time conditional — the Windows block is not even
    // compiled on Unix, not just dead code. Compare to `process.platform` in TS,
    // which is a runtime check; the wrong branch still compiles and ships.
    // `cfg!(target_os = "macos")` (with !) would be a runtime bool expression.
    // `#[cfg(target_os = "macos")]` (without !) is a compile-time gate.
    #[cfg(unix)]
    std::os::unix::fs::symlink(&src, &target)
        // .with_context(|| ...) uses a closure so the format string is only
        // evaluated if an error actually occurred — avoids the allocation on success.
        .with_context(|| format!("symlink {} -> {}", src.display(), target.display()))?;

    #[cfg(windows)]
    std::os::windows::fs::symlink_file(&src, &target)
        .with_context(|| format!("symlink {} -> {}", src.display(), target.display()))?;

    Ok(())
}

pub fn chmod_755(dir: &Path, filename: &str) -> Result<()> {
    let bin = dir.join(filename);
    // The outer #[cfg(unix)] gates the entire block — on Windows this compiles to
    // an empty function body (Windows has no chmod concept).
    #[cfg(unix)]
    {
        // PermissionsExt is a Unix-only extension trait on std::fs::Permissions.
        // Importing it with `use` here unlocks `.from_mode()` — the method doesn't
        // exist on the type without the trait in scope. This is the "extension trait"
        // pattern: traits add methods to types defined elsewhere.
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
        // Rust has no `try/catch`. Early returns are explicit with `return Ok(())`.
        // The `?` operator is the implicit version of `return Err(...)`.
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
    // A new client with no redirect following — we want to inspect the 302 Location
    // header directly rather than let reqwest follow it automatically.
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .use_rustls_tls()
        .build()?;

    let resp = client.head(url).send().await?;
    let location = resp
        .headers()
        .get("location")
        // .context("...") converts Option → Result by treating None as an error.
        // Equivalent to .ok_or_else(|| anyhow::anyhow!("...")) but more concise.
        .context("no Location header in HEAD response")?
        // HeaderValue → &str can fail if the header contains non-UTF-8 bytes.
        // `?` propagates that error automatically.
        .to_str()?;

    // Regex::new() returns Result because the pattern is a runtime value.
    // If the pattern were a compile-time constant, you'd use `once_cell::sync::Lazy`
    // or Rust 1.80's `std::sync::LazyLock` to compile it once:
    //   static RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(\d+\.\d+\.\d+)").unwrap());
    // For a hot path that's called many times, prefer the static version to avoid
    // re-compiling the regex on every invocation.
    let re = Regex::new(r"(\d+\.\d+\.\d+)")?;
    let caps = re.captures(location).context("no semver in redirect URL")?;
    // caps[1] is the first capture group. Indexing a Captures panics on out-of-bounds
    // but we know group 1 exists because the regex has exactly one group.
    Ok(caps[1].to_string())
}

pub fn format_bytes(bytes: u64) -> String {
    // Rust has no implicit numeric coercions. `bytes as f64` is an explicit widening cast.
    // The `{:.1}` format spec means "one decimal place", same as JS's .toFixed(1).
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}

// Returns &str (a borrow into `pkg_name`), not String (an allocation).
// This works because the returned slice points into the input — the lifetime of
// the &str output is tied to the lifetime of the `pkg_name` input. The full form:
//   fn base_pkg_name<'a>(pkg_name: &'a str) -> &'a str
// Rust infers this ("lifetime elision rule #1: one input ref → output shares its lifetime").
pub fn base_pkg_name(pkg_name: &str) -> &str {
    // Path::new on a &str gives a &Path without any allocation.
    let name = Path::new(pkg_name)
        .file_name()           // → Option<&OsStr>
        .and_then(|s| s.to_str()) // → Option<&str>, None if non-UTF-8
        .unwrap_or(pkg_name);  // fallback to the full input

    // trim_end_matches is applied left-to-right: strip .tar.gz first, then .zip, etc.
    // Note: trim_end_matches strips the suffix repeatedly until it no longer matches,
    // which is fine here because extensions don't nest.
    name.trim_end_matches(".tar.gz")
        .trim_end_matches(".zip")
        .trim_end_matches(".tgz")
}
