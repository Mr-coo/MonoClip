import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MdBlurOn, MdOpenInFull, MdCheck, MdClose } from "react-icons/md";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { useMediaStore } from "../../../store/media.store";
import { useEditorStore } from "../../../store/editor.store";
import { DEFAULT_MEDIA_ASSET_SETTINGS } from "../../../types/mediaAsset";
import { blurObject, API_BASE, type BlurShape } from "../../../utils/api";

interface DrawRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SIDEBAR_W = 320;
const SIDEBAR_H = 180;
const MODAL_W = 1280;
const MODAL_H = 720;

// ─── shared drawing helpers ───────────────────────────────────────────────────

function paintOverlay(
  ctx: CanvasRenderingContext2D,
  frame: ImageData,
  cw: number,
  ch: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  shape: BlurShape,
) {
  const bx = Math.min(startX, endX);
  const by = Math.min(startY, endY);
  const bw = Math.abs(endX - startX);
  const bh = Math.abs(endY - startY);
  const cx = bx + bw / 2;
  const cy = by + bh / 2;

  ctx.putImageData(frame, 0, 0);

  // Dim everything except the selected shape. An even-odd fill of "whole canvas
  // minus the shape path" reveals an exact rectangle or ellipse hole — unlike
  // putImageData, which can only restore a rectangular region.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  if (bw > 0 && bh > 0) {
    if (shape === "circle") ctx.ellipse(cx, cy, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    else ctx.rect(bx, by, bw, bh);
  }
  ctx.fill("evenodd");

  ctx.strokeStyle = "#22ee88";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  if (bw > 0 && bh > 0 && shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(cx, cy, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
  }
  ctx.setLineDash([]);

  const hs = 6;
  ctx.fillStyle = "#22ee88";
  for (const [hx, hy] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) {
    ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
  }
}

function canvasPosToBBox(
  rect: DrawRect,
  transform: { offsetX: number; offsetY: number; scale: number },
  natural: { w: number; h: number },
): BBox {
  const { offsetX, offsetY, scale } = transform;
  const x = Math.round((Math.min(rect.startX, rect.endX) - offsetX) / scale);
  const y = Math.round((Math.min(rect.startY, rect.endY) - offsetY) / scale);
  const w = Math.round(Math.abs(rect.endX - rect.startX) / scale);
  const h = Math.round(Math.abs(rect.endY - rect.startY) / scale);
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    w: Math.min(w, natural.w - Math.max(0, x)),
    h: Math.min(h, natural.h - Math.max(0, y)),
  };
}

async function loadFrameToCanvas(
  assetPath: string,
  canvas: HTMLCanvasElement,
  cw: number,
  ch: number,
): Promise<{ transform: { offsetX: number; offsetY: number; scale: number }; natural: { w: number; h: number }; frame: ImageData }> {
  const blob = await (await fetch(assetPath)).blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const vid = document.createElement("video");
    vid.src = blobUrl;
    vid.muted = true;
    vid.preload = "auto";
    await new Promise<void>((resolve, reject) => {
      vid.addEventListener("loadeddata", () => resolve(), { once: true });
      vid.addEventListener("error", () => reject(new Error("load error")), { once: true });
      vid.load();
    });
    const ctx = canvas.getContext("2d")!;
    const vw = vid.videoWidth;
    const vh = vid.videoHeight;
    const scale = Math.min(cw / vw, ch / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const offsetX = (cw - dw) / 2;
    const offsetY = (ch - dh) / 2;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(vid, offsetX, offsetY, dw, dh);
    return {
      transform: { offsetX, offsetY, scale },
      natural: { w: vw, h: vh },
      frame: ctx.getImageData(0, 0, cw, ch),
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

// ─── BboxModal ────────────────────────────────────────────────────────────────

interface BboxModalProps {
  assetPath: string;
  shape: BlurShape;
  onConfirm: (bbox: BBox) => void;
  onClose: () => void;
}

function BboxModal({ assetPath, shape, onConfirm, onClose }: BboxModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<ImageData | null>(null);
  const transformRef = useRef<{ offsetX: number; offsetY: number; scale: number } | null>(null);
  const naturalRef = useRef({ w: 0, h: 0 });
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawRect, setDrawRect] = useState<DrawRect | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = canvasRef.current;
        if (!c) return;
        const { transform, natural, frame } = await loadFrameToCanvas(assetPath, c, MODAL_W, MODAL_H);
        if (cancelled) return;
        transformRef.current = transform;
        naturalRef.current = natural;
        frameRef.current = frame;
        setLoaded(true);
      } catch { /* stay blank */ }
    })();
    return () => { cancelled = true; };
  }, [assetPath]);

  // Repaint the current selection when the shape toggles while the modal is open.
  useEffect(() => {
    if (!drawRect || !frameRef.current || !canvasRef.current) return;
    paintOverlay(
      canvasRef.current.getContext("2d")!,
      frameRef.current,
      MODAL_W,
      MODAL_H,
      drawRect.startX,
      drawRect.startY,
      drawRect.endX,
      drawRect.endY,
      shape,
    );
  }, [shape, drawRect]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - r.left) * (MODAL_W / r.width)),
      y: Math.round((e.clientY - r.top) * (MODAL_H / r.height)),
    };
  };

  const redraw = (s: { x: number; y: number }, e: { x: number; y: number }) => {
    const c = canvasRef.current;
    if (!c || !frameRef.current) return;
    paintOverlay(c.getContext("2d")!, frameRef.current, MODAL_W, MODAL_H, s.x, s.y, e.x, e.y, shape);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!loaded) return;
    const pos = getPos(e);
    drawStartRef.current = pos;
    setIsDrawing(true);
    setDrawRect(null);
    if (canvasRef.current && frameRef.current)
      canvasRef.current.getContext("2d")!.putImageData(frameRef.current, 0, 0);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStartRef.current) return;
    const pos = getPos(e);
    redraw(drawStartRef.current, pos);
    setDrawRect({ startX: drawStartRef.current.x, startY: drawStartRef.current.y, endX: pos.x, endY: pos.y });
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStartRef.current) return;
    const pos = getPos(e);
    redraw(drawStartRef.current, pos);
    setDrawRect({ startX: drawStartRef.current.x, startY: drawStartRef.current.y, endX: pos.x, endY: pos.y });
    setIsDrawing(false);
    drawStartRef.current = null;
  };

  const bbox = drawRect && transformRef.current
    ? canvasPosToBBox(drawRect, transformRef.current, naturalRef.current)
    : null;
  const valid = bbox != null && bbox.w > 4 && bbox.h > 4;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col bg-dark rounded-lg overflow-hidden shadow-2xl" style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
          <span className="text-xs text-typography/60">
            Drag to draw the {shape === "circle" ? "circle" : "box"} over the area to blur
          </span>
          <button onClick={onClose} className="text-typography/50 hover:text-typography ml-6 transition-colors">
            <MdClose size={18} />
          </button>
        </div>

        {/* canvas */}
        <div className="relative bg-black" style={{ width: "80vw", aspectRatio: "16/9" }}>
          {!loaded && (
            <span className="absolute inset-0 flex items-center justify-center text-typography/30 text-sm pointer-events-none">
              Loading frame…
            </span>
          )}
          <canvas
            ref={canvasRef}
            width={MODAL_W}
            height={MODAL_H}
            className={`block w-full h-full ${loaded ? "cursor-crosshair" : "cursor-default"}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); drawStartRef.current = null; } }}
          />
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 shrink-0">
          <span className="text-[10px] text-typography/40 tabular-nums">
            {valid && bbox
              ? `x=${bbox.x}  y=${bbox.y}  w=${bbox.w}  h=${bbox.h} px`
              : "Click and drag to select the area"}
          </span>
          <button
            onClick={() => valid && bbox && onConfirm(bbox)}
            disabled={!valid}
            className="flex items-center gap-1.5 bg-shadow text-typography text-xs px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <MdCheck size={14} />
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── BlurItem ─────────────────────────────────────────────────────────────────

export default function BlurItem() {
  const mediaAssets = useMediaStore((s) => s.assets);
  const addAsset = useMediaStore((s) => s.addAsset);
  const { canvasWidth, canvasHeight } = useEditorStore();

  const videoAssets = useMemo(
    () => mediaAssets.filter((a) => a.type === "video"),
    [mediaAssets],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [shape, setShape] = useState<BlurShape>("rect");
  const [strength, setStrength] = useState(0.3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmedBbox, setConfirmedBbox] = useState<BBox | null>(null);

  // sidebar preview canvas (non-interactive)
  const previewRef = useRef<HTMLCanvasElement>(null);
  const previewFrameRef = useRef<ImageData | null>(null);
  const previewTransformRef = useRef<{ offsetX: number; offsetY: number; scale: number } | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const selectedAsset = videoAssets.find((a) => a.id === selectedId);

  // Load preview frame when video selection changes
  useEffect(() => {
    setConfirmedBbox(null);
    setPreviewLoaded(false);
    previewFrameRef.current = null;
    previewTransformRef.current = null;
    const c = previewRef.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, SIDEBAR_W, SIDEBAR_H);
    if (!selectedId || !selectedAsset) return;

    let cancelled = false;
    (async () => {
      try {
        const c = previewRef.current;
        if (!c) return;
        const { transform, frame } = await loadFrameToCanvas(selectedAsset.path, c, SIDEBAR_W, SIDEBAR_H);
        if (cancelled) return;
        previewTransformRef.current = transform;
        previewFrameRef.current = frame;
        setPreviewLoaded(true);
      } catch { /* stay blank */ }
    })();
    return () => { cancelled = true; };
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw sidebar preview whenever the confirmed box or shape changes
  useEffect(() => {
    const c = previewRef.current;
    const frame = previewFrameRef.current;
    const transform = previewTransformRef.current;
    if (!c || !frame) return;
    const ctx = c.getContext("2d")!;
    if (!confirmedBbox || !transform) {
      ctx.putImageData(frame, 0, 0);
      return;
    }
    const { offsetX, offsetY, scale } = transform;
    const bx = Math.round(confirmedBbox.x * scale + offsetX);
    const by = Math.round(confirmedBbox.y * scale + offsetY);
    const bw = Math.round(confirmedBbox.w * scale);
    const bh = Math.round(confirmedBbox.h * scale);
    paintOverlay(ctx, frame, SIDEBAR_W, SIDEBAR_H, bx, by, bx + bw, by + bh, shape);
  }, [confirmedBbox, previewLoaded, shape]);

  const hasValidBox = confirmedBbox != null && confirmedBbox.w > 4 && confirmedBbox.h > 4;

  async function handleBlur() {
    if (!selectedAsset) { setError("Select a video first."); return; }
    if (!hasValidBox || !confirmedBbox) { setError("Draw a selection on the first frame."); return; }
    setError(null);
    setDone(false);
    setLoading(true);
    try {
      const blob = await (await fetch(selectedAsset.path)).blob();
      const file = new File([blob], selectedAsset.name, { type: blob.type || "video/mp4" });
      const result = await blurObject(file, confirmedBbox.x, confirmedBbox.y, confirmedBbox.w, confirmedBbox.h, shape, strength);
      const remoteUrl = `${API_BASE}${result.output_video_path}`;

      // Persist the blurred video to local app-data so export reads a file path,
      // not an HTTP URL that depends on the backend still being up.
      const remoteFilename = result.output_video_path.split("/").pop() || `blurred_${Date.now()}.mp4`;
      const localFilename = `${crypto.randomUUID()}_${remoteFilename}`;
      const localPath = await invoke<string>("download_to_app_data", {
        url: remoteUrl,
        filename: localFilename,
      });
      const blurredPath = convertFileSrc(localPath);

      const vid = document.createElement("video");
      vid.src = blurredPath;
      vid.preload = "metadata";
      await new Promise<void>((resolve) => {
        vid.onloadedmetadata = () => resolve();
        vid.onerror = () => resolve();
      });

      const vw = vid.videoWidth || canvasWidth;
      const vh = vid.videoHeight || canvasHeight;
      const scale = Math.min(canvasWidth / vw, canvasHeight / vh);
      const fitW = Math.round(vw * scale);
      const fitH = Math.round(vh * scale);

      addAsset({
        ...DEFAULT_MEDIA_ASSET_SETTINGS,
        type: "video",
        path: blurredPath,
        name: `blurred_${selectedAsset.name}`,
        endTime: vid.duration || selectedAsset.endTime,
        width: fitW,
        height: fitH,
        x: Math.round((canvasWidth - fitW) / 2),
        y: Math.round((canvasHeight - fitH) / 2),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Blur failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 p-2">
      <h2 className="text-2xl border-b-2 border-b-shadow w-full">Blur</h2>

      <p className="text-[10px] text-typography/50 mt-3 leading-relaxed">
        Select a video, draw a box or circle over the area in the first frame, then click Blur. The selection is tracked and blurred as it moves.
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
            <option key={a.id} value={a.id} className="bg-dark">{a.name}</option>
          ))}
        </select>
      )}

      {/* Shape toggle */}
      <label className="text-[10px] text-typography/50 mt-4 mb-1">Shape</label>
      <div className="flex gap-1.5">
        {(["rect", "circle"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${
              shape === s
                ? "bg-shadow border-shadow text-typography"
                : "bg-base border-shadow/40 text-typography/60 hover:border-shadow"
            }`}
          >
            {s === "rect" ? "Rectangle" : "Circle"}
          </button>
        ))}
      </div>

      {/* Preview canvas + expand button */}
      <label className="text-[10px] text-typography/50 mt-4 mb-1">Selection</label>
      <div className="relative w-full bg-black rounded overflow-hidden border border-shadow/30" style={{ aspectRatio: "16/9" }}>
        {!selectedId && (
          <span className="absolute inset-0 flex items-center justify-center text-typography/30 text-[10px] pointer-events-none select-none">
            No video selected
          </span>
        )}
        {selectedId && !previewLoaded && (
          <span className="absolute inset-0 flex items-center justify-center text-typography/30 text-[10px] pointer-events-none select-none">
            Loading frame…
          </span>
        )}
        <canvas
          ref={previewRef}
          width={SIDEBAR_W}
          height={SIDEBAR_H}
          className="block w-full h-full"
        />
        {previewLoaded && (
          <button
            onClick={() => setModalOpen(true)}
            className="absolute bottom-1.5 right-1.5 bg-black/60 hover:bg-black/90 text-typography/70 hover:text-typography rounded p-1 transition-colors"
            title="Expand to draw"
          >
            <MdOpenInFull size={14} />
          </button>
        )}
        {previewLoaded && !hasValidBox && (
          <button
            onClick={() => setModalOpen(true)}
            className="absolute inset-0 flex items-center justify-center text-typography/30 text-[10px] hover:text-typography/60 transition-colors cursor-pointer select-none"
          >
            Click to draw selection
          </button>
        )}
      </div>

      <p className="text-[9px] text-typography/40 mt-1 h-3 tabular-nums">
        {hasValidBox && confirmedBbox
          ? `x=${confirmedBbox.x} y=${confirmedBbox.y} w=${confirmedBbox.w} h=${confirmedBbox.h} px — click preview to redraw`
          : ""}
      </p>

      {/* Blur strength */}
      <label className="text-[10px] text-typography/50 mt-3 mb-1">Blur strength</label>
      <input
        type="number"
        value={strength}
        min={0.1}
        max={1}
        step={0.05}
        onChange={(e) => setStrength(Number(e.target.value))}
        className="bg-dark/60 rounded px-2 py-1 text-xs text-typography outline-none focus:ring-1 focus:ring-primary/60 w-full"
      />

      {/* Status */}
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      {done && <p className="text-xs text-green-400 mt-3">Done — blurred video added to Media.</p>}

      {/* Blur button */}
      <button
        onClick={handleBlur}
        disabled={loading || !selectedId || !hasValidBox}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-shadow rounded py-2 text-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        <MdBlurOn size={15} />
        {loading ? "Blurring…" : "Blur Object"}
      </button>

      {/* Modal */}
      {modalOpen && selectedAsset && (
        <BboxModal
          assetPath={selectedAsset.path}
          shape={shape}
          onConfirm={(bbox) => { setConfirmedBbox(bbox); setModalOpen(false); }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
