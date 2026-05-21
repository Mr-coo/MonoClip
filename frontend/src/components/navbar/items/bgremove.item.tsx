import { useMemo, useState } from "react";
import { MdAutoFixHigh, MdImage } from "react-icons/md";
import { FaVideo } from "react-icons/fa6";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { useMediaStore } from "../../../store/media.store";
import { useEditorStore } from "../../../store/editor.store";
import { DEFAULT_MEDIA_ASSET_SETTINGS } from "../../../types/mediaAsset";
import { removeBackground, API_BASE } from "../../../utils/api";

export default function BgRemoveItem() {
  const mediaAssets = useMediaStore((s) => s.assets);
  const addAsset = useMediaStore((s) => s.addAsset);
  const { canvasWidth, canvasHeight } = useEditorStore();

  const cuttable = useMemo(
    () => mediaAssets.filter((a) => a.type === "img" || a.type === "video"),
    [mediaAssets],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const selected = cuttable.find((a) => a.id === selectedId) ?? null;

  async function handleRun() {
    if (!selected) {
      setError("Select an image or video first.");
      return;
    }
    setError(null);
    setDone(null);
    setBusy(true);

    try {
      const blob = await (await fetch(selected.path)).blob();
      const file = new File([blob], selected.name, {
        type: blob.type || (selected.type === "img" ? "image/png" : "video/mp4"),
      });
      const result = await removeBackground(file);
      const remoteUrl = `${API_BASE}${result.output_path}`;

      const localFilename = `${crypto.randomUUID()}_${result.filename}`;
      const localPath = await invoke<string>("download_to_app_data", {
        url: remoteUrl,
        filename: localFilename,
      });
      const assetPath = convertFileSrc(localPath);

      let nativeW = 0;
      let nativeH = 0;
      let duration = 5;

      if (result.media_kind === "video") {
        const vid = document.createElement("video");
        vid.src = assetPath;
        vid.preload = "metadata";
        await new Promise<void>((resolve) => {
          vid.onloadedmetadata = () => resolve();
          vid.onerror = () => resolve();
        });
        nativeW = vid.videoWidth || selected.width;
        nativeH = vid.videoHeight || selected.height;
        duration = vid.duration || selected.endTime - selected.startTime;
      } else {
        const img = new Image();
        img.src = assetPath;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        nativeW = img.naturalWidth || selected.width;
        nativeH = img.naturalHeight || selected.height;
        duration = selected.endTime - selected.startTime;
      }

      let fitW = nativeW;
      let fitH = nativeH;
      let fitX = 0;
      let fitY = 0;
      if (nativeW > 0 && nativeH > 0) {
        const s = Math.min(canvasWidth / nativeW, canvasHeight / nativeH);
        fitW = Math.round(nativeW * s);
        fitH = Math.round(nativeH * s);
        fitX = Math.round((canvasWidth - fitW) / 2);
        fitY = Math.round((canvasHeight - fitH) / 2);
      }

      addAsset({
        ...DEFAULT_MEDIA_ASSET_SETTINGS,
        type: result.media_kind,
        path: assetPath,
        name: `nobg_${selected.name}`,
        endTime: duration,
        width: fitW,
        height: fitH,
        x: fitX,
        y: fitY,
      });

      setDone(`Done — added "nobg_${selected.name}" to Media.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Background removal failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 p-2">
      <h2 className="text-2xl border-b-2 border-b-shadow w-full">Background</h2>

      <p className="text-[10px] text-typography/50 mt-3 leading-relaxed">
        AI-powered background removal via rembg (U2Net). Images return as
        transparent PNG. Videos return as VP9 WebM with alpha. Processing
        videos is slow — expect ~1–3 seconds per frame on CPU.
      </p>

      {/* Asset selector */}
      <label className="text-[10px] text-typography/50 mt-4 mb-1">Source</label>
      {cuttable.length === 0 ? (
        <p className="text-xs text-typography/40 italic">
          No images or videos in library. Upload one in the Media tab first.
        </p>
      ) : (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-base text-typography text-xs px-2 py-1.5 rounded border border-shadow/50 outline-none cursor-pointer hover:border-shadow transition-colors"
        >
          <option value="" className="bg-dark">— choose —</option>
          {cuttable.map((a) => (
            <option key={a.id} value={a.id} className="bg-dark">
              {a.type === "video" ? "🎬" : "🖼"} {a.name}
            </option>
          ))}
        </select>
      )}

      {/* Preview */}
      {selected && (
        <div
          className="mt-3 w-full bg-black rounded overflow-hidden border border-shadow/30"
          style={{ aspectRatio: "16/9" }}
        >
          {selected.type === "video" ? (
            <video src={selected.path} className="w-full h-full object-contain" muted />
          ) : (
            <img src={selected.path} className="w-full h-full object-contain" alt="" />
          )}
        </div>
      )}

      <p className="text-[10px] text-typography/40 mt-2">
        {selected ? (
          <>
            Will produce a{" "}
            <span className="text-typography/70">
              {selected.type === "video" ? (
                <>
                  <FaVideo className="inline mb-0.5" size={11} /> WebM (alpha)
                </>
              ) : (
                <>
                  <MdImage className="inline mb-0.5" size={12} /> PNG (alpha)
                </>
              )}
            </span>{" "}
            and add it to Media.
          </>
        ) : (
          "Select an asset to begin."
        )}
      </p>

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      {done && !error && <p className="text-xs text-green-400 mt-3">{done}</p>}

      <div className="flex-1" />

      <button
        onClick={handleRun}
        disabled={busy || !selected}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-primary rounded py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        <MdAutoFixHigh size={15} />
        {busy ? "Removing…" : "Remove Background"}
      </button>
    </div>
  );
}
