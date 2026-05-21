use tempfile::TempDir;

// RAII guard pattern (Resource Acquisition Is Initialization):
// The guard owns the TempDir. When the guard is dropped (at end of scope or panic),
// Drop::drop() is called automatically, cleaning up the env var.
// This replaces the TS `afterEach(() => fs.rmSync(tmpDir, ...))` pattern.
// In Rust, cleanup is structural (tied to ownership) rather than registered globally.
pub struct EddyHomeGuard {
    // The leading underscore `_dir` tells the compiler "I know this field is never
    // read; I'm keeping it alive intentionally for its Drop side effect."
    // Without `_`, `dir` would be dropped immediately after `isolated_eddy_home()`
    // returns, nuking the temp directory before the test runs.
    // This is a subtle but important ownership/drop-order detail: values are dropped
    // in reverse declaration order at end of scope.
    _dir: TempDir,
}

impl Drop for EddyHomeGuard {
    fn drop(&mut self) {
        // SAFETY: tests are serialized with #[serial], so no concurrent env access.
        // set_var/remove_var are unsafe in edition 2024 because they mutate process-
        // global state and are not thread-safe. The `unsafe` block documents that we've
        // reasoned about this: #[serial] ensures only one test runs at a time, so there
        // can be no concurrent reads of EDDY_HOME in other threads.
        unsafe { std::env::remove_var("EDDY_HOME") };
    }
}

pub fn isolated_eddy_home() -> EddyHomeGuard {
    let dir = TempDir::new().expect("tempdir");
    // SAFETY: see Drop impl above.
    unsafe { std::env::set_var("EDDY_HOME", dir.path().to_str().unwrap()) };
    // Move `dir` into the guard. The guard is returned to (and owned by) the test.
    // When the test function returns (or panics), the guard is dropped → Drop runs.
    EddyHomeGuard { _dir: dir }
}
