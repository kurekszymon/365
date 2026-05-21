mod common;

use eddy_rs::{
    consts::eddy_bin_dir,
    shared::{download_file, ensure_tool_dir, extract, format_bytes, symlink_bin},
};
use serial_test::serial;
use std::path::Path;

#[tokio::test]
#[serial]
async fn creates_files_in_temp_home() {
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
    .unwrap();

    assert!(file_path.exists());
}

#[test]
#[serial]
fn extracts_archive() {
    let _guard = common::isolated_eddy_home();
    let dir = ensure_tool_dir("extract-test");

    extract(
        Path::new("tests/fixtures/archive.zip"),
        &dir,
    )
    .unwrap();

    let extracted = dir.join("archive.txt");
    assert!(extracted.exists());
    let content = std::fs::read_to_string(&extracted).unwrap();
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
    let real_path = std::fs::read_link(&link_path).unwrap();
    assert_eq!(real_path, file_path);
}

#[test]
fn formats_bytes_correctly() {
    assert_eq!(format_bytes(512), "512 B");
    assert_eq!(format_bytes(1024), "1.0 KB");
    assert_eq!(format_bytes(1536), "1.5 KB");
    assert_eq!(format_bytes(1048576), "1.00 MB");
    assert_eq!(format_bytes(2097152), "2.00 MB");
}
