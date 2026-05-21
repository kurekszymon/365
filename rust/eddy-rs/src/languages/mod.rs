pub mod cpp;
pub mod go;

use anyhow::Result;

use crate::types::{ToolInfo, Version};

pub async fn build(tool: &str, version: Version) -> Result<ToolInfo> {
    match tool {
        "go" => go::build(version).await,
        "cmake" => Ok(cpp::cmake::build(version)),
        "bazel" => Ok(cpp::bazel::build(version)),
        "ninja" => Ok(cpp::ninja::build(version)),
        "conan" => Ok(cpp::conan::build(version)),
        other => anyhow::bail!("unknown tool: {other}"),
    }
}
