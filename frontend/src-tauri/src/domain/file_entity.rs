use serde::Serialize;

#[derive(Serialize)]
pub struct FileData{
  pub name: String,
  pub extension: Option<String>,
  pub size: u64,
}