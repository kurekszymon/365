// `mod common;` loads `tests/common/mod.rs` as a private module of this test binary.
// Each integration test file in `tests/` compiles as its own binary. Unlike unit tests
// (which live inside `src/` in `#[cfg(test)] mod tests`), integration tests only see
// the crate's public API — they import from `eddy_rs::` as an external user would.
mod common;

use eddy_rs::{
    consts::eddy_bin_dir,
    shared::{download_file, ensure_tool_dir, extract, format_bytes, symlink_bin},
};
use serial_test::serial;
use std::path::Path;

// #[tokio::test] is the async equivalent of #[test]. It wraps the test body in a
// tokio runtime, the same way #[tokio::main] wraps main(). Without it, an async
// test function would not be polled and would never actually run.
#[tokio::test]
// #[serial] from the `serial_test` crate forces tests within the same binary to run
// one at a time. Needed here because EDDY_HOME is a process-global env var — if two
// tests ran concurrently, one could read the other's EDDY_HOME value.
// This is the Rust equivalent of Bun's global mock.module("os", ...) affecting all tests.
#[serial]
async fn creates_files_in_temp_home() {
    // `_guard` binds the EddyHomeGuard. The leading `_` prevents "unused variable"
    // warnings while still keeping the guard alive for the duration of the test.
    // If you wrote `let _ = common::isolated_eddy_home();` (binding to `_` not `_guard`),
    // the guard would be dropped *immediately*, nuking the temp dir before the test runs.
    // The difference: `_` = drop now, `_name` = drop at end of scope.
    let _guard = common::isolated_eddy_home();
    let dir = ensure_tool_dir("test");
    assert!(dir.exists());
}

#[tokio::test]
#[serial]
async fn downloads_file() {
    let _guard = common::isolated_eddy_home();
    let dir = ensure_tool_dir("test");
    let file_path = dir.join("Makefile");

    download_file(
        &file_path,
        "https://github.com/kurekszymon/eddy.sh/blob/main/Makefile",
    )
    .await
    // .unwrap() in tests: panics with the error message if Err. This is fine in
    // tests — a panic fails the test with a clear message. In production code,
    // use `?` to propagate the error instead.
    .unwrap();

    assert!(file_path.exists());
}

// Synchronous test (no async): extract() shells out to `tar`, which is synchronous.
// `#[test]` (no tokio) is fine here — we don't need the async runtime.
#[test]
#[serial]
fn extracts_archive() {
    let _guard = common::isolated_eddy_home();
    let dir = ensure_tool_dir("extract-test");

    // Path::new("tests/fixtures/archive.zip") is a relative path. Integration
    // tests in `tests/` are run with the workspace root as the working directory,
    // so this resolves to `<repo-root>/tests/fixtures/archive.zip`.
    extract(
        Path::new("tests/fixtures/archive.zip"),
        &dir,
    )
    .unwrap();

    let extracted = dir.join("archive.txt");
    assert!(extracted.exists());
    // std::fs::read_to_string reads the whole file into a String.
    let content = std::fs::read_to_string(&extracted).unwrap();
    // .trim() removes leading/trailing whitespace (including the trailing newline
    // that many text editors add). Same behavior as TS's .trim().
    assert_eq!(content.trim(), "hello extract");
}

#[test]
#[serial]
fn creates_symlink_pointing_to_correct_file() {
    let _guard = common::isolated_eddy_home();
    let dir = ensure_tool_dir("symlink-test");
    let filename = "dummy.txt";
    let file_path = dir.join(filename);
    std::fs::write(&file_path, "symlink test").unwrap();

    symlink_bin(&dir, filename).unwrap();

    let bin_dir = eddy_bin_dir();
    let link_path = bin_dir.join(filename);
    // read_link returns the path the symlink points to (like readlinkSync in Node).
    let real_path = std::fs::read_link(&link_path).unwrap();
    assert_eq!(real_path, file_path);
}

// No #[serial] here: format_bytes is a pure function with no side effects and no
// process-global state. It can safely run concurrently with other tests.
#[test]
fn formats_bytes_correctly() {
    assert_eq!(format_bytes(512), "512 B");
    assert_eq!(format_bytes(1024), "1.0 KB");
    assert_eq!(format_bytes(1536), "1.5 KB");
    assert_eq!(format_bytes(1048576), "1.00 MB");
    assert_eq!(format_bytes(2097152), "2.00 MB");
}
