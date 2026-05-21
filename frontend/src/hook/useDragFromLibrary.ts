import { useRef } from "react";
import { MediaAsset } from "../types/mediaAsset";
import { useDragLibraryStore } from "../store/dragLibrary.store";
import { useTimelineStore } from "../store/timeline.store";
import { useEditorStore } from "../store/editor.store";

const DRAG_THRESHOLD = 6;
export const TIMELINE_DROP_ID = "timeline-drop-zone";
// resize handle (h-1 = 4px) + ruler (h-8 = 32px)
const HEADER_HEIGHT = 36;

export function useDragFromLibrary(asset: MediaAsset, onSimpleClick: () => void) {
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (!isDragging.current) {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        isDragging.current = true;
        useDragLibraryStore.getState().startDrag(asset, e.clientX, e.clientY);
      }
    } else {
      useDragLibraryStore.getState().moveDrag(e.clientX, e.clientY);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (isDragging.current) {
      const el = document.getElementById(TIMELINE_DROP_ID);
      if (el) {
        const rect = el.getBoundingClientRect();
        const inside =
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top  && e.clientY <= rect.bottom;

        if (inside) {
          const { pixelPerSecond, layerHeight } = useEditorStore.getState();
          const relX = e.clientX - rect.left + el.scrollLeft;
          const relY = e.clientY - rect.top  + el.scrollTop - HEADER_HEIGHT;
          const startInTimeLine = Math.max(0, relX / pixelPerSecond);
          const layer = Math.max(1, Math.ceil(relY / layerHeight));
          useTimelineStore.getState().dropAsset(asset, startInTimeLine, layer);
        }
      }
      useDragLibraryStore.getState().endDrag();
    } else {
      onSimpleClick();
    }

    isDragging.current = false;
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}
