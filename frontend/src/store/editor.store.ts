import { create } from "zustand";

interface EditorState{
  pixelPerSecond: number;
  layerHeight: number;
  timelineHeight:number;

  setPixelPerSecond: (t: number) => void;
  setLayerHeight: (t: number) => void;
  setTimelineHeight: (t: number) => void;
}

export const useEditorStore = create<EditorState>((set)=>({
  layerHeight: 42,
  pixelPerSecond: 10,
  timelineHeight: 200,
  setLayerHeight: (t: number) =>
    set({
      layerHeight: t,
    }),
  setPixelPerSecond: (t: number) =>
    set({
      pixelPerSecond: t,
    }),
  setTimelineHeight: (t: number) =>
    set({
      timelineHeight: t,
    }),
}))