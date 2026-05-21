use tempfile::TempDir;

pub struct EddyHomeGuard {
    _dir: TempDir,
}

impl Drop for EddyHomeGuard {
    fn drop(&mut self) {
        // SAFETY: tests are serialized with #[serial], so no concurrent env access
        unsafe { std::env::remove_var("EDDY_HOME") };
    }
}

pub fn isolated_eddy_home() -> EddyHomeGuard {
    let dir = TempDir::new().expect("tempdir");
    // SAFETY: tests are serialized with #[serial], so no concurrent env access
    unsafe { std::env::set_var("EDDY_HOME", dir.path().to_str().unwrap()) };
    EddyHomeGuard { _dir: dir }
}
