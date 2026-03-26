import { useRef } from "react";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";
import { PreviewStateType } from "../enum/previewStateType.enum";

type ResizeCorner = "tl" | "tr" | "bl" | "br";

export function useResizeMediaInContent(mediaId: string, corner: ResizeCorner) {
  const timelineStore = useTimelineStore();

  const widthRef = useRef(0);
  const heightRef = useRef(0);
  const xRef = useRef(0);
  const yRef = useRef(0);

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find(a => a.id === mediaId);
      if (!media) return;

      widthRef.current = media.width;
      heightRef.current = media.height;
      xRef.current = media.x;
      yRef.current = media.y;
    },

    onMove(dx, dy) {
      const MIN_SIZE = 10;
      let newWidth = widthRef.current;
      let newHeight = heightRef.current;
      let newX = xRef.current;
      let newY = yRef.current;

      if (corner === "br") {
        // Bottom-right: drag increases width and height
        newWidth = Math.max(MIN_SIZE, widthRef.current + dx);
        newHeight = Math.max(MIN_SIZE, heightRef.current + dy);
      } else if (corner === "bl") {
        // Bottom-left: drag increases height, decreases width (from left)
        newWidth = Math.max(MIN_SIZE, widthRef.current - dx);
        newX = xRef.current + dx;
        newHeight = Math.max(MIN_SIZE, heightRef.current + dy);
      } else if (corner === "tr") {
        // Top-right: drag increases width, decreases height (from top)
        newWidth = Math.max(MIN_SIZE, widthRef.current + dx);
        newY = yRef.current + dy;
        newHeight = Math.max(MIN_SIZE, heightRef.current - dy);
      } else if (corner === "tl") {
        // Top-left: drag decreases width and height
        newWidth = Math.max(MIN_SIZE, widthRef.current - dx);
        newX = xRef.current + dx;
        newY = yRef.current + dy;
        newHeight = Math.max(MIN_SIZE, heightRef.current - dy);
      }

      timelineStore.previewResizeMedia(
        mediaId,
        PreviewStateType.EDIT_MEDIA_SIZE,
        newWidth,
        newHeight,
        newX,
        newY
      );
    },

    onEnd() {
      timelineStore.commit();
    },
  });
}
