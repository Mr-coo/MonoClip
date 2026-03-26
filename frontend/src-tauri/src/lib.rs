// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod application;
mod domain;
mod infrastructure;

use crate::application::load_file;
use crate::domain::file_entity::FileData;
use std::process::Command;
use tauri::{Manager, AppHandle};

#[tauri::command]
fn trim_video(app: AppHandle) -> Result<(), String> {
    let ffmpeg_path = if cfg!(debug_assertions) {
        std::path::PathBuf::from("ffmpeg/ffmpeg.exe")
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("ffmpeg.exe")
    };

    println!("FFMPEG PATH: {:?}", ffmpeg_path);
    if !ffmpeg_path.exists() {
        return Err("ffmpeg.exe NOT FOUND".into());
    }

    let status = Command::new(ffmpeg_path)
        .args([
            "-y",
            "-i", "C:\\Users\\Mr.cooo\\Downloads\\video.mp4",
            "-ss", "00:00:05",
            "-to", "00:00:30",
            "-c", "copy",
            "C:\\Users\\Mr.cooo\\Downloads\\maklo.mp4",
        ])
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("FFmpeg failed".into());
    }

    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn load_file_data(path: String) -> Result<FileData, String> {
    load_file::execute(path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_file_data,
            trim_video
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
