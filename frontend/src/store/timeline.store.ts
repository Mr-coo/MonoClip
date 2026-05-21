import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";
import { PreviewStateType } from "../enum/previewStateType.enum";
import { useHistoryStore } from "./history.store";
// useCaptionStore imported inside functions only — circular dep is safe with ES module live bindings
import { useCaptionStore } from "./caption.store";

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
  clipboard: MediaAsset | null;

  preview: PreviewState;

  addAsset: (asset: MediaAsset) => void;
  dropAsset: (asset: MediaAsset, startInTimeLine: number, layer: number) => void;
  removeAsset: (asset: MediaAsset) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteClipboard: () => void;
  duplicateSelected: () => void;

  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  selectAsset: (id: string | null) => void;
  cutAsset: () => void;

  updateAsset: (id: string, updates: Partial<MediaAsset>) => void;
  applyAutoCut: (id: string, keepRanges: Array<{ start: number; end: number }>) => number;
  previewMoveMedia: (id: string, type: PreviewStateType, nextDx: number, nextDy: number) => void;
  previewResizeMedia: (id: string, type: PreviewStateType, width: number, height: number, x: number, y: number) => void;
  commit: () => void;
  cancelPreview: () => void;
}

export const useTimelineStore = create<TimeLineState>((set, get) => {
  function snapshot() {
    return {
      assets: get().assets,
      segments: useCaptionStore.getState().segments,
    };
  }

  return {
  assets: [],
  currentTime: 0,
  isPlaying: false,
  selectedAssetId: null,
  clipboard: null,
  preview: null,

  addAsset: (asset) => {
    useHistoryStore.getState().pushHistory(snapshot());
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

  dropAsset: (asset, startInTimeLine, layer) => {
    useHistoryStore.getState().pushHistory(snapshot());
    set((state) => {
      const newAsset: MediaAsset = {
        ...asset,
        id: crypto.randomUUID(),
        startInTimeLine,
        layer,
      };
      return { assets: [...state.assets, newAsset], selectedAssetId: newAsset.id };
    });
  },

  removeAsset: (asset) => {
    useHistoryStore.getState().pushHistory(snapshot());
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== asset.id),
    }));
  },

  deleteSelected: () => {
    if (!get().selectedAssetId) return;
    useHistoryStore.getState().pushHistory(snapshot());
    set((state) => {
      if (!state.selectedAssetId) return state;
      return {
        assets: state.assets.filter((a) => a.id !== state.selectedAssetId),
        selectedAssetId: null,
      };
    });
  },

  copySelected: () =>
    set((state) => {
      const asset = state.assets.find((a) => a.id === state.selectedAssetId);
      if (!asset) return state;
      return { clipboard: asset };
    }),

  cutSelected: () => {
    if (!get().selectedAssetId) return;
    useHistoryStore.getState().pushHistory(snapshot());
    set((state) => {
      const asset = state.assets.find((a) => a.id === state.selectedAssetId);
      if (!asset) return state;
      return {
        clipboard: asset,
        assets: state.assets.filter((a) => a.id !== state.selectedAssetId),
        selectedAssetId: null,
      };
    });
  },

  pasteClipboard: () => {
    if (!get().clipboard) return;
    useHistoryStore.getState().pushHistory(snapshot());
    set((state) => {
      if (!state.clipboard) return state;
      const src = state.clipboard;
      const duration = src.endTime - src.startTime;
      const pasted: MediaAsset = {
        ...src,
        id: crypto.randomUUID(),
        startInTimeLine: state.currentTime,
        endTime: src.startTime + duration,
      };
      return { assets: [...state.assets, pasted], selectedAssetId: pasted.id };
    });
  },

  duplicateSelected: () => {
    const { assets, selectedAssetId } = get();
    const src = assets.find((a) => a.id === selectedAssetId);
    if (!src) return;
    useHistoryStore.getState().pushHistory(snapshot());
    const duration = src.endTime - src.startTime;
    const duped: MediaAsset = {
      ...src,
      id: crypto.randomUUID(),
      startInTimeLine: src.startInTimeLine + duration,
      endTime: src.startTime + duration,
    };
    set((state) => ({ assets: [...state.assets, duped], selectedAssetId: duped.id }));
  },

  setCurrentTime: (time) => set({ currentTime: time }),

  togglePlay: () =>
    set((state) => ({ isPlaying: !state.isPlaying })),

  selectAsset: (id) => set({ selectedAssetId: id }),

  cutAsset: () => {
    const { selectedAssetId, currentTime, assets } = get();
    if (!selectedAssetId) return;
    const asset = assets.find((a) => a.id === selectedAssetId);
    if (!asset) return;
    const assetEnd = asset.startInTimeLine + (asset.endTime - asset.startTime);
    if (currentTime <= asset.startInTimeLine || currentTime >= assetEnd) return;
    useHistoryStore.getState().pushHistory(snapshot());
    set((state) => {
      const { selectedAssetId, currentTime, assets } = state;
      if (!selectedAssetId) return state;
      const asset = assets.find((a) => a.id === selectedAssetId);
      if (!asset) return state;
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
    });
  },

  updateAsset: (id, updates) => {
    useHistoryStore.getState().pushHistory(snapshot());
    set((state) => ({
      assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  },

  applyAutoCut: (id, keepRanges) => {
    let createdCount = 0;
    set((state) => {
      const src = state.assets.find((a) => a.id === id);
      if (!src || keepRanges.length === 0) return state;

      const base = src.startInTimeLine;
      let cursor = base;
      const subs: MediaAsset[] = keepRanges.map((r) => {
        const duration = Math.max(0, r.end - r.start);
        const piece: MediaAsset = {
          ...src,
          id: crypto.randomUUID(),
          startTime: r.start,
          endTime: r.end,
          startInTimeLine: cursor,
        };
        cursor += duration;
        return piece;
      });

      createdCount = subs.length;

      return {
        assets: [...state.assets.filter((a) => a.id !== id), ...subs],
        selectedAssetId: null,
      };
    });
    return createdCount;
  },


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


  commit: () => {
    if (get().preview) useHistoryStore.getState().pushHistory(snapshot());
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
    });
  },

  cancelPreview: () => set({ preview: null }),
  };
});
