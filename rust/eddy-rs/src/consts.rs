use std::path::PathBuf;

// Returns PathBuf (owned) not &Path (borrowed) because the value is constructed
// here — there's no pre-existing allocation to borrow from. The caller becomes
// the owner. This is the rule of thumb: if you're building the value, return it owned.
pub fn eddy_dir() -> PathBuf {
    // `if let Ok(home)` is pattern-matching on Result<String, VarError>.
    // It's equivalent to: if the variant is Ok, bind its contents to `home`.
    // This is more idiomatic than .is_ok() + .unwrap() because it can't panic —
    // we only enter the branch when the value is actually there.
    if let Ok(home) = std::env::var("EDDY_HOME") {
        // PathBuf::from converts the String into a PathBuf.
        // .join() appends a path segment and returns a new PathBuf.
        // This is how we avoid string concatenation with "/" for paths.
        return PathBuf::from(home).join(".eddy.sh");
    }

    // dirs::home_dir() returns Option<PathBuf>.
    // .expect(msg) panics with `msg` if the value is None.
    // Using .expect() here (not ?) because this function returns PathBuf, not Result.
    // In a production tool you'd plumb this through anyhow::Result instead.
    // Improvement: change signature to `fn eddy_dir() -> anyhow::Result<PathBuf>`
    // and replace .expect() with .context("...").ok_or_else(|| anyhow!("..."))?.
    dirs::home_dir()
        .expect("cannot determine home directory")
        .join(".eddy.sh")
}

pub fn eddy_bin_dir() -> PathBuf {
    // Calls eddy_dir() and appends "bin". Each call recomputes the path.
    // Improvement: if this is called in hot loops, compute once and cache with
    // std::sync::OnceLock or the `once_cell` crate. Not needed here.
    eddy_dir().join("bin")
}
