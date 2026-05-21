interface SpeechSegment {
  start: number;
  end: number;
}

export interface KeepRange {
  start: number;
  end: number;
}

export interface SilenceGap {
  start: number;
  end: number;
  duration: number;
}

export interface DetectionResult {
  keep: KeepRange[];
  silences: SilenceGap[];
  totalRemoved: number;
  originalDuration: number;
  resultDuration: number;
}

export interface DetectOptions {
  minSilence: number;
  pad: number;
  assetStart: number;
  assetEnd: number;
}

/**
 * Convert speech segments (in source-media time) into the ranges to keep,
 * stripping silent gaps longer than `minSilence`. Pad expands each speech
 * region on both sides so cuts don't clip the first/last syllable.
 */
export function detectSilences(
  segments: SpeechSegment[],
  opts: DetectOptions,
): DetectionResult {
  const { minSilence, pad, assetStart, assetEnd } = opts;
  const originalDuration = Math.max(0, assetEnd - assetStart);

  if (originalDuration === 0 || segments.length === 0) {
    return {
      keep: [],
      silences:
        originalDuration > 0 && originalDuration >= minSilence
          ? [{ start: assetStart, end: assetEnd, duration: originalDuration }]
          : [],
      totalRemoved: originalDuration >= minSilence ? originalDuration : 0,
      originalDuration,
      resultDuration: originalDuration >= minSilence ? 0 : originalDuration,
    };
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start);

  // Merge overlapping/adjacent padded speech regions.
  const merged: KeepRange[] = [];
  for (const seg of sorted) {
    const s = Math.max(0, seg.start - pad);
    const e = seg.end + pad;
    const last = merged[merged.length - 1];
    if (last && s <= last.end) {
      last.end = Math.max(last.end, e);
    } else {
      merged.push({ start: s, end: e });
    }
  }

  // Clip to the asset's source-time window.
  const clipped: KeepRange[] = [];
  for (const r of merged) {
    const s = Math.max(r.start, assetStart);
    const e = Math.min(r.end, assetEnd);
    if (e > s) clipped.push({ start: s, end: e });
  }

  // Drop gaps shorter than minSilence by stitching neighbouring ranges back together.
  const keep: KeepRange[] = [];
  for (const r of clipped) {
    const last = keep[keep.length - 1];
    if (last && r.start - last.end < minSilence) {
      last.end = Math.max(last.end, r.end);
    } else {
      keep.push({ ...r });
    }
  }

  // Build the silence list relative to the asset window.
  const silences: SilenceGap[] = [];
  let cursor = assetStart;
  for (const r of keep) {
    if (r.start - cursor >= minSilence) {
      silences.push({ start: cursor, end: r.start, duration: r.start - cursor });
    }
    cursor = r.end;
  }
  if (assetEnd - cursor >= minSilence) {
    silences.push({ start: cursor, end: assetEnd, duration: assetEnd - cursor });
  }

  const resultDuration = keep.reduce((acc, r) => acc + (r.end - r.start), 0);
  const totalRemoved = originalDuration - resultDuration;

  return { keep, silences, totalRemoved, originalDuration, resultDuration };
}
