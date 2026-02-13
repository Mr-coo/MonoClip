use std::fs;
use std::path::Path;

use crate::domain::file_entity::FileData;

pub fn load_file_metadata(path: &str) -> Result<FileData, String> {
    let metadata = fs::metadata(path)
        .map_err(|e| e.to_string())?;

    let path_obj = Path::new(path);

    let name = path_obj
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();

    let extension = path_obj
      .extension()
      .map(|ext| ext.to_string_lossy().to_string());

    Ok(FileData {
        name,
        size: metadata.len(),
        extension: extension,
    })
}