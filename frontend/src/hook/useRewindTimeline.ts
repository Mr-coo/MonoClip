import { useRef } from "react";
import { useTimelineStore } from "../store/timeline.store";
import { usePointerDrag } from "./usePointerDrag";
import { useEditorStore } from "../store/editor.store";

export function useRewindTimeline(){
  const timelineStore = useTimelineStore()
  const editorStore = useEditorStore()
  const currentTimeReff = useRef(0)

  return usePointerDrag({
    onStart() {
      currentTimeReff.current = timelineStore.currentTime
    },
    onMove(dx) {
      const dt = dx/editorStore.pixelPerSecond
      const nextTime = currentTimeReff.current + dt
      if(nextTime >= 0) timelineStore.setCurrentTime(nextTime)
    },
  })
}