import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";

type PreviewState =
  | {
      type: "move-media";
      id: string;
      startInTimeLine: number;
      layer: number;
    }
  | null;

interface TimeLineState {
  assets: MediaAsset[];
  currentTime: number;
  isPlaying: boolean;

  preview: PreviewState;

  addAsset: (asset: MediaAsset) => void;
  removeAsset: (asset: MediaAsset) => void;

  setCurrentTime: (time: number) => void;
  togglePlay: () => void;

  previewMoveMedia: (id: string, nextDx: number, nextDy: number) => void;
  commit: () => void;
  cancelPreview: () => void;
}

export const useTimelineStore = create<TimeLineState>((set) => ({
  assets: [],
  currentTime: 0,
  isPlaying: false,
  preview: null,


  addAsset: (asset) => {
    set((state) => {
      const maxLayer = state.assets.reduce(
        (m, a) => Math.max(m, a.layer),
        0
      );

      const duplicatedAsset: MediaAsset = {
        ...asset,
        id: crypto.randomUUID(),
        layer: maxLayer + 1,
      };

      return {
        assets: [...state.assets, duplicatedAsset],
      };
    });
  },

  removeAsset: (asset) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== asset.id),
    })),


  setCurrentTime: (time) => set({ currentTime: time }),

  togglePlay: () =>
    set((state) => ({ isPlaying: !state.isPlaying })),


  previewMoveMedia: (id, nextDx, nextDy) =>
    set({
      preview: {
        type: "move-media",
        id,
        startInTimeLine: nextDx,
        layer: nextDy
      },
    }),


  commit: () =>
    set((state) => {
      if (!state.preview) return state;

      if (state.preview.type === "move-media") {
        const { id, startInTimeLine, layer } = state.preview;

        return {
          assets: state.assets.map((a) =>
            a.id === id
              ? { ...a, startInTimeLine, layer }
              : a
          ),
          preview: null,
        };
      }

      return state;
    }),

  cancelPreview: () => set({ preview: null }),
}));
