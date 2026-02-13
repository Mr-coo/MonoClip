// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod application;
mod domain;
mod infrastructure;

use std::thread;

use crate::application::auto_translation::run_transcriber;
use crate::application::load_file;
use crate::domain::file_entity::FileData;

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
        .setup(|app| {
            let app_handle = app.handle().clone();

            thread::spawn(move || {
                if let Err(e) = run_transcriber(app_handle.clone()) {
                    eprintln!("Error: {:?}", e);
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_file_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
