import { useRef } from "react";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";
import { PreviewStateType } from "../enum/previewStateType.enum";
import { useEditorStore } from "../store/editor.store";
import { clampResizeLeft, clampResizeRight } from "../utils/snapUtils";

export function useResizeMediaInTimeline(mediaId: string, isStart: boolean) {
  const timelineStore = useTimelineStore();
  const editorStore = useEditorStore();

  const startTimeRef = useRef(0);
  const startInTimelineRef = useRef(0);
  const endTimeRef = useRef(0);
  const layerRef = useRef(1);
  const tlEndRef = useRef(0); // fixed right edge used during left-handle resize

  return usePointerDrag({
    onStart() {
      const media = timelineStore.assets.find((a) => a.id === mediaId);
      if (!media) return;
      startTimeRef.current = media.startTime || 0;
      startInTimelineRef.current = media.startInTimeLine;
      endTimeRef.current = media.endTime;
      layerRef.current = media.layer;
      tlEndRef.current = media.startInTimeLine + (media.endTime - media.startTime);
    },

    onMove(dx) {
      const delta = dx / editorStore.pixelPerSecond;
      const MIN_DURATION = 0.01;
      const assets = useTimelineStore.getState().assets;

      if (!isStart) {
        // Right handle: extends/shrinks endTime
        const rawEnd = Math.max(startTimeRef.current + MIN_DURATION, endTimeRef.current + delta);
        const rawTlEnd = startInTimelineRef.current + (rawEnd - startTimeRef.current);
        const clampedTlEnd = clampResizeRight(
          rawTlEnd,
          startInTimelineRef.current,
          mediaId,
          layerRef.current,
          assets
        );
        const nextEnd = startTimeRef.current + (clampedTlEnd - startInTimelineRef.current);
        timelineStore.previewMoveMedia(
          mediaId,
          PreviewStateType.EDIT_MEDIA_END_TIME,
          Math.max(startTimeRef.current + MIN_DURATION, nextEnd),
          0
        );
      } else {
        // Left handle: extends/shrinks startTime + startInTimeLine together
        const rawTlStart = Math.max(0, startInTimelineRef.current + delta);
        const clampedTlStart = clampResizeLeft(
          rawTlStart,
          tlEndRef.current,
          mediaId,
          layerRef.current,
          assets
        );
        const actualDelta = clampedTlStart - startInTimelineRef.current;
        const nextStartTime = Math.min(
          endTimeRef.current - MIN_DURATION,
          Math.max(0, startTimeRef.current + actualDelta)
        );
        const nextStartInTimeline = Math.min(
          endTimeRef.current - MIN_DURATION,
          Math.max(0, clampedTlStart)
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