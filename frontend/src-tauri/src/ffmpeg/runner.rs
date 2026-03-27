use std::process::Command;
use tauri::{Manager, AppHandle};

pub async fn run(args: Vec<String>) -> Result<(), String> {
    let ffmpeg_path = std::path::PathBuf::from("ffmpeg/ffmpeg.exe");

    if !ffmpeg_path.exists() {
        return Err("ffmpeg.exe NOT FOUND".into());
    }

    let status = Command::new(ffmpeg_path)
        .args(args)
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("FFmpeg execution failed".into());
    }

    Ok(())
}