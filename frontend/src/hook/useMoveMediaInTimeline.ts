import { useRef } from "react";
import { useEditorStore } from "../store/editor.store";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";

export function useMoveMediaInTimeline(mediaId: string) {
  const timelineStore = useTimelineStore();
  const editorStore = useEditorStore();

  const startRef = useRef(0);

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find(a => a.id === mediaId);
      if (!media) return;

      startRef.current = media.startInTimeLine;
    },

    onMove(dx) {
      const dt = dx / editorStore.pixelPerSecond;
      const next = Math.max(0, startRef.current + dt);

      timelineStore.previewMoveMedia(mediaId, next);
    },

    onEnd() {
      timelineStore.commit();
    },
  });
}
