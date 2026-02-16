// hooks/usePlayback.js
import { useEffect, useRef } from "react";
import { useTimelineStore } from "../store/timeline.store";

export function usePlayback() {
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);
  
  const requestRef = useRef(0);
  const previousTimeRef = useRef(0);

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = (time - previousTimeRef.current) / 1000;
      
      const nextTime = useTimelineStore.getState().currentTime + deltaTime;
      setCurrentTime(nextTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      previousTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying]);
}