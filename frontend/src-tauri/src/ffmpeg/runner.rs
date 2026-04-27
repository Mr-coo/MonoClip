use std::process::Command;

pub async fn run(args: Vec<String>) -> Result<(), String> {
    let ffmpeg_path = std::path::PathBuf::from("ffmpeg/ffmpeg.exe");

    if !ffmpeg_path.exists() {
        return Err("ffmpeg.exe not found at ffmpeg/ffmpeg.exe".into());
    }

    let output = Command::new(&ffmpeg_path)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let last_line = stderr.lines().last().unwrap_or("unknown error");
        return Err(format!("FFmpeg failed: {}", last_line));
    }

    Ok(())
}
