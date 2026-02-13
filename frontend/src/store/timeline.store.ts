import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";

interface TimeLineState {
  assets: MediaAsset[];
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (asset: MediaAsset) => void;
}

export const useTimelineStore = create<TimeLineState>((set) => ({
  assets: [],
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
    }))
}));
