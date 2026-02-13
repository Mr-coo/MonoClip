use crate::domain::file_entity::FileData;
use crate::infrastructure::file_repo;

pub fn execute(path: String) -> Result<FileData, String> {
    file_repo::load_file_metadata(&path)
}