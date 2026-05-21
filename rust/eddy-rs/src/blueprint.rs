use anyhow::Result;

use crate::{
    shared::{
        chmod_755, download_file, ensure_tool_dir, ensure_tool_dir_check, extract, remove_path,
        rename_dir, resolve_latest_version, symlink_bin,
    },
    types::{InstallStep, ToolInfo, Version},
};

pub struct ToolBlueprint {
    // `pub` on the field makes it readable from outside the module.
    // Improvement: make `info` private (`info: ToolInfo`) and expose only what
    // callers need via methods. Right now tests poke into `info` directly, which
    // couples them to the struct's internals.
    pub info: ToolInfo,
}

impl ToolBlueprint {
    // Associated function (no `self`) — equivalent to a static method / constructor.
    // `Self` refers to the type being implemented (`ToolBlueprint`), so if you rename
    // the struct, this line doesn't need to change.
    pub fn new(info: ToolInfo) -> Self {
        // Field init shorthand: `{ info }` is short for `{ info: info }`.
        // Identical to ES2015 shorthand property notation in TypeScript.
        Self { info }
    }

    // `&self`: immutable borrow — download reads the blueprint but doesn't change it.
    // Return type is PathBuf (owned) because we're building a new path value.
    pub async fn download(&self) -> Result<std::path::PathBuf> {
        let sub = format!("{}/{}/{}", self.info.lang, self.info.name, self.info.version);
        let dir = ensure_tool_dir(&sub);
        let file_path = dir.join(&self.info.pkg_name);
        download_file(&file_path, &self.info.url).await?;
        Ok(file_path)
    }

    // `&mut self`: mutable borrow — install may update `self.info.version` when
    // resolving "latest". Only one &mut borrow can exist at a time; the borrow
    // checker prevents aliasing mutations. Callers must declare `let mut blueprint`.
    pub async fn install(&mut self) -> Result<()> {
        if self.info.version == Version::Latest {
            let resolved = resolve_latest_version(&self.info.url).await?;
            // We can mutate the field because we have `&mut self`.
            self.info.version = Version::SemVer(resolved);
        }

        let archive_path = self.download().await?;

        // .parent() returns Option<&Path>. It's None only for paths like "/" or "c:\\",
        // never for a file we just downloaded to a subdirectory. .unwrap() is safe here.
        // .to_path_buf() converts the borrowed &Path to an owned PathBuf so we can
        // hold it across the loop below without keeping a borrow on `archive_path`.
        let dir = archive_path.parent().unwrap().to_path_buf();

        // Why `.clone()` here: the `for` loop would borrow `self.info.steps` immutably,
        // but inside the loop body we also borrow `self.info` (via `self.info.pkg_name`
        // etc). The borrow checker sees two simultaneous borrows of `self.info` and
        // rejects it. Cloning the Vec breaks the tie: the loop iterates the clone,
        // so `self` is available for the body. Improvement: restructure to extract
        // the needed fields before the loop so no clone is needed.
        for step in &self.info.steps.clone() {
            // Exhaustive match — if we add a new InstallStep variant, this match
            // becomes a compile error until we handle it. The compiler gives you a
            // precise list of missing arms. This is the main advantage over TS's
            // `if (step === 'extract')` chains, which silently ignore new values.
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

        // `if let Some(ref custom)` pattern-matches the Option and borrows the inner value.
        // Without `ref`, the match would move `custom_bin_path` out of `self.info`,
        // leaving it partially moved — the compiler forbids that.
        // Alternative (idiomatic Rust 2021+): `if let Some(custom) = &self.info.custom_bin_path`
        // which borrows through the reference automatically.
        let bin_dir = if let Some(ref custom) = self.info.custom_bin_path {
            dir.join(custom)
        } else {
            // .clone() here because `dir` is consumed by join() in the Some branch,
            // but we still need its value in the None branch. The type must be the
            // same in both arms. Improvement: use `dir.join(custom.as_deref().unwrap_or(""))`.
            dir.clone()
        };

        if !bin_dir.exists() {
            // anyhow::bail! expands to: return Err(anyhow::anyhow!("..."))
            // It's a convenient macro for "construct an error and return it".
            anyhow::bail!("{}@{} is not installed yet", self.info.name, self.info.version);
        }

        if let Some(ref links) = self.info.links {
            // `for &link in links`: `link` is &&'static str; `&link` destructures
            // one level of reference, giving us &'static str directly.
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
        // Bug inherited from TS: this builds `lang/name/pkg_name` as a path, but the
        // archive file actually lives at `lang/name/version/pkg_name`. The delete
        // of the archive always succeeds vacuously (the path doesn't exist) rather than
        // removing the archive. In practice the whole version dir is removed by `remove_path(&dir)`
        // anyway, so behaviour is correct — but the intent is wrong.
        let sub_archive = format!("{}/{}/{}", self.info.lang, self.info.name, self.info.pkg_name);

        let dir = ensure_tool_dir_check(&sub_dir);
        let archive = ensure_tool_dir_check(&sub_archive);

        // Run both removals even if the first fails (mirrors TS's Promise.allSettled).
        // The results are plain `Result` values — we collect them and inspect after.
        // Improvement: use `tokio::join!(remove_path(&archive), remove_path(&dir))`
        // to run them concurrently (both are I/O-bound). Currently they run sequentially.
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
