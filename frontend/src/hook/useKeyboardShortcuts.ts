import { useEffect } from "react";
import { useTimelineStore } from "../store/timeline.store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const { deleteSelected, copySelected, cutSelected, pasteClipboard, duplicateSelected, togglePlay, cutAsset, selectedAssetId } = useTimelineStore.getState();

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAssetId) { e.preventDefault(); deleteSelected(); }
        return;
      }

      if (ctrl && e.key === "c") { e.preventDefault(); copySelected(); return; }
      if (ctrl && e.key === "x") { e.preventDefault(); cutSelected(); return; }
      if (ctrl && e.key === "v") { e.preventDefault(); pasteClipboard(); return; }
      if (ctrl && e.key === "d") { e.preventDefault(); duplicateSelected(); return; }

      if (e.key === " ") { e.preventDefault(); togglePlay(); return; }

      // Split clip at playhead (existing store action)
      if (e.key === "s" && !ctrl) { e.preventDefault(); cutAsset(); return; }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
