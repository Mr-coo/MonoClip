// services/trim.rs
use crate::ffmpeg::runner;
use crate::models::request::*;

pub async fn execute(
    asset: &MediaAsset,
    output_path: &str
) -> Result<(), String> {
    let start = asset.start_time;
    let duration = asset.end_time - asset.start_time;
    let input = &asset.path;

    let args = vec![
        "-ss".into(),
        start.to_string(),
        "-i".into(),
        input.clone(),
        "-t".into(),
        duration.to_string(),
        "-c".into(),
        "copy".into(),
        output_path.into(),
    ];

    runner::run(args).await
}