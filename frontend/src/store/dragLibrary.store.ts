import { create } from "zustand";
import { MediaAsset } from "../types/mediaAsset";

interface DragLibraryState {
  dragging: MediaAsset | null;
  ghostX: number;
  ghostY: number;
  startDrag: (asset: MediaAsset, x: number, y: number) => void;
  moveDrag: (x: number, y: number) => void;
  endDrag: () => void;
}

export const useDragLibraryStore = create<DragLibraryState>((set) => ({
  dragging: null,
  ghostX: 0,
  ghostY: 0,
  startDrag: (asset, x, y) => set({ dragging: asset, ghostX: x, ghostY: y }),
  moveDrag: (x, y) => set({ ghostX: x, ghostY: y }),
  endDrag: () => set({ dragging: null }),
}));
