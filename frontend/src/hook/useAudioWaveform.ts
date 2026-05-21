import { useEffect, useState } from "react";

export interface WaveformData {
  peaks: Float32Array;
  duration: number;
}

const SAMPLES_PER_SECOND = 100;
const cache = new Map<string, WaveformData>();

export function useAudioWaveform(path: string): WaveformData | null {
  const [data, setData] = useState<WaveformData | null>(cache.get(path) ?? null);

  useEffect(() => {
    if (!path) return;
    const cached = cache.get(path);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // media.path is already "http://asset.localhost/..." — use it directly
        const response = await fetch(path);
        if (!response.ok || cancelled) return;

        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const audioCtx = new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        await audioCtx.close();

        if (cancelled) return;

        const channelData = audioBuffer.getChannelData(0);
        const totalBuckets = Math.max(1, Math.ceil(audioBuffer.duration * SAMPLES_PER_SECOND));
        const samplesPerBucket = channelData.length / totalBuckets;
        const peaks = new Float32Array(totalBuckets);

        for (let i = 0; i < totalBuckets; i++) {
          let max = 0;
          const start = Math.floor(i * samplesPerBucket);
          const end = Math.floor((i + 1) * samplesPerBucket);
          for (let j = start; j < end; j++) {
            const v = Math.abs(channelData[j]);
            if (v > max) max = v;
          }
          peaks[i] = max;
        }

        const waveformData: WaveformData = { peaks, duration: audioBuffer.duration };
        cache.set(path, waveformData);
        if (!cancelled) setData(waveformData);
      } catch {
        // No audio track or unsupported format — silently skip
      }
    })();

    return () => { cancelled = true; };
  }, [path]);

  return data;
}
