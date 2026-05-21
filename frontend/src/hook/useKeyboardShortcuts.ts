import { useEffect } from "react";
import { useTimelineStore } from "../store/timeline.store";
import { useCaptionStore } from "../store/caption.store";
import { useHistoryStore } from "../store/history.store";

const MAX_HISTORY = 50;

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

      if (e.key === "s" && !ctrl) { e.preventDefault(); cutAsset(); return; }

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const { past, future } = useHistoryStore.getState();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const current = {
          assets: useTimelineStore.getState().assets,
          segments: useCaptionStore.getState().segments,
        };
        useHistoryStore.setState({
          past: past.slice(0, -1),
          future: [current, ...future.slice(0, MAX_HISTORY - 1)],
        });
        useTimelineStore.setState({ assets: previous.assets, selectedAssetId: null });
        useCaptionStore.setState({ segments: previous.segments });
        return;
      }

      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        const { past, future } = useHistoryStore.getState();
        if (future.length === 0) return;
        const next = future[0];
        const current = {
          assets: useTimelineStore.getState().assets,
          segments: useCaptionStore.getState().segments,
        };
        useHistoryStore.setState({
          past: [...past.slice(-(MAX_HISTORY - 1)), current],
          future: future.slice(1),
        });
        useTimelineStore.setState({ assets: next.assets, selectedAssetId: null });
        useCaptionStore.setState({ segments: next.segments });
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
