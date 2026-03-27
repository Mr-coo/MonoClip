// services/trim.rs
use crate::ffmpeg::runner;

pub async fn execute(
    input: String,
    output: String,
    start: f64,
    duration: f64,
) -> Result<(), String> {
    let args = vec![
        "-ss".into(),
        start.to_string(),
        "-i".into(),
        input,
        "-t".into(),
        duration.to_string(),
        "-c".into(),
        "copy".into(),
        output,
    ];

    runner::run(args).await
}