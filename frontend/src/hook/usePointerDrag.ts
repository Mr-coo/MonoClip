import { useRef } from "react";

interface DragCallbacks {
  onStart?: (e: PointerEvent) => void;
  onMove?: (dx: number, dy: number, e: PointerEvent) => void;
  onEnd?: (e: PointerEvent) => void;
}

export function usePointerDrag(cb: DragCallbacks) {
  const start = useRef({ x: 0, y: 0 });

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    cb.onStart?.(e.nativeEvent);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    cb.onMove?.(
      e.clientX - start.current.x,
      e.clientY - start.current.y,
      e.nativeEvent
    );
  }

  function onPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    cb.onEnd?.(e.nativeEvent);
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}
