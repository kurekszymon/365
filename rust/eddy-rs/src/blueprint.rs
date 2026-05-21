use anyhow::Result;

use crate::{
    shared::{
        chmod_755, download_file, ensure_tool_dir, ensure_tool_dir_check, extract, remove_path,
        rename_dir, resolve_latest_version, symlink_bin,
    },
    types::{InstallStep, ToolInfo, Version},
};

pub struct ToolBlueprint {
    pub info: ToolInfo,
}

impl ToolBlueprint {
    pub fn new(info: ToolInfo) -> Self {
        Self { info }
    }

    pub async fn download(&self) -> Result<std::path::PathBuf> {
        let sub = format!("{}/{}/{}", self.info.lang, self.info.name, self.info.version);
        let dir = ensure_tool_dir(&sub);
        let file_path = dir.join(&self.info.pkg_name);
        download_file(&file_path, &self.info.url).await?;
        Ok(file_path)
    }

    pub async fn install(&mut self) -> Result<()> {
        if self.info.version == Version::Latest {
            let resolved = resolve_latest_version(&self.info.url).await?;
            self.info.version = Version::SemVer(resolved);
        }

        let archive_path = self.download().await?;
        let dir = archive_path.parent().unwrap().to_path_buf();

        for step in &self.info.steps.clone() {
            match step {
                InstallStep::Extract => {
                    extract(&archive_path, &dir)?;
                }
                InstallStep::Rename => {
                    rename_dir(&dir, &self.info.pkg_name, self.info.name)?;
                }
                InstallStep::Chmod => {
                    chmod_755(&dir, self.info.name)?;
                }
            }
        }
        Ok(())
    }

    pub fn use_tool(&self) -> Result<()> {
        let sub = format!("{}/{}/{}", self.info.lang, self.info.name, self.info.version);
        let dir = ensure_tool_dir_check(&sub);

        let bin_dir = if let Some(ref custom) = self.info.custom_bin_path {
            dir.join(custom)
        } else {
            dir.clone()
        };

        if !bin_dir.exists() {
            anyhow::bail!("{}@{} is not installed yet", self.info.name, self.info.version);
        }

        if let Some(ref links) = self.info.links {
            for &link in links {
                symlink_bin(&bin_dir, link)?;
            }
        } else {
            symlink_bin(&bin_dir, self.info.name)?;
        }
        Ok(())
    }

    pub async fn delete(&self) -> Result<()> {
        let sub_dir = format!("{}/{}/{}", self.info.lang, self.info.name, self.info.version);
        let sub_archive = format!("{}/{}/{}", self.info.lang, self.info.name, self.info.pkg_name);

        let dir = ensure_tool_dir_check(&sub_dir);
        let archive = ensure_tool_dir_check(&sub_archive);

        let r1 = remove_path(&archive);
        let r2 = remove_path(&dir);

        if r1.is_err() || r2.is_err() {
            eprintln!("Failed to delete {}@{}", self.info.name, self.info.version);
        } else {
            eprintln!("Successfully deleted {}@{}", self.info.name, self.info.version);
        }
        Ok(())
    }
}
