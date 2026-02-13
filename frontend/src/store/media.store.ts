import { create } from "zustand";
import { Video } from "../types/video";

interface MediaState {
  videos: Video[];
  addAsset: (asset: MediaAsset) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  assets: [],
  addAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets, asset],
    })),
}));
