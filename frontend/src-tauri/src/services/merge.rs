// services/merge.rs
use crate::ffmpeg::runner;
use crate::models::request::*;
use std::fs;
use std::path::Path;

pub async fn execute(
    assets: &[MediaAsset],
    output_path: &str
) -> Result<(), String> {
    if assets.is_empty() {
        return Err("No assets to merge".into());
    }

    let asset_type = &assets[0].asset_type;
    for asset in assets {
        if &asset.asset_type != asset_type {
            return Err("All assets must be of the same type".into());
        }
    }

    match asset_type.as_str() {
        "video" | "audio" => {
            // Use concat demuxer
            let list_path = "temp_concat_list.txt";
            let mut content = String::new();
            for asset in assets {
                content.push_str(&format!("file '{}'\n", asset.path));
            }
            fs::write(list_path, content).map_err(|e| e.to_string())?;

            let args = vec![
                "-f".into(),
                "concat".into(),
                "-safe".into(),
                "0".into(),
                "-i".into(),
                list_path.into(),
                "-c".into(),
                "copy".into(),
                output_path.into(),
            ];

            let result = runner::run(args).await;

            // Clean up temp file
            let _ = fs::remove_file(list_path);

            result
        }
        "image" => {
            // For images, perhaps stack or something, but for now, just copy first
            let input = &assets[0].path;
            let args = vec![
                "-i".into(),
                input.clone(),
                "-c".into(),
                "copy".into(),
                output_path.into(),
            ];
            runner::run(args).await
        }
        _ => Err("Unsupported asset type".into()),
    }
}

pub async fn execute_from_paths(
    paths: &[String],
    output_path: &str
) -> Result<(), String> {
    if paths.is_empty() {
        return Err("No paths to merge".into());
    }

    // Assume all are same type, for simplicity
    let list_path = "temp_concat_list.txt";
    let mut content = String::new();
    for path in paths {
        content.push_str(&format!("file '{}'\n", path));
    }
    fs::write(list_path, content).map_err(|e| e.to_string())?;

    let args = vec![
        "-f".into(),
        "concat".into(),
        "-safe".into(),
        "0".into(),
        "-i".into(),
        list_path.into(),
        "-c".into(),
        "copy".into(),
        output_path.into(),
    ];

    let result = runner::run(args).await;

    // Clean up temp file
    let _ = fs::remove_file(list_path);

    result
}