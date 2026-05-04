import { useRef } from "react";
import { useTimelineStore } from "../store/timeline.store";
import { useEditorStore } from "../store/editor.store";
import { usePointerDrag } from "./usePointerDrag";
import { PreviewStateType } from "../enum/previewStateType.enum";
import { snapToCanvas } from "../utils/canvasSnap";

export function useMoveMediaInContent(mediaId: string) {
  const timelineStore = useTimelineStore();

  const xRef = useRef(0);
  const yRef = useRef(0);
  const wRef = useRef(0);
  const hRef = useRef(0);

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find(a => a.id === mediaId);
      if (!media) return;
      xRef.current = media.x;
      yRef.current = media.y;
      wRef.current = media.width;
      hRef.current = media.height;
    },

    onMove(dx, dy) {
      const { canvasWidth, canvasHeight, contentScale, setSnapGuides } = useEditorStore.getState();
      const scale = contentScale || 1;

      const rawX = xRef.current + dx / scale;
      const rawY = yRef.current + dy / scale;

      const { x, y, guides } = snapToCanvas(rawX, rawY, wRef.current, hRef.current, canvasWidth, canvasHeight);
      setSnapGuides(guides);
      timelineStore.previewMoveMedia(mediaId, PreviewStateType.EDIT_MEDIA_POSITION, x, y);
    },

    onEnd() {
      useEditorStore.getState().setSnapGuides(null);
      timelineStore.commit();
    },
  });
}
