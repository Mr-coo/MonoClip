use crate::ffmpeg::runner;
use crate::models::request::{MediaAsset, TextStyle};

pub async fn execute(assets: &[MediaAsset], output_path: &str) -> Result<(), String> {
    let visuals: Vec<&MediaAsset> = assets
        .iter()
        .filter(|a| a.asset_type == "video" || a.asset_type == "img" || a.asset_type == "image")
        .collect();

    let audio_only: Vec<&MediaAsset> = assets
        .iter()
        .filter(|a| a.asset_type == "audio")
        .collect();

    let text_assets: Vec<&MediaAsset> = assets
        .iter()
        .filter(|a| a.asset_type == "text" && a.text_style.is_some())
        .collect();

    if visuals.is_empty() && audio_only.is_empty() && text_assets.is_empty() {
        return Err("No exportable assets on the timeline".into());
    }

    // Total duration covers every asset including text overlays
    let total_duration = assets
        .iter()
        .map(|a| a.start_in_time_line + (a.end_time - a.start_time))
        .fold(0.0f64, f64::max);

    if total_duration <= 0.0 {
        return Err("Total duration is zero".into());
    }

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

    // Visual inputs (indices 1 .. visuals.len())
    // -itsoffset shifts timestamps so the clip lands at start_in_time_line in the output.
    for asset in &visuals {
        let dur = asset.end_time - asset.start_time;
        args.extend_from_slice(&[
            "-itsoffset".into(),
            format!("{:.3}", asset.start_in_time_line),
        ]);
        if asset.asset_type == "img" || asset.asset_type == "image" {
            args.extend_from_slice(&[
                "-loop".into(), "1".into(),
                "-t".into(), format!("{:.3}", dur),
            ]);
        } else {
            args.extend_from_slice(&[
                "-ss".into(), format!("{:.3}", asset.start_time),
                "-t".into(), format!("{:.3}", dur),
            ]);
        }
        args.extend_from_slice(&["-i".into(), asset.path.clone()]);
    }

    // Audio-only inputs (indices visuals.len()+1 ..)
    for asset in &audio_only {
        let dur = asset.end_time - asset.start_time;
        args.extend_from_slice(&[
            "-itsoffset".into(), format!("{:.3}", asset.start_in_time_line),
            "-ss".into(),        format!("{:.3}", asset.start_time),
            "-t".into(),         format!("{:.3}", dur),
            "-i".into(),         asset.path.clone(),
        ]);
    }

    // ----- filter_complex -----
    let mut filters: Vec<String> = Vec::new();
    let mut last_v = "[0:v]".to_string();

    // Scale + overlay each visual at its canvas position.
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

    // Drawtext overlay for each text asset, chained after video overlays.
    for (i, asset) in text_assets.iter().enumerate() {
        if let Some(ts) = &asset.text_style {
            let tv = format!("[tv{i}]");
            let dt = build_drawtext(asset, ts);
            filters.push(format!("{last_v}{dt}{tv}"));
            last_v = tv;
        }
    }

    // Audio mixing: video audio tracks + audio-only files, each padded so amix
    // doesn't stop when the shortest stream ends.
    let mut audio_filter_count = 0usize;
    for (i, asset) in visuals.iter().enumerate() {
        if asset.asset_type == "video" {
            filters.push(format!("[{}:a]apad[aa{audio_filter_count}]", i + 1));
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
        let mix_in: String = (0..audio_filter_count)
            .map(|i| format!("[aa{i}]"))
            .collect::<Vec<_>>()
            .join("");
        filters.push(format!(
            "{mix_in}amix=inputs={audio_filter_count}:normalize=0:duration=longest[aout]"
        ));
    }

    // Apply filter_complex only when there are actual filter entries.
    // When empty, map the base canvas stream directly (no brackets).
    if !filters.is_empty() {
        args.extend_from_slice(&["-filter_complex".into(), filters.join(";")]);
        args.extend_from_slice(&["-map".into(), last_v]);
    } else {
        args.extend_from_slice(&["-map".into(), "0:v".into()]);
    }

    if has_audio {
        args.extend_from_slice(&["-map".into(), "[aout]".into()]);
    }

    args.extend_from_slice(&[
        "-c:v".into(), "libx264".into(),
        "-crf".into(), "23".into(),
        "-preset".into(), "fast".into(),
        "-pix_fmt".into(), "yuv420p".into(),
        "-t".into(), format!("{:.3}", total_duration),
    ]);
    if has_audio {
        args.extend_from_slice(&["-c:a".into(), "aac".into(), "-b:a".into(), "192k".into()]);
    }

    args.push(output_path.into());

    runner::run(args).await
}

// Build a drawtext filter string (no surrounding stream labels — caller adds those).
fn build_drawtext(asset: &MediaAsset, ts: &TextStyle) -> String {
    let start = asset.start_in_time_line;
    let end   = start + (asset.end_time - asset.start_time);

    let text = escape_drawtext(&ts.content);

    // x depends on text alignment within the asset's bounding box
    let x_expr = match ts.text_align.as_str() {
        "center"  => format!("({}-text_w/2)", (asset.x + asset.width / 2.0) as i32),
        "right"   => format!("({}-text_w)",   (asset.x + asset.width) as i32),
        _         => format!("{}",              asset.x as i32),   // left / justify
    };
    let y         = asset.y as i32;
    let fontsize  = ts.font_size as i32;
    let fontcolor = ffmpeg_color(&ts.color, ts.opacity);
    let font      = map_font(&ts.font_family);

    let mut parts = vec![
        format!("text='{text}'"),
        format!("x={x_expr}"),
        format!("y={y}"),
        format!("fontsize={fontsize}"),
        format!("fontcolor={fontcolor}"),
        format!("font={font}"),
        format!("enable='between(t,{start:.3},{end:.3})'"),
    ];

    if ts.stroke_width > 0.0 {
        parts.push(format!("borderw={}", ts.stroke_width as i32));
        parts.push(format!("bordercolor={}", ffmpeg_color(&ts.stroke_color, 1.0)));
    }

    if ts.shadow_opacity > 0.0 {
        parts.push(format!("shadowx={}", ts.shadow_offset_x as i32));
        parts.push(format!("shadowy={}", ts.shadow_offset_y as i32));
        parts.push(format!("shadowcolor={}", ffmpeg_color(&ts.shadow_color, ts.shadow_opacity)));
    }

    if ts.bg_opacity > 0.0 {
        parts.push("box=1".into());
        parts.push(format!("boxcolor={}", ffmpeg_color(&ts.bg_color, ts.bg_opacity)));
        parts.push(format!("boxborderw={}", ts.bg_padding as i32));
    }

    format!("drawtext={}", parts.join(":"))
}

// Escape characters that FFmpeg's drawtext option parser treats as special.
fn escape_drawtext(s: &str) -> String {
    s.replace('\\', "\\\\")
     .replace('\'', "\\'")
     .replace(':', "\\:")
}

// Convert a #RRGGBB hex string + 0-1 alpha to FFmpeg's 0xRRGGBB@alpha format.
fn ffmpeg_color(hex: &str, alpha: f64) -> String {
    let clean = hex.trim_start_matches('#').to_uppercase();
    format!("0x{clean}@{alpha:.2}")
}

// Map CSS generic font families to actual font names available on Windows.
fn map_font(family: &str) -> String {
    match family {
        "sans-serif"            => "Arial".into(),
        "serif"                 => "Times New Roman".into(),
        "monospace" | "Courier New" => "Courier New".into(),
        "cursive"               => "Comic Sans MS".into(),
        other                   => other.into(),
    }
}