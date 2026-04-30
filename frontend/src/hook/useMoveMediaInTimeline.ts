import { useRef } from "react";
import { useEditorStore } from "../store/editor.store";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";
import { PreviewStateType } from "../enum/previewStateType.enum";
import { snapMoveStart } from "../utils/snapUtils";

export function useMoveMediaInTimeline(mediaId: string) {
  const timelineStore = useTimelineStore();
  const editorStore = useEditorStore();

  const startRef = useRef(0);
  const layerRef = useRef(1);
  const durationRef = useRef(0);

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find((a) => a.id === mediaId);
      if (!media) return;
      startRef.current = media.startInTimeLine;
      layerRef.current = media.layer;
      durationRef.current = media.endTime - media.startTime;
    },

    onMove(dx, dy) {
      const rawDx = Math.max(0, startRef.current + dx / editorStore.pixelPerSecond);
      const rawDy = Math.max(1, layerRef.current + Math.round(dy / editorStore.layerHeight));
      const snapped = snapMoveStart(
        rawDx,
        mediaId,
        rawDy,
        durationRef.current,
        useTimelineStore.getState().assets
      );
      timelineStore.previewMoveMedia(mediaId, PreviewStateType.EDIT_MEDIA_TIME, snapped, rawDy);
    },

    onEnd() {
      timelineStore.commit();
    },
  });
}