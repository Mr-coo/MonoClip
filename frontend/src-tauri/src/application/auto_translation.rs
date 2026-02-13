use std::process::Command;
use std::thread;
use std::time::Duration;
use anyhow::Result;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crossbeam_channel::{Sender, unbounded};
use tauri::{AppHandle, Emitter};

const SAMPLE_RATE: u32 = 16000;
const BUFFER_SECONDS: usize = 2;

pub fn run_transcriber(app: AppHandle) -> Result<()> {
      let (tx, rx) = unbounded::<Vec<f32>>();

    start_microphone(tx)?;

    std::thread::spawn(move || {
        loop {
            if let Ok(chunk) = rx.recv() {
                println!("Received audio: {} samples", chunk.len());

                // Emit test message
                let _ = app.emit("subtitle", "hello");
            }
        }
    });

    Ok(())
    // let (tx, rx) = crossbeam_channel::unbounded::<Vec<f32>>();

    // // ✅ START MIC HERE
    // start_microphone(tx)?;

    // thread::spawn(move || {
    //     loop {
    //         let output = Command::new("bin/whisper.exe")
    //             .args([
    //                 "-m",
    //                 "models/ggml-base-q5_0.bin",
    //                 "-f",
    //                 "temp.wav",
    //                 "--language",
    //                 "en",
    //                 "--translate",
    //                 "--no-timestamps",
    //             ])
    //             .output()
    //             .expect("failed to run whisper");

    //         let text = String::from_utf8_lossy(&output.stdout).to_string();

    //         if !text.trim().is_empty() {
    //             app.emit("subtitle", text).unwrap();
    //         }

    //         thread::sleep(Duration::from_secs(1));
    //     }
    // });

    // Ok(())
}

fn start_microphone(tx: Sender<Vec<f32>>) -> Result<()> {
    let host = cpal::default_host();
    let device = host.default_input_device().expect("No mic found");

    let config = cpal::StreamConfig {
        channels: 1,
        sample_rate: cpal::SampleRate(SAMPLE_RATE),
        buffer_size: cpal::BufferSize::Default,
    };

    let stream = device.build_input_stream(
        &config,
        move |data: &[f32], _| {
            tx.send(data.to_vec()).ok();
        },
        move |err| {
            eprintln!("Stream error: {:?}", err);
        },
        None,
    )?;

    stream.play()?;

    std::mem::forget(stream); // keep alive
    Ok(())
}