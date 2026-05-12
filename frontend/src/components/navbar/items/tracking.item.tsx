import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MdMyLocation, MdOpenInFull, MdCheck, MdClose } from "react-icons/md";
import { useMediaStore } from "../../../store/media.store";
import { useEditorStore } from "../../../store/editor.store";
import { DEFAULT_MEDIA_ASSET_SETTINGS } from "../../../types/mediaAsset";
import { trackObject, API_BASE } from "../../../utils/api";

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
) {
  const bx = Math.min(startX, endX);
  const by = Math.min(startY, endY);
  const bw = Math.abs(endX - startX);
  const bh = Math.abs(endY - startY);

  ctx.putImageData(frame, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, cw, ch);
  if (bw > 0 && bh > 0) ctx.putImageData(frame, 0, 0, bx, by, bw, bh);

  ctx.strokeStyle = "#22ee88";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
  ctx.setLineDash([]);

  const hs = 6;
  ctx.fillStyle = "#22ee88";
  for (const [cx, cy] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) {
    ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
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
  onConfirm: (bbox: BBox) => void;
  onClose: () => void;
}

function BboxModal({ assetPath, onConfirm, onClose }: BboxModalProps) {
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
    paintOverlay(c.getContext("2d")!, frameRef.current, MODAL_W, MODAL_H, s.x, s.y, e.x, e.y);
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
            Drag to draw a bounding box around the object
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
              : "Click and drag to select the object"}
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

// ─── TrackingItem ─────────────────────────────────────────────────────────────

export default function TrackingItem() {
  const mediaAssets = useMediaStore((s) => s.assets);
  const addAsset = useMediaStore((s) => s.addAsset);
  const { canvasWidth, canvasHeight } = useEditorStore();

  const videoAssets = useMemo(
    () => mediaAssets.filter((a) => a.type === "video"),
    [mediaAssets],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [zoom, setZoom] = useState(1.5);
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

  // Redraw sidebar preview whenever confirmed bbox changes
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
    paintOverlay(ctx, frame, SIDEBAR_W, SIDEBAR_H, bx, by, bx + bw, by + bh);
  }, [confirmedBbox, previewLoaded]);

  const hasValidBox = confirmedBbox != null && confirmedBbox.w > 4 && confirmedBbox.h > 4;

  async function handleTrack() {
    if (!selectedAsset) { setError("Select a video first."); return; }
    if (!hasValidBox || !confirmedBbox) { setError("Draw a bounding box on the first frame."); return; }
    setError(null);
    setDone(false);
    setLoading(true);
    try {
      const blob = await (await fetch(selectedAsset.path)).blob();
      const file = new File([blob], selectedAsset.name, { type: blob.type || "video/mp4" });
      const result = await trackObject(file, confirmedBbox.x, confirmedBbox.y, confirmedBbox.w, confirmedBbox.h, zoom);
      const trackedPath = `${API_BASE}${result.output_video_path}`;

      const vid = document.createElement("video");
      vid.src = trackedPath;
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
        path: trackedPath,
        name: `tracked_${selectedAsset.name}`,
        endTime: vid.duration || selectedAsset.endTime,
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
        Select a video, draw a box around the object in the first frame, then click Track.
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

      {/* Preview canvas + expand button */}
      <label className="text-[10px] text-typography/50 mt-4 mb-1">Bounding box</label>
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
            Click to draw bounding box
          </button>
        )}
      </div>

      <p className="text-[9px] text-typography/40 mt-1 h-3 tabular-nums">
        {hasValidBox && confirmedBbox
          ? `x=${confirmedBbox.x} y=${confirmedBbox.y} w=${confirmedBbox.w} h=${confirmedBbox.h} px — click preview to redraw`
          : ""}
      </p>

      {/* Zoom factor */}
      <label className="text-[10px] text-typography/50 mt-3 mb-1">Zoom factor</label>
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
      {done && <p className="text-xs text-green-400 mt-3">Done — tracked video added to Media.</p>}

      {/* Track button */}
      <button
        onClick={handleTrack}
        disabled={loading || !selectedId || !hasValidBox}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-shadow rounded py-2 text-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        <MdMyLocation size={15} />
        {loading ? "Tracking…" : "Track Object"}
      </button>

      {/* Modal */}
      {modalOpen && selectedAsset && (
        <BboxModal
          assetPath={selectedAsset.path}
          onConfirm={(bbox) => { setConfirmedBbox(bbox); setModalOpen(false); }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}