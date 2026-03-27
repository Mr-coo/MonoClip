// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod services;
mod models;
mod ffmpeg;

use crate::models::request::MediaAsset;

#[tauri::command]
fn export_video(media_assets: Vec<MediaAsset>) {
    format!("Received {} data entries. Processing complete.", media_assets.len());
    return;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            export_video
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
