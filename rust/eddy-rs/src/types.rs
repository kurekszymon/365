// PathBuf is the owned, heap-allocated path type.
// `Path` is the borrowed slice view of it — like String vs &str but for paths.
use std::path::PathBuf;

// #[derive(...)] is a proc-macro that auto-generates trait implementations at compile time.
// Debug  → enables {:?} formatting (like JSON.stringify for debugging)
// Clone  → enables .clone() (explicit deep copy; there is no implicit copy for heap types)
// PartialEq → enables == and != (like implementing equals() in Java)
// No `Copy` here because Version contains a String, which is heap-allocated and
// cannot be trivially bitwise-copied. If all fields were Copy (e.g. u32, bool),
// you could add Copy and .clone() would become implicit.
#[derive(Debug, Clone, PartialEq)]
pub enum Version {
    Latest,
    // Enum variants can carry data — SemVer wraps an owned String.
    // This is the Rust answer to TypeScript's `'latest' | semver` union type.
    // The key upgrade: `match` on an enum is exhaustive — add a variant and
    // every match site that misses it is a compile error.
    SemVer(String),
}

// `impl Type` adds methods to a type (called an "inherent impl").
// This is different from `impl Trait for Type`, which satisfies a trait contract.
impl Version {
    // &self = immutable borrow of the receiver; we don't need to consume or mutate it.
    // Return type is &str — a borrowed string slice, not an owned String.
    // The lifetime is elided here; the full form is: fn as_str<'a>(&'a self) -> &'a str
    // meaning: the returned &str lives as long as the &self borrow does.
    pub fn as_str(&self) -> &str {
        match self {
            Version::Latest => "latest",
            // s is a &String here; .as_str() gives &str.
            // You could also write s.as_str() as &**s (deref coercion) but as_str() is clearer.
            Version::SemVer(s) => s.as_str(),
        }
    }
}

// Display is the standard "user-facing" formatting trait, used by println!("{}", x),
// format!(), and to_string(). Implementing it gives you .to_string() for free via
// the blanket `impl<T: Display> ToString for T` in std.
// Contrast with Debug (for developers, {:?}) and Display (for users, {}).
impl std::fmt::Display for Version {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // We delegate to as_str() to avoid duplicating the match.
        // write! to a Formatter is how all Display impls work — it's the same
        // machinery that println! uses internally.
        write!(f, "{}", self.as_str())
    }
}

// From<T> is the canonical conversion trait. Implementing From<&str> for Version
// automatically gives you Into<Version> for &str via a blanket impl in std:
//   `impl<T, U: From<T>> Into<U> for T`
// So callers can write either `Version::from("1.2.3")` or `"1.2.3".into()`.
// Convention: prefer From on the destination type, use Into at call sites for ergonomics.
impl From<&str> for Version {
    fn from(s: &str) -> Self {
        if s == "latest" {
            Version::Latest
        } else {
            // .to_string() allocates a new String from a &str.
            // Alternative: s.to_owned() — identical here, but semantically
            // "I want ownership of this borrowed data".
            Version::SemVer(s.to_string())
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum InstallStep {
    // No data payloads needed — these are pure tags, like TS's string literal union.
    // But unlike TS string unions, adding Extract2 here would force every `match`
    // site that handles InstallStep to add an arm — caught at compile time.
    Extract,
    Rename,
    Chmod,
}

// `pub struct` makes the type public. Fields are private by default unless also `pub`.
// Making all fields pub is fine for a plain data struct with no invariants to protect.
// If you wanted to enforce invariants (e.g. "version is never Latest after install"),
// you'd make the fields private and expose them through methods.
#[derive(Debug, Clone)]
pub struct ToolInfo {
    // &'static str is a string literal baked into the binary — zero allocation,
    // lives forever. It's fine here because all our tool names are compile-time
    // constants ("go", "cpp", "cmake" …). If the name came from user input at
    // runtime, this would need to be String instead.
    pub lang: &'static str,
    pub name: &'static str,

    // Owned Version — this struct is the sole owner.
    pub version: Version,

    // pkg_name and url are computed at runtime from the version, so they're
    // owned Strings (heap-allocated, variable length).
    pub pkg_name: String,
    pub url: String,

    // Option<T> is Rust's null-safety type. There is no null/undefined in Rust.
    // Option::None is the explicit "absence" value; Option::Some(x) wraps a value.
    // This forces every caller to handle both cases rather than accidentally
    // dereferencing null. Equivalent of TypeScript's `customBinPath?: PathBuf`.
    pub custom_bin_path: Option<PathBuf>,

    // Option<Vec<&'static str>>: either no links, or a list of binary names.
    // Vec<&'static str> instead of Vec<String> because the link names ("go", "gofmt")
    // are all compile-time string literals. If they were dynamic, use Vec<String>.
    pub links: Option<Vec<&'static str>>,

    pub steps: Vec<InstallStep>,
}
