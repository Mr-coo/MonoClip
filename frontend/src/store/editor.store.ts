import { create } from "zustand";

interface EditorState{
  pixelPerSecond: number;
  layerHeight: number;
  timelineHeight: number;
  canvasWidth: number;
  canvasHeight: number;

  setPixelPerSecond: (t: number) => void;
  setLayerHeight: (t: number) => void;
  setTimelineHeight: (t: number) => void;
  setCanvasDimensions: (w: number, h: number) => void;
}

export const useEditorStore = create<EditorState>((set)=>({
  layerHeight: 42,
  pixelPerSecond: 10,
  timelineHeight: 200,
  canvasWidth: 1920,
  canvasHeight: 1080,
  setLayerHeight: (t: number) =>
    set({ layerHeight: t }),
  setPixelPerSecond: (t: number) =>
    set({ pixelPerSecond: t }),
  setTimelineHeight: (t: number) =>
    set({ timelineHeight: t }),
  setCanvasDimensions: (w: number, h: number) =>
    set({ canvasWidth: w, canvasHeight: h }),
}))