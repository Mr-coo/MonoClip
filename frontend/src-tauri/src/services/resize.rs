// services/resize.rs
use crate::ffmpeg::runner;
use crate::models::request::*;

pub async fn execute(
    asset: &MediaAsset,
    output_path: &str
) -> Result<(), String> {
    let input = &asset.path;

    let args = match asset.asset_type.as_str() {
        "video" | "image" => {
            vec![
                "-i".into(),
                input.clone(),
                "-vf".into(),
                format!("scale={}:{}", asset.width as i32, asset.height as i32),
                output_path.into(),
            ]
        }
        "audio" => {
            // For audio, perhaps just copy, or maybe change sample rate, but for now copy
            vec![
                "-i".into(),
                input.clone(),
                "-c".into(),
                "copy".into(),
                output_path.into(),
            ]
        }
        _ => return Err("Unsupported asset type".into()),
    };

    runner::run(args).await
}