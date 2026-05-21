mod common;

use eddy_rs::{
    blueprint::ToolBlueprint,
    consts::eddy_bin_dir,
    languages::cpp::ninja,
    shared::ensure_tool_dir_check,
    types::Version,
};
use serial_test::serial;

#[test]
#[cfg(target_os = "macos")]
fn checks_pkg_name() {
    let info = ninja::build(Version::SemVer("1.13.2".into()));
    assert_eq!(info.pkg_name, "ninja-mac.zip");
}

#[test]
fn picks_latest_url() {
    let info = ninja::build(Version::Latest);
    assert!(info.url.contains("releases/latest/download/"));
}

#[tokio::test]
#[serial]
async fn downloads_ninja() {
    let _guard = common::isolated_eddy_home();
    let info = ninja::build(Version::SemVer("1.13.2".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    assert_eq!(
        info.url,
        format!(
            "https://github.com/ninja-build/ninja/releases/download/v1.13.2/{}",
            info.pkg_name
        )
    );
    let blueprint = ToolBlueprint::new(info.clone());
    blueprint.download().await.unwrap();
    assert!(dir.join(&info.pkg_name).exists());
}

#[tokio::test]
#[serial]
async fn installs_ninja() {
    let _guard = common::isolated_eddy_home();
    let info = ninja::build(Version::SemVer("1.13.2".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();
    blueprint.use_tool().unwrap();

    let bin_dir = eddy_bin_dir();
    let link_path = bin_dir.join("ninja");
    assert!(link_path.is_symlink());
    let target = std::fs::read_link(&link_path).unwrap();
    assert_eq!(target, dir.join(info.name));
}

#[tokio::test]
#[serial]
async fn deletes_ninja_installation() {
    let _guard = common::isolated_eddy_home();
    let info = ninja::build(Version::SemVer("1.13.2".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));

    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();
    assert!(dir.join(info.name).exists());

    blueprint.delete().await.unwrap();
    assert!(!dir.join(info.name).exists());
}
