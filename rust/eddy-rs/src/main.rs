use anyhow::Result;
use clap::{Parser, Subcommand};
// The binary (`src/main.rs`) links against the library (`src/lib.rs`) by its crate name.
// The crate name is "eddy-rs" in Cargo.toml but Rust normalizes hyphens to underscores.
use eddy_rs::{blueprint::ToolBlueprint, languages, types::Version};

// #[derive(Parser)] is a proc-macro from the `clap` crate. At compile time it reads
// the struct definition and generates all CLI parsing boilerplate:
//   - --help output from doc comments and #[command(...)] attributes
//   - argument parsing from field names and types
//   - error messages for missing/invalid arguments
// This replaces ~50 lines of manual commander setup from the TS version.
#[derive(Parser)]
#[command(name = "eddy", version = "0.1.0", about = "CLI to install self-contained toolchains")]
struct Cli {
    // A nested enum tagged with #[command(subcommand)] becomes subcommand dispatch.
    // clap maps the variant name to the CLI subcommand name (Install → "install").
    #[command(subcommand)]
    command: Commands,
}

// #[derive(Subcommand)] generates subcommand routing. Each variant is a subcommand.
// Struct-like variants (`Install { tool: String, version: String }`) give you named
// positional arguments. The field names become the argument names in --help.
#[derive(Subcommand)]
enum Commands {
    // `///` doc comments on variants become the subcommand description in --help.
    // This is the same slot as `.description(...)` in commander.
    /// Install a tool at a specific version (or latest)
    Install {
        tool: String,
        version: String,
    },
    /// Symlink an installed tool version into PATH
    Use {
        tool: String,
        version: String,
    },
    /// Delete an installed tool version
    Delete {
        tool: String,
        version: String,
    },
}

// #[tokio::main] is a proc-macro that wraps the async main function in a tokio
// runtime. It expands roughly to:
//   fn main() { tokio::runtime::Builder::new_multi_thread().enable_all().build()
//                  .unwrap().block_on(async { ... }) }
// Rust has no built-in async runtime — tokio provides the executor, I/O reactor,
// and timer. `#[tokio::main]` is the standard entry point for tokio apps.
#[tokio::main]
async fn main() -> Result<()> {
    // clap::Parser::parse() reads std::env::args(), matches them against the
    // derived schema, and either returns a populated `Cli` or exits with a
    // help/error message. No manual argv parsing needed.
    let cli = Cli::parse();

    // Pattern matching on the enum consumes `cli.command`, binding the fields.
    // This is a destructuring assignment: `tool` and `version` are moved out
    // of the enum variant and become local variables.
    match cli.command {
        Commands::Install { tool, version } => {
            // `.into()` calls `Version::from(&str)` via the blanket impl.
            // The type annotation `Version` on the left drives which `Into` impl
            // is selected — without it, the compiler can't resolve the ambiguity.
            let ver: Version = version.as_str().into();
            let info = languages::build(&tool, ver).await?;
            // `mut` is required because `install()` takes `&mut self`.
            let mut blueprint = ToolBlueprint::new(info);
            blueprint.install().await?;
        }
        Commands::Use { tool, version } => {
            let ver: Version = version.as_str().into();
            let info = languages::build(&tool, ver).await?;
            // No `mut` needed: use_tool() takes `&self` (immutable borrow).
            let blueprint = ToolBlueprint::new(info);
            blueprint.use_tool()?;
        }
        Commands::Delete { tool, version } => {
            let ver: Version = version.as_str().into();
            let info = languages::build(&tool, ver).await?;
            let blueprint = ToolBlueprint::new(info);
            blueprint.delete().await?;
        }
    }

    // Explicit Ok(()) at the end: `main` returns `Result<()>`, and the last
    // expression (without a semicolon) is the return value. The `()` type is
    // Rust's unit type — equivalent to `void` in TS, used when there's no
    // meaningful return value.
    Ok(())
}
