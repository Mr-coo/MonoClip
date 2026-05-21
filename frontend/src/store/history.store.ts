import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";
import { CaptionSegment } from "./caption.store";

export interface HistoryEntry {
  assets: MediaAsset[];
  segments: CaptionSegment[];
}

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  pushHistory: (entry: HistoryEntry) => void;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryState>((set) => ({
  past: [],
  future: [],
  pushHistory: (entry) =>
    set((state) => ({
      past: [...state.past.slice(-(MAX_HISTORY - 1)), entry],
      future: [],
    })),
}));
