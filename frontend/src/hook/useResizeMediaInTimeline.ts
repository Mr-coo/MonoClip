import { useRef } from "react";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";
import { PreviewStateType } from "../enum/previewStateType.enum";
import { useEditorStore } from "../store/editor.store";

export function useResizeMediaInTimeline(mediaId: string) {
  const timelineStore = useTimelineStore();
  const editorStore = useEditorStore();

  const endTimeRef = useRef(0);

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find(a => a.id === mediaId);
      if (!media) return;

      endTimeRef.current = media.endTime;
    },

    onMove(dx, _) {
      const nextDx = Math.max(0, endTimeRef.current + dx / editorStore.pixelPerSecond);
      timelineStore.previewMoveMedia(mediaId, PreviewStateType.EDIT_MEDIA_ENDTIME, nextDx, 0);
    },

    onEnd() {
      timelineStore.commit();
    },
  });
}
