use crate::ffmpeg::runner;
use crate::models::request::MediaAsset;

pub async fn execute(assets: &[MediaAsset], output_path: &str) -> Result<(), String> {
    // Skip text assets — they have no source file to composite
    let media: Vec<&MediaAsset> = assets
        .iter()
        .filter(|a| a.asset_type != "text")
        .collect();

    if media.is_empty() {
        return Err("No exportable assets on the timeline".into());
    }

    let total_duration = media
        .iter()
        .map(|a| a.start_in_time_line + (a.end_time - a.start_time))
        .fold(0.0f64, f64::max);

    if total_duration <= 0.0 {
        return Err("Total duration is zero".into());
    }

    let visuals: Vec<&MediaAsset> = media
        .iter()
        .filter(|a| a.asset_type == "video" || a.asset_type == "img" || a.asset_type == "image")
        .copied()
        .collect();

    let audio_only: Vec<&MediaAsset> = media
        .iter()
        .filter(|a| a.asset_type == "audio")
        .copied()
        .collect();

    let mut args: Vec<String> = vec!["-y".into()];

    // Input 0: base black 1920×1080 canvas
    args.extend_from_slice(&[
        "-f".into(),
        "lavfi".into(),
        "-i".into(),
        format!(
            "color=black:size=1920x1080:rate=30:duration={:.3}",
            total_duration + 0.1
        ),
    ]);

    // Visual inputs (1 .. visuals.len())
    // -itsoffset offsets the input timestamps so the clip lands at start_in_time_line.
    // For video: -ss trims the source to [start_time, end_time].
    // For image: -loop 1 -t duration keeps the still frame alive for the clip length.
    for asset in &visuals {
        let dur = asset.end_time - asset.start_time;
        args.extend_from_slice(&[
            "-itsoffset".into(),
            format!("{:.3}", asset.start_in_time_line),
        ]);
        if asset.asset_type == "img" || asset.asset_type == "image" {
            args.extend_from_slice(&[
                "-loop".into(),
                "1".into(),
                "-t".into(),
                format!("{:.3}", dur),
            ]);
        } else {
            args.extend_from_slice(&[
                "-ss".into(),
                format!("{:.3}", asset.start_time),
                "-t".into(),
                format!("{:.3}", dur),
            ]);
        }
        args.extend_from_slice(&["-i".into(), asset.path.clone()]);
    }

    // Audio-only inputs (visuals.len()+1 ..)
    for asset in &audio_only {
        let dur = asset.end_time - asset.start_time;
        args.extend_from_slice(&[
            "-itsoffset".into(),
            format!("{:.3}", asset.start_in_time_line),
            "-ss".into(),
            format!("{:.3}", asset.start_time),
            "-t".into(),
            format!("{:.3}", dur),
            "-i".into(),
            asset.path.clone(),
        ]);
    }

    // ----- filter_complex -----
    let mut filters: Vec<String> = Vec::new();
    let mut last_v = "[0:v]".to_string();

    // Scale each visual to its asset dimensions and overlay at (x, y).
    // eof_action=pass lets the base canvas show through once the clip ends.
    for (i, asset) in visuals.iter().enumerate() {
        let idx = i + 1;
        let sv = format!("[sv{i}]");
        let ov = format!("[ov{i}]");
        filters.push(format!(
            "[{idx}:v]scale={w}:{h}{sv}",
            w = asset.width as i32,
            h = asset.height as i32,
        ));
        filters.push(format!(
            "{last_v}{sv}overlay={x}:{y}:eof_action=pass{ov}",
            x = asset.x as i32,
            y = asset.y as i32,
        ));
        last_v = ov;
    }

    // Collect all audio streams (video tracks + audio-only files).
    // apad ensures each stream stays alive for the full mix duration.
    let mut audio_filter_count = 0usize;

    for (i, asset) in visuals.iter().enumerate() {
        if asset.asset_type == "video" {
            filters.push(format!(
                "[{}:a]apad[aa{audio_filter_count}]",
                i + 1
            ));
            audio_filter_count += 1;
        }
    }
    for j in 0..audio_only.len() {
        let idx = visuals.len() + 1 + j;
        filters.push(format!("[{idx}:a]apad[aa{audio_filter_count}]"));
        audio_filter_count += 1;
    }

    let has_audio = audio_filter_count > 0;
    if has_audio {
        let mix_inputs: String = (0..audio_filter_count)
            .map(|i| format!("[aa{i}]"))
            .collect::<Vec<_>>()
            .join("");
        filters.push(format!(
            "{mix_inputs}amix=inputs={audio_filter_count}:normalize=0:duration=longest[aout]"
        ));
    }

    if !filters.is_empty() {
        args.extend_from_slice(&["-filter_complex".into(), filters.join(";")]);
    }

    // Map outputs
    args.extend_from_slice(&["-map".into(), last_v]);
    if has_audio {
        args.extend_from_slice(&["-map".into(), "[aout]".into()]);
    }

    // Encoding: H.264 + AAC, capped at total_duration
    args.extend_from_slice(&[
        "-c:v".into(), "libx264".into(),
        "-crf".into(), "23".into(),
        "-preset".into(), "fast".into(),
        "-pix_fmt".into(), "yuv420p".into(),
        "-t".into(), format!("{:.3}", total_duration),
    ]);
    if has_audio {
        args.extend_from_slice(&[
            "-c:a".into(), "aac".into(),
            "-b:a".into(), "192k".into(),
        ]);
    }

    args.push(output_path.into());

    runner::run(args).await
}
