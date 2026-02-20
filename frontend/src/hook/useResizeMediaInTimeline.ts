import { useRef } from "react";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";
import { PreviewStateType } from "../enum/previewStateType.enum";
import { useEditorStore } from "../store/editor.store";

export function useResizeMediaInTimeline(mediaId: string, isStart: boolean) {
  const timelineStore = useTimelineStore();
  const editorStore = useEditorStore();

  const startTimeRef = useRef(0);
  const startInTimelineRef = useRef(0);
  const endTimeRef = useRef(0);

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find(a => a.id === mediaId);
      if (!media) return;

      startTimeRef.current = media.startTime || 0;
      startInTimelineRef.current = media.startInTimeLine;
      endTimeRef.current = media.endTime;
    },

    onMove(dx, _) {
      const delta = dx / editorStore.pixelPerSecond;
      const MIN_DURATION = 0.01

      if (!isStart) {
        const nextEnd = Math.max(
          startTimeRef.current + MIN_DURATION,
          endTimeRef.current + delta
        );

        timelineStore.previewMoveMedia(
          mediaId,
          PreviewStateType.EDIT_MEDIA_END_TIME,
          nextEnd,
          0
        );
      } else {
        const nextStartTime = Math.min(
          endTimeRef.current - MIN_DURATION,
          Math.max(0, startTimeRef.current + delta)
        );

        const nextStartInTimeline = Math.min(
          endTimeRef.current - MIN_DURATION,
          Math.max(0, startInTimelineRef.current + delta)
        );

        timelineStore.previewMoveMedia(
          mediaId,
          PreviewStateType.EDIT_MEDIA_START_TIME,
          nextStartTime,
          nextStartInTimeline
        );
      }
    },

    onEnd() {
      timelineStore.commit();
    },
  });
}
