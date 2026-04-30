import { useMemo, useRef, useEffect } from "react";
import { useTimelineStore } from "../../store/timeline.store";
import { FaPlay, FaPause, FaScissors, FaPlus, FaMinus } from "react-icons/fa6";
import { TiArrowSortedDown } from "react-icons/ti";
import { useReziseTimeline } from "../../hook/useResizeTimeline";
import { useEditorStore } from "../../store/editor.store";
import { TimelineMedia } from "./TimelineMediaAsset";
import { useRewindTimeline } from "../../hook/useRewindTimeline";

const MIN_ZOOM = 5;
const MAX_ZOOM = 200;

function formatRulerLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Timeline() {
  const { assets, currentTime, isPlaying, selectedAssetId, togglePlay, cutAsset, selectAsset } = useTimelineStore();
  const editorStore = useEditorStore();
  const resizeTimelineHook = useReziseTimeline();
  const rewindTimelineHook = useRewindTimeline();
  const containerRef = useRef<HTMLDivElement>(null);
  const pixelPerSecondRef = useRef(editorStore.pixelPerSecond);
  pixelPerSecondRef.current = editorStore.pixelPerSecond;

  const totalDuration = useMemo(() => {
    if (assets.length === 0) return 120;
    return Math.max(...assets.map((a) => a.startInTimeLine + (a.endTime - a.startTime)), 120);
  }, [assets]);

  const rulerSeconds = Math.ceil(totalDuration) + 30;

  const layersCount = useMemo(() => {
    if (assets.length === 0) return 5;
    return Math.max(...assets.map((a) => a.layer), 5);
  }, [assets]);

  // Choose a major-tick interval that keeps labels ~80px apart
  const majorInterval = useMemo(() => {
    const targetPx = 80;
    const raw = targetPx / editorStore.pixelPerSecond;
    const nice = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    return nice.find((n) => n >= raw) ?? 600;
  }, [editorStore.pixelPerSecond]);

  const sortedMedias = useMemo(() => {
    return [...assets].sort((a, b) => {
      if (b.layer !== a.layer) return b.layer - a.layer;
      return a.startInTimeLine - b.startInTimeLine;
    });
  }, [assets]);

  // Non-passive wheel listener so we can preventDefault on Ctrl+scroll zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const current = pixelPerSecondRef.current;
      const next =
        e.deltaY < 0
          ? Math.min(current * 1.5, MAX_ZOOM)
          : Math.max(current / 1.5, MIN_ZOOM);
      useEditorStore.getState().setPixelPerSecond(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function zoomIn() {
    editorStore.setPixelPerSecond(Math.min(editorStore.pixelPerSecond * 1.5, MAX_ZOOM));
  }

  function zoomOut() {
    editorStore.setPixelPerSecond(Math.max(editorStore.pixelPerSecond / 1.5, MIN_ZOOM));
  }

  const timelineWidth = rulerSeconds * editorStore.pixelPerSecond;
  const contentHeight = layersCount * editorStore.layerHeight;

  return (
    <div>
      <div className="w-full relative flex justify-center items-center gap-2 p-2">
        <button
          className="bg-primary p-3 rounded-4xl hover:bg-primary/80"
          onClick={togglePlay}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button
          className={`p-3 rounded-4xl transition-colors ${
            selectedAssetId
              ? "bg-primary hover:bg-primary/80"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
          onClick={cutAsset}
          disabled={!selectedAssetId}
          title="Cut selected asset at playhead"
        >
          <FaScissors />
        </button>
        <button
          className="bg-white/10 p-2 rounded-4xl hover:bg-white/20 transition-colors"
          onClick={zoomOut}
          title="Zoom out (Ctrl+scroll down)"
        >
          <FaMinus size={12} />
        </button>
        <button
          className="bg-white/10 p-2 rounded-4xl hover:bg-white/20 transition-colors"
          onClick={zoomIn}
          title="Zoom in (Ctrl+scroll up)"
        >
          <FaPlus size={12} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="bg-mid w-full overflow-x-auto overflow-y-auto relative border-t border-white/10 px-2 no-scrollbar"
        style={{ height: `${editorStore.timelineHeight}px` }}
      >
        {/* Playhead */}
        <div
          className="group"
          onPointerDown={rewindTimelineHook.onPointerDown}
          onPointerMove={rewindTimelineHook.onPointerMove}
          onPointerUp={rewindTimelineHook.onPointerUp}
        >
          <div
            className="absolute z-11 p-px rounded-4xl group-hover:bg-primary"
            style={{ left: `${currentTime * editorStore.pixelPerSecond}px` }}
          >
            <TiArrowSortedDown size={15} />
          </div>
          <div
            className="bg-typography w-px h-full absolute z-10 translate-2 group-hover:bg-primary group-hover:w-1 group-hover:translate-1.5"
            style={{ left: `${currentTime * editorStore.pixelPerSecond}px` }}
          />
        </div>

        {/* Timeline resize handle */}
        <div
          className="bg-mid hover:bg-primary w-full h-1 cursor-ns-resize transition-colors z-50"
          onPointerDown={resizeTimelineHook.onPointerDown}
          onPointerMove={resizeTimelineHook.onPointerMove}
          onPointerUp={resizeTimelineHook.onPointerUp}
        />

        {/* Ruler */}
        <div
          className="bg-mid-300 h-8 relative flex-shrink-0"
          style={{ width: `${timelineWidth}px` }}
        >
          {Array(rulerSeconds)
            .fill(0)
            .map((_, i) => {
              const isMajor = i % majorInterval === 0;
              return (
                <div
                  key={i}
                  className="w-px bg-typography absolute text-xs"
                  style={{
                    left: `${i * editorStore.pixelPerSecond}px`,
                    height: `${isMajor ? 10 : 5}px`,
                  }}
                >
                  {isMajor && (
                    <div className="absolute top-4 -left-2 text-typography whitespace-nowrap">
                      {formatRulerLabel(i)}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Clips + layer dividers */}
        <div
          className="relative"
          style={{ width: `${timelineWidth}px`, height: `${contentHeight}px` }}
          onClick={() => selectAsset(null)}
        >
          {sortedMedias.map((media, i) => (
            <TimelineMedia key={i} media={media} />
          ))}
          {Array(layersCount)
            .fill(0)
            .map((_, i) => (
              <div
                key={i + 1}
                className="bg-shadow/80 w-full h-px absolute left-0"
                style={{ top: `${(i + 1) * editorStore.layerHeight - 3}px` }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
