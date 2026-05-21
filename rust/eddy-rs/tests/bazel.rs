mod common;

use eddy_rs::{
    blueprint::ToolBlueprint,
    consts::eddy_bin_dir,
    languages::cpp::bazel,
    shared::ensure_tool_dir_check,
    types::Version,
};
use serial_test::serial;

#[test]
#[cfg(target_os = "macos")]
fn checks_pkg_name() {
    let info = bazel::build(Version::SemVer("8.5.0".into()));
    assert_eq!(info.pkg_name, "bazel-8.5.0-darwin-arm64");
}

#[test]
fn picks_latest_url() {
    let info = bazel::build(Version::Latest);
    assert!(info.url.contains("releases/latest/download/"));
}

#[tokio::test]
#[serial]
async fn downloads_bazel() {
    let _guard = common::isolated_eddy_home();
    let info = bazel::build(Version::SemVer("8.5.0".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    // Bazel's download URL has no `v` prefix — assert the exact URL to catch
    // regressions if the URL pattern changes.
    assert_eq!(
        info.url,
        format!(
            "https://github.com/bazelbuild/bazel/releases/download/8.5.0/{}",
            info.pkg_name
        )
    );
    let blueprint = ToolBlueprint::new(info.clone());
    blueprint.download().await.unwrap();
    assert!(dir.join(&info.pkg_name).exists());
}

#[tokio::test]
#[serial]
async fn installs_bazel() {
    let _guard = common::isolated_eddy_home();
    let info = bazel::build(Version::SemVer("8.5.0".into()));
    let dir = ensure_tool_dir_check(&format!(
        "{}/{}/{}",
        info.lang, info.name, info.version
    ));
    let mut blueprint = ToolBlueprint::new(info.clone());
    blueprint.install().await.unwrap();
    blueprint.use_tool().unwrap();

    let bin_dir = eddy_bin_dir();
    // Bazel has no `links` and no `custom_bin_path`, so the symlink is named
    // after the tool ("bazel") and points to `dir/bazel`.
    let link_path = bin_dir.join("bazel");
    assert!(link_path.is_symlink());
    let target = std::fs::read_link(&link_path).unwrap();
    // info.name is &'static str ("bazel"); dir.join(info.name) appends it as a path segment.
    assert_eq!(target, dir.join(info.name));
}

#[tokio::test]
#[serial]
async fn deletes_bazel_installation() {
    let _guard = common::isolated_eddy_home();
    let info = bazel::build(Version::SemVer("8.5.0".into()));
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
