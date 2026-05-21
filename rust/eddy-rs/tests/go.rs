mod common;

use eddy_rs::{
    blueprint::ToolBlueprint,
    consts::eddy_bin_dir,
    languages::go,
    shared::ensure_tool_dir_check,
    types::Version,
};
use serial_test::serial;

#[tokio::test]
#[serial]
#[cfg(target_os = "macos")]
async fn checks_pkg_name() {
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
    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();
    blueprint.use_tool().unwrap();

    let bin_dir = eddy_bin_dir();
    let go_link = bin_dir.join("go");
    let fmt_link = bin_dir.join("gofmt");

    assert!(go_link.is_symlink());
    assert!(fmt_link.is_symlink());

    let go_target = std::fs::read_link(&go_link).unwrap();
    let fmt_target = std::fs::read_link(&fmt_link).unwrap();

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
    let custom = info.custom_bin_path.clone().unwrap();

    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();

    assert!(dir.join(&custom).exists());
    assert!(dir.join(&info.pkg_name).exists());

    blueprint.delete().await.unwrap();
    assert!(!dir.join(&custom).exists());
    assert!(!dir.join(&info.pkg_name).exists());
}
