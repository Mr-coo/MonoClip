import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";

interface MediaState {
  assets: MediaAsset[];
  addAsset: (asset: MediaAsset) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  assets: [],
  addAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets, asset],
    })),
}));
