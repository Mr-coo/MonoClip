import { create } from "zustand";

export interface SnapGuides {
  vertical?: number;
  horizontal?: number;
}

interface EditorState{
  pixelPerSecond: number;
  layerHeight: number;
  timelineHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  contentScale: number;
  snapGuides: SnapGuides | null;

  setPixelPerSecond: (t: number) => void;
  setLayerHeight: (t: number) => void;
  setTimelineHeight: (t: number) => void;
  setCanvasDimensions: (w: number, h: number) => void;
  setContentScale: (s: number) => void;
  setSnapGuides: (guides: SnapGuides | null) => void;
}

export const useEditorStore = create<EditorState>((set)=>({
  layerHeight: 42,
  pixelPerSecond: 10,
  timelineHeight: 200,
  canvasWidth: 1920,
  canvasHeight: 1080,
  contentScale: 1,
  snapGuides: null,
  setLayerHeight: (t: number) =>
    set({ layerHeight: t }),
  setPixelPerSecond: (t: number) =>
    set({ pixelPerSecond: t }),
  setTimelineHeight: (t: number) =>
    set({ timelineHeight: t }),
  setCanvasDimensions: (w: number, h: number) =>
    set({ canvasWidth: w, canvasHeight: h }),
  setContentScale: (s: number) =>
    set({ contentScale: s }),
  setSnapGuides: (guides: SnapGuides | null) =>
    set({ snapGuides: guides }),
}))