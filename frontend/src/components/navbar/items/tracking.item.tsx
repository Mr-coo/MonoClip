import { useState, useMemo } from "react";
import { MdMyLocation } from "react-icons/md";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useMediaStore } from "../../../store/media.store";
import { useEditorStore } from "../../../store/editor.store";
import { DEFAULT_MEDIA_ASSET_SETTINGS } from "../../../types/mediaAsset";
import { trackObject } from "../../../utils/api";

export default function TrackingItem() {
  const mediaAssets = useMediaStore((s) => s.assets);
  const addAsset = useMediaStore((s) => s.addAsset);
  const { canvasWidth, canvasHeight } = useEditorStore();

  const videoAssets = useMemo(
    () => mediaAssets.filter((a) => a.type === "video"),
    [mediaAssets],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [w, setW] = useState(200);
  const [h, setH] = useState(200);
  const [zoom, setZoom] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const selectedAsset = videoAssets.find((a) => a.id === selectedId);

  async function handleTrack() {
    if (!selectedAsset) {
      setError("Select a video first.");
      return;
    }
    setError(null);
    setDone(false);
    setLoading(true);
    try {
      const blob = await (await fetch(selectedAsset.path)).blob();
      const file = new File([blob], selectedAsset.name, {
        type: blob.type || "video/mp4",
      });
      const result = await trackObject(file, x, y, w, h, zoom);
      const trackedPath = convertFileSrc(result.output_video_path);

      // Probe the output video for duration/dimensions
      const video = document.createElement("video");
      video.src = trackedPath;
      video.preload = "metadata";
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => resolve();
      });

      const vw = video.videoWidth || canvasWidth;
      const vh = video.videoHeight || canvasHeight;
      const scale = Math.min(canvasWidth / vw, canvasHeight / vh);
      const fitW = Math.round(vw * scale);
      const fitH = Math.round(vh * scale);

      addAsset({
        ...DEFAULT_MEDIA_ASSET_SETTINGS,
        type: "video",
        path: trackedPath,
        name: `tracked_${selectedAsset.name}`,
        endTime: video.duration || selectedAsset.endTime,
        width: fitW,
        height: fitH,
        x: Math.round((canvasWidth - fitW) / 2),
        y: Math.round((canvasHeight - fitH) / 2),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tracking failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 p-2">
      <h2 className="text-2xl border-b-2 border-b-shadow w-full">Tracking</h2>

      <p className="text-[10px] text-typography/50 mt-3 leading-relaxed">
        Track an object in a video and apply auto-zoom. Select a video, draw the
        bounding box around the object in the first frame, then click Track.
      </p>

      {/* Video selector */}
      <label className="text-[10px] text-typography/50 mt-4 mb-1">Video</label>
      {videoAssets.length === 0 ? (
        <p className="text-xs text-typography/40 italic">No videos in library.</p>
      ) : (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-base text-typography text-xs px-2 py-1.5 rounded border border-shadow/50 outline-none cursor-pointer hover:border-shadow transition-colors"
        >
          <option value="" className="bg-dark">— choose —</option>
          {videoAssets.map((a) => (
            <option key={a.id} value={a.id} className="bg-dark">
              {a.name}
            </option>
          ))}
        </select>
      )}

      {/* Bbox inputs */}
      <label className="text-[10px] text-typography/50 mt-4 mb-1">
        Bounding box (source pixels)
      </label>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["X", x, setX],
            ["Y", y, setY],
            ["W", w, setW],
            ["H", h, setH],
          ] as [string, number, (v: number) => void][]
        ).map(([label, val, setter]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <label className="text-[9px] text-typography/40">{label}</label>
            <input
              type="number"
              value={val}
              min={0}
              onChange={(e) => setter(Number(e.target.value))}
              className="bg-dark/60 rounded px-2 py-1 text-xs text-typography outline-none focus:ring-1 focus:ring-primary/60"
            />
          </div>
        ))}
      </div>

      {/* Zoom factor */}
      <label className="text-[10px] text-typography/50 mt-3 mb-1">
        Zoom factor
      </label>
      <input
        type="number"
        value={zoom}
        min={1}
        max={5}
        step={0.1}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="bg-dark/60 rounded px-2 py-1 text-xs text-typography outline-none focus:ring-1 focus:ring-primary/60 w-full"
      />

      {/* Status */}
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      {done && (
        <p className="text-xs text-green-400 mt-3">
          Done — tracked video added to Media.
        </p>
      )}

      {/* Track button */}
      <button
        onClick={handleTrack}
        disabled={loading || !selectedId}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-shadow rounded py-2 text-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        <MdMyLocation size={15} />
        {loading ? "Tracking…" : "Track Object"}
      </button>
    </div>
  );
}
