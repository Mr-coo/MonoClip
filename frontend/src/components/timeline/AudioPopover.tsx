import { useEffect, useRef } from "react";
import { MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { MediaAsset } from "../../types/mediaAsset";
import { useTimelineStore } from "../../store/timeline.store";

export function AudioPopover({
  media,
  placement = "above",
  onClose,
}: {
  media: MediaAsset;
  placement?: "above" | "below";
  onClose: () => void;
}) {
  const { updateAsset } = useTimelineStore();
  const ref = useRef<HTMLDivElement>(null);

  const volume = media.volume ?? 1;
  const muted = media.muted ?? false;
  const fadeIn = media.fadeIn ?? 0;
  const fadeOut = media.fadeOut ?? 0;
  const clipDuration = media.endTime - media.startTime;

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-dark border border-white/15 rounded-md shadow-xl p-3 w-56 text-typography"
      style={placement === "below" ? { left: 0, top: 4 } : { left: 0, top: -160 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">Audio</span>
        <button
          className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:bg-white/10"
          onClick={() => updateAsset(media.id, { muted: !muted })}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MdVolumeOff size={14} /> : <MdVolumeUp size={14} />}
          {muted ? "Muted" : "On"}
        </button>
      </div>

      <label className="block text-[10px] uppercase tracking-wide text-white/50 mb-1">
        Volume — {Math.round(volume * 100)}%
      </label>
      <input
        type="range"
        min={0}
        max={2}
        step={0.01}
        value={volume}
        onChange={(e) =>
          updateAsset(media.id, { volume: Number(e.target.value) })
        }
        className="w-full accent-primary mb-2"
      />

      <label className="block text-[10px] uppercase tracking-wide text-white/50 mb-1">
        Fade in — {fadeIn.toFixed(2)}s
      </label>
      <input
        type="range"
        min={0}
        max={Math.max(clipDuration, 0.01)}
        step={0.05}
        value={Math.min(fadeIn, clipDuration)}
        onChange={(e) =>
          updateAsset(media.id, { fadeIn: Number(e.target.value) })
        }
        className="w-full accent-primary mb-2"
      />

      <label className="block text-[10px] uppercase tracking-wide text-white/50 mb-1">
        Fade out — {fadeOut.toFixed(2)}s
      </label>
      <input
        type="range"
        min={0}
        max={Math.max(clipDuration, 0.01)}
        step={0.05}
        value={Math.min(fadeOut, clipDuration)}
        onChange={(e) =>
          updateAsset(media.id, { fadeOut: Number(e.target.value) })
        }
        className="w-full accent-primary"
      />
    </div>
  );
}
