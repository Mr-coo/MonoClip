import { useRef } from "react";
import { useEditorStore } from "../store/editor.store";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";
import { PreviewStateType } from "../enum/previewStateType.enum";

export function useMoveMediaInContent(mediaId: string) {
  const timelineStore = useTimelineStore();

  const xRef = useRef(0);
  const yRef = useRef(0);

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find(a => a.id === mediaId);
      if (!media) return;

      xRef.current = media.x;
      yRef.current = media.y;
    },

    onMove(dx, dy) {
      const nextDx = Math.max(0, xRef.current + dx);
      const nextDy = Math.max(1, yRef.current + dy);
      timelineStore.previewMoveMedia(mediaId, PreviewStateType.EDIT_MEDIA_POSITION, nextDx, nextDy);
    },

    onEnd() {
      timelineStore.commit();
    },
  });
}
