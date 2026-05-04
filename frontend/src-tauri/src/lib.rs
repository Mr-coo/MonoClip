mod services;
mod models;
mod ffmpeg;

use crate::models::request::MediaAsset;
use crate::services::export;

#[tauri::command]
async fn export_video(
    media_assets: Vec<MediaAsset>,
    output_path: String,
    canvas_width: u32,
    canvas_height: u32,
) -> Result<String, String> {
    if output_path.is_empty() {
        return Err("No output path provided".into());
    }

    let assets: Vec<MediaAsset> = media_assets
        .into_iter()
        .map(|mut a| { a.path = clean_asset_path(&a.path); a })
        .collect();

    export::execute(&assets, &output_path, canvas_width, canvas_height).await?;

    Ok(output_path)
}

fn clean_asset_path(path: &str) -> String {
    let stripped = path
        .strip_prefix("http://asset.localhost/")
        .unwrap_or(path);
    percent_encoding::percent_decode_str(stripped)
        .decode_utf8_lossy()
        .to_string()
}

#[tauri::command]
async fn write_project_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_project_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![export_video, write_project_file, read_project_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
