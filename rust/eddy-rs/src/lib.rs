// lib.rs is the crate root for the library target. Each `pub mod` declaration
// tells the compiler to load and expose a module. The module lives in either:
//   - `src/<name>.rs`  (single file)
//   - `src/<name>/mod.rs`  (directory with a mod.rs)
// `pub` makes the module visible to external crates (including the integration tests
// in `tests/` and the binary in `src/main.rs`, which depends on this library).
// Without `pub`, the module would be private to this crate's library target.
pub mod blueprint;
pub mod consts;
pub mod languages;
pub mod shared;
pub mod types;
