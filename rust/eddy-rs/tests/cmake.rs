mod common;

use eddy_rs::{
    blueprint::ToolBlueprint,
    consts::eddy_bin_dir,
    languages::cpp::cmake,
    shared::{base_pkg_name, ensure_tool_dir_check},
    types::Version,
};
use serial_test::serial;

#[test]
#[cfg(target_os = "macos")]
fn checks_pkg_name() {
    let info = cmake::build(Version::SemVer("4.1.4".into()));
    assert_eq!(info.pkg_name, "cmake-4.1.4-macos-universal.tar.gz");
}

#[test]
fn picks_latest_url() {
    let info = cmake::build(Version::Latest);
    assert!(info.url.contains("releases/latest/download/"));
}

#[tokio::test]
#[serial]
async fn downloads_cmake() {
    let _guard = common::isolated_eddy_home();
    let info = cmake::build(Version::SemVer("4.1.4".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    assert_eq!(
        info.url,
        format!(
            "https://github.com/Kitware/CMake/releases/download/v4.1.4/{}",
            info.pkg_name
        )
    );
    let blueprint = ToolBlueprint::new(info.clone());
    blueprint.download().await.unwrap();
    assert!(dir.join(&info.pkg_name).exists());
}

#[tokio::test]
#[serial]
async fn installs_cmake() {
    let _guard = common::isolated_eddy_home();
    let info = cmake::build(Version::SemVer("4.1.4".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    let custom = info.custom_bin_path.clone().unwrap();
    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();
    blueprint.use_tool().unwrap();

    let bin_dir = eddy_bin_dir();
    for bin in &["cmake", "cpack", "ctest", "ccmake"] {
        let link_path = bin_dir.join(bin);
        assert!(link_path.is_symlink(), "{bin} should be a symlink");
        let target = std::fs::read_link(&link_path).unwrap();
        assert_eq!(target, dir.join(&custom).join(bin));
    }
}

#[tokio::test]
#[serial]
async fn deletes_cmake_installation() {
    let _guard = common::isolated_eddy_home();
    let info = cmake::build(Version::SemVer("4.1.4".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    let base = base_pkg_name(&info.pkg_name).to_string();

    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();

    assert!(dir.join(&info.pkg_name).exists());
    assert!(dir.join(&base).exists());

    blueprint.delete().await.unwrap();
    assert!(!dir.join(&base).exists());
    assert!(!dir.join(&info.pkg_name).exists());
}
