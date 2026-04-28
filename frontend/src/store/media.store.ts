import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";

interface MediaState {
  assets: MediaAsset[];
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (id: string) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  assets: [],
  addAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets, { ...asset, id: crypto.randomUUID() }],
    })),
  removeAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })),
}));