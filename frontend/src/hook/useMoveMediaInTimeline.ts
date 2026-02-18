import { useRef } from "react";
import { useEditorStore } from "../store/editor.store";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";

export function useMoveMediaInTimeline(mediaId: string) {
  const timelineStore = useTimelineStore();
  const editorStore = useEditorStore();

  const startRef = useRef(0);
  const layerRef = useRef(1);

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find(a => a.id === mediaId);
      if (!media) return;

      startRef.current = media.startInTimeLine;
      layerRef.current = media.layer
    },

    onMove(dx, dy) {
      const nextDx = Math.max(0, startRef.current + dx / editorStore.pixelPerSecond);
      const nextDy = Math.max(1, layerRef.current + Math.round(dy / editorStore.layerHeight))
      timelineStore.previewMoveMedia(mediaId, nextDx, nextDy);
    },

    onEnd() {
      timelineStore.commit();
    },
  });
}
