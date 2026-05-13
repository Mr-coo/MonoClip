use std::process::Command;

pub async fn run(args: Vec<String>) -> Result<(), String> {
    let ffmpeg_path = std::path::PathBuf::from("ffmpeg/ffmpeg.exe");

    if !ffmpeg_path.exists() {
        return Err(format!(
            "ffmpeg.exe not found. Looked in: {}",
            std::env::current_dir()
                .map(|p| p.join("ffmpeg/ffmpeg.exe").display().to_string())
                .unwrap_or_else(|_| "unknown".into())
        ));
    }

    let output = Command::new(&ffmpeg_path)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let all_lines: Vec<&str> = stderr.lines().filter(|l| !l.is_empty()).collect();

        // Pull lines that look like real errors (appear before the encoder stats)
        let error_lines: Vec<&str> = all_lines
            .iter()
            .filter(|l| {
                let lo = l.to_lowercase();
                lo.contains("error") || lo.contains("invalid") || lo.contains("no such")
                    || lo.contains("unable") || lo.contains("cannot") || lo.contains("not found")
            })
            .copied()
            .collect();

        let n = all_lines.len();
        let tail = all_lines[n.saturating_sub(8)..].join("\n");

        let diag = if !error_lines.is_empty() {
            format!("Errors:\n{}\n\nLast lines:\n{}", error_lines.join("\n"), tail)
        } else {
            tail
        };

        return Err(format!(
            "FFmpeg failed:\n{}\n\nCommand: ffmpeg {}",
            diag,
            args.join(" ")
        ));
    }

    Ok(())
}
