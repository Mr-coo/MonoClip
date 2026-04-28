import { create } from "zustand";

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

export const useCaptionStore = create<CaptionState>((set) => ({
  segments: [],

  addSegment: (start, end, text = "") =>
    set((state) => ({
      segments: [
        ...state.segments,
        { id: crypto.randomUUID(), start, end: end ?? start + 3, text },
      ].sort((a, b) => a.start - b.start),
    })),

  updateSegment: (id, updates) =>
    set((state) => ({
      segments: state.segments
        .map((s) => (s.id === id ? { ...s, ...updates } : s))
        .sort((a, b) => a.start - b.start),
    })),

  removeSegment: (id) =>
    set((state) => ({
      segments: state.segments.filter((s) => s.id !== id),
    })),

  setSegments: (segments) =>
    set({
      segments: segments
        .map((s) => ({ ...s, id: crypto.randomUUID() }))
        .sort((a, b) => a.start - b.start),
    }),
}));