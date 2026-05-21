import { useEffect } from "react";
import { MdClose } from "react-icons/md";

const SECTIONS = [
  {
    title: "Playback",
    shortcuts: [
      { keys: ["Space"], label: "Play / Pause" },
    ],
  },
  {
    title: "Timeline",
    shortcuts: [
      { keys: ["S"], label: "Cut selected clip at playhead" },
      { keys: ["Delete"], label: "Delete selected clip" },
      { keys: ["Ctrl", "Scroll"], label: "Zoom in / out" },
    ],
  },
  {
    title: "Clipboard",
    shortcuts: [
      { keys: ["Ctrl", "C"], label: "Copy selected clip" },
      { keys: ["Ctrl", "X"], label: "Cut selected clip" },
      { keys: ["Ctrl", "V"], label: "Paste clip at playhead" },
      { keys: ["Ctrl", "D"], label: "Duplicate selected clip" },
    ],
  },
  {
    title: "History",
    shortcuts: [
      { keys: ["Ctrl", "Z"], label: "Undo" },
      { keys: ["Ctrl", "Y"], label: "Redo" },
    ],
  },
];

export function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-mid border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-typography/40 hover:text-typography transition-colors"
        >
          <MdClose size={18} />
        </button>

        <h2 className="text-base font-semibold text-typography mb-5">Keyboard Shortcuts</h2>

        <div className="flex flex-col gap-5">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-medium text-typography/40 uppercase tracking-wider mb-2">
                {section.title}
              </p>
              <div className="flex flex-col gap-1.5">
                {section.shortcuts.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm text-typography/80">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <kbd className="px-2 py-0.5 text-xs font-mono bg-base border border-white/15 rounded text-typography/70">
                            {k}
                          </kbd>
                          {i < s.keys.length - 1 && (
                            <span className="text-typography/30 text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
