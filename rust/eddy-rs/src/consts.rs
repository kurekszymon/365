use std::path::PathBuf;

pub fn eddy_dir() -> PathBuf {
    if let Ok(home) = std::env::var("EDDY_HOME") {
        return PathBuf::from(home).join(".eddy.sh");
    }
    dirs::home_dir()
        .expect("cannot determine home directory")
        .join(".eddy.sh")
}

pub fn eddy_bin_dir() -> PathBuf {
    eddy_dir().join("bin")
}
