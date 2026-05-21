use anyhow::Result;
use clap::{Parser, Subcommand};
use eddy_rs::{blueprint::ToolBlueprint, languages, types::Version};

#[derive(Parser)]
#[command(name = "eddy", version = "0.1.0", about = "CLI to install self-contained toolchains")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
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

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Install { tool, version } => {
            let ver: Version = version.as_str().into();
            let info = languages::build(&tool, ver).await?;
            let mut blueprint = ToolBlueprint::new(info);
            blueprint.install().await?;
        }
        Commands::Use { tool, version } => {
            let ver: Version = version.as_str().into();
            let info = languages::build(&tool, ver).await?;
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

    Ok(())
}
