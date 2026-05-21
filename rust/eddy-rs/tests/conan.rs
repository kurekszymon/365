mod common;

use eddy_rs::{
    blueprint::ToolBlueprint,
    consts::eddy_bin_dir,
    languages::cpp::conan,
    shared::ensure_tool_dir_check,
    types::Version,
};
use serial_test::serial;

#[test]
#[cfg(target_os = "macos")]
fn checks_pkg_name() {
    let info = conan::build(Version::SemVer("2.23.0".into()));
    // .tgz is a gzip-compressed tar, same as .tar.gz — just a shorter alias.
    // Our base_pkg_name() handles both extensions. Worth testing here because
    // the stripping order in trim_end_matches matters.
    assert_eq!(info.pkg_name, "conan-2.23.0-macos-arm64.tgz");
}

#[test]
fn picks_latest_url() {
    let info = conan::build(Version::Latest);
    assert!(info.url.contains("releases/latest/download/"));
}

#[tokio::test]
#[serial]
async fn downloads_conan() {
    let _guard = common::isolated_eddy_home();
    let info = conan::build(Version::SemVer("2.23.0".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    // Conan URL has no `v` prefix (unlike cmake/ninja).
    assert_eq!(
        info.url,
        format!(
            "https://github.com/conan-io/conan/releases/download/2.23.0/{}",
            info.pkg_name
        )
    );
    let blueprint = ToolBlueprint::new(info.clone());
    blueprint.download().await.unwrap();
    assert!(dir.join(&info.pkg_name).exists());
}

#[tokio::test]
#[serial]
async fn installs_conan() {
    let _guard = common::isolated_eddy_home();
    let info = conan::build(Version::SemVer("2.23.0".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    // Clone before `info` is moved into ToolBlueprint so we can use `custom` in assertions.
    let custom = info.custom_bin_path.clone().unwrap();
    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();
    blueprint.use_tool().unwrap();

    let bin_dir = eddy_bin_dir();
    let link_path = bin_dir.join("conan");
    assert!(link_path.is_symlink());
    let target = std::fs::read_link(&link_path).unwrap();
    // Conan has custom_bin_path = Some("bin"), no links → symlinks dir/bin/conan → bin/conan.
    assert_eq!(target, dir.join(&custom).join(info.name));
}

#[tokio::test]
#[serial]
async fn deletes_conan_installation() {
    let _guard = common::isolated_eddy_home();
    let info = conan::build(Version::SemVer("2.23.0".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    let custom = info.custom_bin_path.clone().unwrap();

    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();
    assert!(dir.join(&custom).join(info.name).exists());
    assert!(dir.join(&info.pkg_name).exists());

    blueprint.delete().await.unwrap();
    assert!(!dir.join(&custom).join(info.name).exists());
    assert!(!dir.join(&info.pkg_name).exists());
}
