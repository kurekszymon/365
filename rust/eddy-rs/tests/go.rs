mod common;

use eddy_rs::{
    blueprint::ToolBlueprint,
    consts::eddy_bin_dir,
    languages::go,
    shared::ensure_tool_dir_check,
    types::Version,
};
use serial_test::serial;

// #[cfg(target_os = "macos")] on a test function: the test is compiled and run only
// on macOS. On Linux/Windows it's as if the function doesn't exist — cargo test
// won't even show it in output. Compare to TS's `test.if(process.platform === 'darwin')`,
// which keeps the test in the binary but skips it at runtime.
// The Rust approach has no runtime overhead and makes platform-specific tests explicit.
#[tokio::test]
#[serial]
#[cfg(target_os = "macos")]
async fn checks_pkg_name() {
    // "1.25.5".into() calls Version::from("1.25.5") via the blanket Into impl.
    // The type of the argument (Version) is inferred from go::build's signature.
    let info = go::build(Version::SemVer("1.25.5".into())).await.unwrap();
    assert_eq!(info.pkg_name, "go1.25.5.darwin-arm64.tar.gz");
}

#[tokio::test]
#[serial]
async fn checks_url() {
    let info = go::build(Version::SemVer("1.25.5".into())).await.unwrap();
    assert_eq!(info.url, format!("https://go.dev/dl/{}", info.pkg_name));
}

#[tokio::test]
#[serial]
async fn downloads_go() {
    let _guard = common::isolated_eddy_home();
    let info = go::build(Version::SemVer("1.25.5".into())).await.unwrap();
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    // info.clone() is needed because `info` is moved into ToolBlueprint::new below,
    // but we still need `info.pkg_name` afterwards for the assertion.
    // Alternative: restructure so assertions come before the move, or keep a reference
    // to pkg_name. Clone is the pragmatic choice in tests.
    let blueprint = ToolBlueprint::new(info.clone());
    blueprint.download().await.unwrap();
    assert!(dir.join(&info.pkg_name).exists());
}

#[tokio::test]
#[serial]
async fn installs_go() {
    let _guard = common::isolated_eddy_home();
    let info = go::build(Version::SemVer("1.25.5".into())).await.unwrap();
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    // `mut` is required because install() takes &mut self.
    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();
    blueprint.use_tool().unwrap();

    let bin_dir = eddy_bin_dir();
    let go_link = bin_dir.join("go");
    let fmt_link = bin_dir.join("gofmt");

    // is_symlink() checks metadata without following the link.
    // exists() follows the link — would return false for a broken symlink.
    assert!(go_link.is_symlink());
    assert!(fmt_link.is_symlink());

    let go_target = std::fs::read_link(&go_link).unwrap();
    let fmt_target = std::fs::read_link(&fmt_link).unwrap();

    // as_ref() converts &Option<PathBuf> to Option<&PathBuf>.
    // .unwrap() extracts the &PathBuf, panicking if None.
    let custom = info.custom_bin_path.as_ref().unwrap();
    assert_eq!(go_target, dir.join(custom).join("go"));
    assert_eq!(fmt_target, dir.join(custom).join("gofmt"));
}

#[tokio::test]
#[serial]
async fn deletes_go_installation() {
    let _guard = common::isolated_eddy_home();
    let info = go::build(Version::SemVer("1.25.5".into())).await.unwrap();
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    // .clone() here because `custom` is used after `info` is moved into ToolBlueprint.
    let custom = info.custom_bin_path.clone().unwrap();

    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();

    assert!(dir.join(&custom).exists());
    assert!(dir.join(&info.pkg_name).exists());

    blueprint.delete().await.unwrap();
    assert!(!dir.join(&custom).exists());
    assert!(!dir.join(&info.pkg_name).exists());
}
