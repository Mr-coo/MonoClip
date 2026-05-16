import { useMemo, useState } from "react";
import { MdContentCut, MdAutoFixHigh } from "react-icons/md";
import { useTimelineStore } from "../../../store/timeline.store";
import { useCaptionStore } from "../../../store/caption.store";
import { transcribe } from "../../../utils/api";
import {
  detectSilences,
  type DetectionResult,
} from "../../../utils/silenceDetect";

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00.0";
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}

export default function SmartCutItem() {
  const assets = useTimelineStore((s) => s.assets);
  const selectedAssetId = useTimelineStore((s) => s.selectedAssetId);
  const applyAutoCut = useTimelineStore((s) => s.applyAutoCut);
  const segments = useCaptionStore((s) => s.segments);
  const setSegments = useCaptionStore((s) => s.setSegments);

  const [minSilence, setMinSilence] = useState(0.6);
  const [pad, setPad] = useState(0.1);
  const [busy, setBusy] = useState<null | "transcribe" | "apply">(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [preview, setPreview] = useState<DetectionResult | null>(null);

  const selected = useMemo(
    () => assets.find((a) => a.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  const transcribable =
    selected && (selected.type === "video" || selected.type === "audio");

  function buildPreview(segs: Array<{ start: number; end: number }> = segments) {
    if (!selected) return null;
    const result = detectSilences(segs, {
      minSilence,
      pad,
      assetStart: selected.startTime,
      assetEnd: selected.endTime,
    });
    setPreview(result);
    return result;
  }

  async function handleDetect() {
    setError(null);
    setInfo(null);

    if (!selected) {
      setError("Select a clip in the timeline first.");
      return;
    }
    if (!transcribable) {
      setError("Select a video or audio clip — images can't be silence-cut.");
      return;
    }

    if (segments.length > 0) {
      buildPreview();
      setInfo(`Using ${segments.length} cached caption segment(s).`);
      return;
    }

    setBusy("transcribe");
    try {
      const blob = await (await fetch(selected.path)).blob();
      const file = new File([blob], selected.name, {
        type: blob.type || "application/octet-stream",
      });
      const data = await transcribe(file);
      setSegments(data.segments);
      buildPreview(data.segments);
      setInfo(`Transcribed ${data.segments.length} segment(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      setBusy(null);
    }
  }

  function handleRefresh() {
    setError(null);
    setInfo(null);
    if (!selected) {
      setError("Select a clip in the timeline first.");
      return;
    }
    if (segments.length === 0) {
      setError("No captions yet — click Detect to transcribe first.");
      return;
    }
    buildPreview();
  }

  function handleApply() {
    setError(null);
    setInfo(null);

    if (!selected || !preview) {
      setError("Run detection first.");
      return;
    }
    if (preview.keep.length === 0) {
      setError("Nothing to keep — adjust thresholds or check captions.");
      return;
    }
    if (preview.silences.length === 0) {
      setInfo("No silences above the threshold — clip unchanged.");
      return;
    }

    setBusy("apply");
    try {
      const created = applyAutoCut(selected.id, preview.keep);
      setInfo(
        `Removed ${preview.silences.length} silent gap(s) (${fmt(
          preview.totalRemoved,
        )}). Clip split into ${created} piece(s).`,
      );
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply cuts.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 p-2">
      <h2 className="text-2xl border-b-2 border-b-shadow w-full">Smart Cut</h2>

      <p className="text-[10px] text-typography/50 mt-3 leading-relaxed">
        Detects silent gaps from Whisper transcripts and splices them out of
        the selected timeline clip. Select a video or audio clip, tune the
        thresholds, then Detect → Apply.
      </p>

      {/* Selected clip */}
      <label className="text-[10px] text-typography/50 mt-4 mb-1">Selected clip</label>
      <div className="bg-dark/60 rounded px-2 py-1.5 text-xs text-typography/80 border border-shadow/40 min-h-[28px]">
        {selected ? (
          <span className="truncate block">
            {selected.name}{" "}
            <span className="text-typography/40">
              ({fmt(selected.endTime - selected.startTime)})
            </span>
          </span>
        ) : (
          <span className="text-typography/40 italic">No clip selected</span>
        )}
      </div>

      {/* Thresholds */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-typography/50">Min silence (s)</label>
          <input
            type="number"
            value={minSilence}
            min={0.1}
            step={0.1}
            onChange={(e) => setMinSilence(Math.max(0.1, Number(e.target.value)))}
            className="bg-dark/60 rounded px-2 py-1 text-xs text-typography outline-none focus:ring-1 focus:ring-primary/60 w-full"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-typography/50">Padding (s)</label>
          <input
            type="number"
            value={pad}
            min={0}
            step={0.05}
            onChange={(e) => setPad(Math.max(0, Number(e.target.value)))}
            className="bg-dark/60 rounded px-2 py-1 text-xs text-typography outline-none focus:ring-1 focus:ring-primary/60 w-full"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleDetect}
          disabled={busy !== null || !selected || !transcribable}
          className="flex-1 flex items-center justify-center gap-1.5 bg-shadow rounded py-1.5 text-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <MdAutoFixHigh size={14} />
          {busy === "transcribe" ? "Transcribing…" : "Detect"}
        </button>
        <button
          onClick={handleRefresh}
          disabled={busy !== null || !selected || segments.length === 0}
          className="px-3 flex items-center justify-center text-[10px] bg-shadow/60 rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          title="Re-detect with current thresholds"
        >
          Refresh
        </button>
      </div>

      {/* Status */}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {info && !error && (
        <p className="text-[11px] text-green-400/80 mt-2">{info}</p>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-3 bg-dark/40 rounded border border-shadow/40 p-2 text-[11px] text-typography/70">
          <div className="grid grid-cols-2 gap-y-0.5 tabular-nums">
            <span className="text-typography/40">Original</span>
            <span className="text-right">{fmt(preview.originalDuration)}</span>
            <span className="text-typography/40">After cut</span>
            <span className="text-right">{fmt(preview.resultDuration)}</span>
            <span className="text-typography/40">Removed</span>
            <span className="text-right text-red-300/80">
              −{fmt(preview.totalRemoved)}
            </span>
            <span className="text-typography/40">Silences</span>
            <span className="text-right">{preview.silences.length}</span>
            <span className="text-typography/40">Pieces</span>
            <span className="text-right">{preview.keep.length}</span>
          </div>

          {preview.silences.length > 0 && (
            <div className="mt-2 pt-2 border-t border-shadow/40 max-h-40 overflow-y-auto no-scrollbar flex flex-col gap-0.5 text-[10px] tabular-nums">
              {preview.silences.map((g, i) => (
                <div
                  key={i}
                  className="flex justify-between text-typography/60"
                >
                  <span>
                    {fmt(g.start)} → {fmt(g.end)}
                  </span>
                  <span className="text-red-300/70">−{g.duration.toFixed(2)}s</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      <button
        onClick={handleApply}
        disabled={busy !== null || !preview || preview.silences.length === 0}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-primary rounded py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        <MdContentCut size={14} />
        {busy === "apply" ? "Applying…" : "Apply Cuts"}
      </button>
    </div>
  );
}
