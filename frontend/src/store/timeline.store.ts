import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";
import { PreviewStateType } from "../enum/previewStateType.enum";

type PreviewState =
  | {
      type: PreviewStateType;
      id: string;
      x: number;
      y: number;
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

  previewMoveMedia: (id: string, type: PreviewStateType, nextDx: number, nextDy: number) => void;
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


  previewMoveMedia: (id, type, nextDx, nextDy) =>
    set({
      preview: {
        id: id,
        type: type,
        x: nextDx,
        y: nextDy
      },
    }),


  commit: () =>
    set((state) => {
      if (!state.preview) return state;
      const { id, x, y } = state.preview;
      if (state.preview.type === PreviewStateType.EDIT_MEDIA_TIME) {
        return {
          assets: state.assets.map((a) =>
            a.id === id
              ? { ...a, startInTimeLine:x, layer:y }
              : a
          ),
          preview: null,
        };
      }
      else if(state.preview.type === PreviewStateType.EDIT_MEDIA_POSITION){
        return {
          assets: state.assets.map((a) =>
            a.id === id
              ? { ...a, x:x, y:y }
              : a
          ),
          preview: null,
        };
      }
      else if(state.preview.type === PreviewStateType.EDIT_MEDIA_END_TIME){
        return {
          assets: state.assets.map((a) =>
            a.id === id
              ? { ...a, endTime:x }
              : a
          ),
          preview: null,
        };
      }
      else if(state.preview.type === PreviewStateType.EDIT_MEDIA_START_TIME){
        return {
          assets: state.assets.map((a) =>
            a.id === id
              ? { ...a, startTime:x, startInTimeLine:y }
              : a
          ),
          preview: null,
        };
      }
      return state;
    }),

  cancelPreview: () => set({ preview: null }),
}));
