use std::process::Command;

pub async fn run(args: Vec<String>) -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .args(args)
        .status()
        .await
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("FFmpeg execution failed".into());
    }

    Ok(())
}