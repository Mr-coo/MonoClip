import { create } from "zustand";
import { useHistoryStore } from "./history.store";
// useTimelineStore imported inside functions only — circular dep is safe with ES module live bindings
import { useTimelineStore } from "./timeline.store";

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

interface CaptionState {
  segments: CaptionSegment[];
  addSegment: (start: number, end?: number, text?: string) => void;
  updateSegment: (id: string, updates: Partial<Omit<CaptionSegment, "id">>) => void;
  removeSegment: (id: string) => void;
  setSegments: (segments: Array<{ start: number; end: number; text: string }>) => void;
}

export const useCaptionStore = create<CaptionState>((set, get) => {
  function snapshot() {
    return {
      assets: useTimelineStore.getState().assets,
      segments: get().segments,
    };
  }

  return {
    segments: [],

    addSegment: (start, end, text = "") => {
      useHistoryStore.getState().pushHistory(snapshot());
      set((state) => ({
        segments: [
          ...state.segments,
          { id: crypto.randomUUID(), start, end: end ?? start + 3, text },
        ].sort((a, b) => a.start - b.start),
      }));
    },

    updateSegment: (id, updates) => {
      useHistoryStore.getState().pushHistory(snapshot());
      set((state) => ({
        segments: state.segments
          .map((s) => (s.id === id ? { ...s, ...updates } : s))
          .sort((a, b) => a.start - b.start),
      }));
    },

    removeSegment: (id) => {
      useHistoryStore.getState().pushHistory(snapshot());
      set((state) => ({
        segments: state.segments.filter((s) => s.id !== id),
      }));
    },

    setSegments: (segments) => {
      useHistoryStore.getState().pushHistory(snapshot());
      set({
        segments: segments
          .map((s) => ({ ...s, id: crypto.randomUUID() }))
          .sort((a, b) => a.start - b.start),
      });
    },
  };
});