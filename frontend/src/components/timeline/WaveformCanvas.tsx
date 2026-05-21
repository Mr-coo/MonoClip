import { useEffect, useRef } from "react";
import { WaveformData } from "../../hook/useAudioWaveform";

interface Props {
  data: WaveformData;
  startTime: number;
  endTime: number;
  width: number;
  height: number;
  color?: string;
}

const SAMPLES_PER_SECOND = 100;

export function WaveformCanvas({
  data,
  startTime,
  endTime,
  width,
  height,
  color = "rgba(255,255,255,0.75)",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = Math.max(1, Math.round(width));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const centerY = height / 2;
    const clipDuration = endTime - startTime;
    if (clipDuration <= 0) return;

    for (let x = 0; x < w; x++) {
      const sourceTime = startTime + (x / w) * clipDuration;
      const idx = Math.floor(sourceTime * SAMPLES_PER_SECOND);
      if (idx < 0 || idx >= data.peaks.length) continue;

      const amp = data.peaks[idx];
      const half = Math.max(1, amp * centerY * 0.9);

      ctx.beginPath();
      ctx.moveTo(x + 0.5, centerY - half);
      ctx.lineTo(x + 0.5, centerY + half);
      ctx.stroke();
    }
  }, [data, startTime, endTime, w, height, color]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, width: w, height, pointerEvents: "none" }}
    />
  );
}
