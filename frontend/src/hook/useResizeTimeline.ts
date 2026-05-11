import { useRef } from "react";
import { useEditorStore } from "../store/editor.store";
import { usePointerDrag } from "./usePointerDrag";

export function useResizeTimeline() {
  const store = useEditorStore();
  const startHeight = useRef(0);

  return usePointerDrag({
    onStart() {
      startHeight.current = store.timelineHeight;
    },
    onMove(_, dy) {
      const newHeight = startHeight.current - dy;

      const min = 100;
      const max = window.innerHeight * 0.8;

      if (newHeight >= min && newHeight <= max) {
        store.setTimelineHeight(newHeight);
      }
    },
  });
}
