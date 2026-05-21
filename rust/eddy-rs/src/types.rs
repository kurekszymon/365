use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq)]
pub enum Version {
    Latest,
    SemVer(String),
}

impl Version {
    pub fn as_str(&self) -> &str {
        match self {
            Version::Latest => "latest",
            Version::SemVer(s) => s.as_str(),
        }
    }
}

impl std::fmt::Display for Version {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl From<&str> for Version {
    fn from(s: &str) -> Self {
        if s == "latest" {
            Version::Latest
        } else {
            Version::SemVer(s.to_string())
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum InstallStep {
    Extract,
    Rename,
    Chmod,
}

#[derive(Debug, Clone)]
pub struct ToolInfo {
    pub lang: &'static str,
    pub name: &'static str,
    pub version: Version,
    pub pkg_name: String,
    pub url: String,
    pub custom_bin_path: Option<PathBuf>,
    pub links: Option<Vec<&'static str>>,
    pub steps: Vec<InstallStep>,
}
