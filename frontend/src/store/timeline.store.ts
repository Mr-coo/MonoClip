import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";
import { PreviewStateType } from "../enum/previewStateType.enum";

type PreviewState =
  | {
      type: PreviewStateType;
      id: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
    }
  | null;

interface TimeLineState {
  assets: MediaAsset[];
  currentTime: number;
  isPlaying: boolean;
  selectedAssetId: string | null;

  preview: PreviewState;

  addAsset: (asset: MediaAsset) => void;
  removeAsset: (asset: MediaAsset) => void;

  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  selectAsset: (id: string | null) => void;
  cutAsset: () => void;

  updateAsset: (id: string, updates: Partial<MediaAsset>) => void;
  previewMoveMedia: (id: string, type: PreviewStateType, nextDx: number, nextDy: number) => void;
  previewResizeMedia: (id: string, type: PreviewStateType, width: number, height: number, x: number, y: number) => void;
  commit: () => void;
  cancelPreview: () => void;
}

export const useTimelineStore = create<TimeLineState>((set) => ({
  assets: [],
  currentTime: 0,
  isPlaying: false,
  selectedAssetId: null,
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

  selectAsset: (id) => set({ selectedAssetId: id }),

  cutAsset: () =>
    set((state) => {
      const { selectedAssetId, currentTime, assets } = state;
      if (!selectedAssetId) return state;

      const asset = assets.find((a) => a.id === selectedAssetId);
      if (!asset) return state;

      const assetEnd = asset.startInTimeLine + (asset.endTime - asset.startTime);
      if (currentTime <= asset.startInTimeLine || currentTime >= assetEnd) return state;

      const cutSourceTime = asset.startTime + (currentTime - asset.startInTimeLine);

      const left: MediaAsset = { ...asset, endTime: cutSourceTime };
      const right: MediaAsset = {
        ...asset,
        id: crypto.randomUUID(),
        startTime: cutSourceTime,
        startInTimeLine: currentTime,
      };

      return {
        assets: assets.map((a) => (a.id === asset.id ? left : a)).concat(right),
        selectedAssetId: null,
      };
    }),


  updateAsset: (id, updates) =>
    set((state) => ({
      assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  previewMoveMedia: (id, type, nextDx, nextDy) =>
    set({
      preview: {
        id: id,
        type: type,
        x: nextDx,
        y: nextDy
      },
    }),

  previewResizeMedia: (id, type, width, height, x, y) =>
    set({
      preview: {
        id: id,
        type: type,
        x: x,
        y: y,
        width: width,
        height: height,
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
      else if(state.preview.type === PreviewStateType.EDIT_MEDIA_SIZE){
        const { width, height } = state.preview;
        return {
          assets: state.assets.map((a) =>
            a.id === id
              ? { ...a, width: width || a.width, height: height || a.height, x: x, y: y }
              : a
          ),
          preview: null,
        };
      }
      return state;
    }),

  cancelPreview: () => set({ preview: null }),
}));
