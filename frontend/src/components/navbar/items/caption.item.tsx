import { FaClosedCaptioning } from "react-icons/fa";
import { MdDelete, MdFilterAlt, MdAdd } from "react-icons/md";
import { FiDownload } from "react-icons/fi";
import { useState, useMemo } from "react";
import { useMediaStore } from "../../../store/media.store";
import { useCaptionStore } from "../../../store/caption.store";
import { useTimelineStore } from "../../../store/timeline.store";

interface ApiSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResponse {
  language: string;
  segments: ApiSegment[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}

export default function CaptionItem() {
  const mediaAssets = useMediaStore((state) => state.assets);
  const { segments, addSegment, updateSegment, removeSegment, setSegments } =
    useCaptionStore();
  const currentTime = useTimelineStore((s) => s.currentTime);

  const [activeAction, setActiveAction] = useState<"auto" | "filter" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawSegments, setRawSegments] = useState<ApiSegment[] | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  const latestTranscribable = useMemo(
    () =>
      [...mediaAssets]
        .reverse()
        .find((a) => a.type === "video" || a.type === "audio"),
    [mediaAssets],
  );

  async function handleAutoCaption() {
    if (!latestTranscribable) {
      setError("Upload a video or audio file first (Media tab).");
      return;
    }
    setError(null);
    setActiveAction("auto");
    try {
      const blob = await (await fetch(latestTranscribable.path)).blob();
      const file = new File([blob], latestTranscribable.name, {
        type: blob.type || "application/octet-stream",
      });
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_BASE_URL}/transcribe`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail ?? "Transcription failed.");
      }
      const data = (await res.json()) as TranscriptionResponse;
      setRawSegments(data.segments);
      setLanguage(data.language);
      setSegments(data.segments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleFilterCaption() {
    const source: ApiSegment[] =
      rawSegments ??
      segments.map((s, i) => ({ id: i, start: s.start, end: s.end, text: s.text }));
    if (!source.length) {
      setError("Generate captions first before filtering.");
      return;
    }
    setError(null);
    setActiveAction("filter");
    try {
      const payload: TranscriptionResponse = {
        language: language ?? "id",
        segments: source as ApiSegment[],
      };
      const res = await fetch(`${API_BASE_URL}/caption/filter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail ?? "Filter failed.");
      }
      const data = (await res.json()) as TranscriptionResponse;
      setSegments(data.segments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setActiveAction(null);
    }
  }

  function handleDownload() {
    if (!segments.length) return;
    const payload = { language: language ?? "id", segments };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "captions.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleAddCaption() {
    addSegment(currentTime, currentTime + 3);
  }

  function handleTimeChange(
    id: string,
    field: "start" | "end" | "duration",
    raw: string,
    segStart: number,
    segEnd: number,
  ) {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;
    if (field === "duration") {
      updateSegment(id, { end: segStart + val });
    } else if (field === "start") {
      if (val > segEnd) return;
      updateSegment(id, { start: val });
    } else {
      if (val < segStart) return;
      updateSegment(id, { end: val });
    }
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 p-2">
      <h2 className="text-2xl border-b-2 border-b-shadow w-full">Caption</h2>

      {/* Action buttons */}
      <div className="w-full mt-4 flex justify-evenly items-center flex-wrap gap-3">
        <button
          className="text-[10px] flex flex-col items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleAutoCaption}
          disabled={activeAction !== null}
        >
          <FaClosedCaptioning size={18} />
          {activeAction === "auto" ? "Running…" : "Auto"}
        </button>
        <button
          className="text-[10px] flex flex-col items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleFilterCaption}
          disabled={activeAction !== null || segments.length === 0}
        >
          <MdFilterAlt size={18} />
          {activeAction === "filter" ? "Filtering…" : "Filter"}
        </button>
        <button
          className="text-[10px] flex flex-col items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleDownload}
          disabled={segments.length === 0}
        >
          <FiDownload size={18} />
          Download
        </button>
      </div>

      {/* Status */}
      {error && <p className="w-full text-xs text-red-400 mt-2">{error}</p>}
      {language && segments.length > 0 && (
        <p className="w-full text-[11px] text-typography/50 mt-2">
          Language: {language} · {segments.length} segment{segments.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Caption list */}
      <div className="flex items-center justify-between w-full mt-3 mb-1">
        <h3 className="text-sm font-semibold">Captions</h3>
      </div>

      <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col gap-2">
        {segments.length === 0 && (
          <p className="text-xs text-typography/50 mt-2">
            No captions yet. Click Auto to transcribe or add one manually.
          </p>
        )}

        {segments.map((seg) => {
          const duration = parseFloat((seg.end - seg.start).toFixed(2));
          return (
            <div
              key={seg.id}
              className="w-full border border-white/10 rounded-lg p-2 bg-shadow/30 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-end mb-1.5">
                <button
                  className="text-red-400/60 hover:text-red-400 transition-colors"
                  onClick={() => removeSegment(seg.id)}
                  title="Delete caption"
                >
                  <MdDelete size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1 mb-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] text-typography/40 text-center">Start (s)</label>
                  <input
                    key={`start-${seg.id}-${seg.start}`}
                    type="number"
                    defaultValue={seg.start}
                    onBlur={(e) => handleTimeChange(seg.id, "start", e.target.value, seg.start, seg.end)}
                    className="w-full bg-dark/60 rounded px-1 py-0.5 text-[11px] text-center text-typography/80 outline-none focus:ring-1 focus:ring-primary/60"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] text-typography/40 text-center">End (s)</label>
                  <input
                    key={`end-${seg.id}-${seg.end}`}
                    type="number"
                    defaultValue={seg.end}
                    onBlur={(e) => handleTimeChange(seg.id, "end", e.target.value, seg.start, seg.end)}
                    className="w-full bg-dark/60 rounded px-1 py-0.5 text-[11px] text-center text-typography/80 outline-none focus:ring-1 focus:ring-primary/60"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] text-typography/40 text-center">Duration (s)</label>
                  <input
                    key={`dur-${seg.id}-${duration}`}
                    type="number"
                    defaultValue={duration}
                    onBlur={(e) => handleTimeChange(seg.id, "duration", e.target.value, seg.start, seg.end)}
                    className="w-full bg-dark/60 rounded px-1 py-0.5 text-[11px] text-center text-typography/80 outline-none focus:ring-1 focus:ring-primary/60"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>

              <textarea
                value={seg.text}
                onChange={(e) => updateSegment(seg.id, { text: e.target.value })}
                className="w-full bg-dark/40 rounded px-1.5 py-1 text-xs text-typography resize-none outline-none placeholder:text-typography/30 leading-relaxed focus:ring-1 focus:ring-primary/60"
                rows={2}
                placeholder="Caption text…"
              />
            </div>
          );
        })}
      </div>

      {/* Add caption */}
      <button
        className="mt-3 w-full flex items-center justify-center gap-2 border border-white/20 rounded py-1.5 text-xs hover:bg-shadow transition-colors"
        onClick={handleAddCaption}
      >
        <MdAdd size={14} />
        Add Caption at {fmt(currentTime)}
      </button>
    </div>
  );
}