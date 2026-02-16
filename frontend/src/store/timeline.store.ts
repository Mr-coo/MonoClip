import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";

interface TimeLineState {
  assets: MediaAsset[];
  currentTime: number;
  isPlaying: boolean;
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (asset: MediaAsset) => void;
  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
}

export const useTimelineStore = create<TimeLineState>((set) => ({
  assets: [],
  currentTime: 0,
  isPlaying: false,
  addAsset: (asset) => {
    set((state) => {
      let maxLayer = 0;
      state.assets.map(a => maxLayer = a.layer>maxLayer?a.layer:maxLayer)
      asset.layer = maxLayer+1

      const duplicatedAsset = { 
        ...asset, 
        id: crypto.randomUUID(), 
        layer: maxLayer + 1,      
      };

      return {
        assets: [...state.assets, duplicatedAsset]
      }
    })
  },
  removeAsset: (asset) =>
    set((state) => ({
      assets: state.assets.filter(a => a.id != asset.id)
    })),
  setCurrentTime: (time) => set({ currentTime: time }),
  togglePlay: () => set(state=> ({isPlaying: !state.isPlaying}))
}));
