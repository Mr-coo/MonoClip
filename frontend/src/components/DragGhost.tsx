import { useMemo } from "react";
import { useDragLibraryStore } from "../store/dragLibrary.store";
import { TIMELINE_DROP_ID } from "../hook/useDragFromLibrary";

const TYPE_DOT: Record<string, string> = {
  video: "bg-blue-400",
  audio: "bg-green-400",
  img:   "bg-purple-400",
};

export function DragGhost() {
  const { dragging, ghostX, ghostY } = useDragLibraryStore();

  const overTimeline = useMemo(() => {
    if (!dragging) return false;
    const el = document.getElementById(TIMELINE_DROP_ID);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return ghostX >= r.left && ghostX <= r.right && ghostY >= r.top && ghostY <= r.bottom;
  }, [dragging, ghostX, ghostY]);

  if (!dragging) return null;

  const dot = TYPE_DOT[dragging.type] ?? "bg-gray-400";

  return (
    <div
      style={{
        position: "fixed",
        left: ghostX + 14,
        top: ghostY + 14,
        pointerEvents: "none",
        zIndex: 9999,
      }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded shadow-lg text-xs text-white select-none transition-opacity ${
        overTimeline
          ? "bg-primary/90 ring-1 ring-white/40"
          : "bg-gray-800/90 opacity-80"
      }`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className="max-w-28 truncate">{dragging.name}</span>
    </div>
  );
}
