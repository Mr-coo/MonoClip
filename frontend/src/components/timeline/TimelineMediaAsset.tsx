import { useState } from "react";
import { useMoveMediaInTimeline } from "../../hook/useMoveMediaInTimeline";
import { useResizeMediaInTimeline } from "../../hook/useResizeMediaInTimeline";
import { useEditorStore } from "../../store/editor.store";
import { useTimelineStore } from "../../store/timeline.store";
import { MediaAsset } from "../../types/mediaAsset";
import { MdClose, MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { AudioPopover } from "./AudioPopover";
import { useAudioWaveform } from "../../hook/useAudioWaveform";
import { WaveformCanvas } from "./WaveformCanvas";

export function TimelineMedia({ media }: { media: MediaAsset }) {
  const editorStore = useEditorStore();
  const { selectedAssetId, selectAsset, removeAsset } = useTimelineStore();
  const isSelected = selectedAssetId === media.id;
  const moveMedia = useMoveMediaInTimeline(media.id);
  const resizeLeftMedia = useResizeMediaInTimeline(media.id, true);
  const resizeRightMedia = useResizeMediaInTimeline(media.id, false);
  const [audioOpen, setAudioOpen] = useState(false);
  const hasAudio = media.type === "video" || media.type === "audio";
  const isMuted = media.muted ?? false;

  const left = media.startInTimeLine * editorStore.pixelPerSecond;
  const dragDurationLeft =
    (media.startInTimeLine + media.endTime - media.startTime) *
    editorStore.pixelPerSecond;
  const width =
    (media.endTime - (media.startTime || 0)) * editorStore.pixelPerSecond;
  const top = (media.layer - 1) * editorStore.layerHeight;

  const waveformData = useAudioWaveform(hasAudio ? media.path : "");

  function handleDelete(e: React.PointerEvent | React.MouseEvent) {
    e.stopPropagation();
    removeAsset(media);
    selectAsset(null);
  }

  return (
    <div>
      <div
        onPointerDown={moveMedia.onPointerDown}
        onPointerMove={moveMedia.onPointerMove}
        onPointerUp={moveMedia.onPointerUp}
        onClick={(e) => {
          e.stopPropagation();
          selectAsset(isSelected ? null : media.id);
        }}
        className={`absolute bg-gray-800 rounded overflow-hidden h-9 transition-opacity cursor-pointer ${
          isSelected
            ? "border-2 border-primary opacity-100"
            : "border border-white/10 opacity-60 hover:opacity-100"
        }`}
        style={{ left, top, width }}
      >
        {media.type === "video" ? (
          <>
            <video
              src={media.path}
              className="w-full h-full object-cover"
              onLoadedData={(e) => {
                e.currentTarget.currentTime = 0;
              }}
              muted
              playsInline
            />
            {waveformData && (
              <WaveformCanvas
                data={waveformData}
                startTime={media.startTime}
                endTime={media.endTime}
                width={width}
                height={36}
                color="rgba(255,255,255,0.6)"
              />
            )}
          </>
        ) : media.type === "img" ? (
          <img
            src={media.path}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : media.type === "text" ? (
          <div className="w-full h-full bg-gradient-to-r from-violet-900 to-indigo-900 flex items-center px-2">
            <p className="text-xs text-white/80 truncate select-none">
              T&nbsp;&nbsp;{media.textStyle?.content ?? "Text"}
            </p>
          </div>
        ) : (
          <div className="w-full h-full bg-gray-900 relative">
            {waveformData ? (
              <WaveformCanvas
                data={waveformData}
                startTime={media.startTime}
                endTime={media.endTime}
                width={width}
                height={36}
                color="rgba(74,222,128,0.85)"
              />
            ) : (
              <p className="text-xs p-2 select-none text-white/40">♪ {media.name}</p>
            )}
          </div>
        )}

        {/* Delete button — visible only when selected, inside overflow-hidden bounds */}
        {isSelected && (
          <button
            className="absolute top-0.5 right-0.5 z-20 bg-red-600/80 hover:bg-red-600 text-white rounded-sm flex items-center justify-center w-4 h-4"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleDelete}
            title="Delete"
          >
            <MdClose size={10} />
          </button>
        )}

        {/* Audio button — visible for video/audio clips */}
        {hasAudio && (
          <button
            className={`absolute bottom-0.5 left-0.5 z-20 rounded-sm flex items-center justify-center w-4 h-4 ${
              isMuted
                ? "bg-red-600/80 hover:bg-red-600 text-white"
                : "bg-black/50 hover:bg-black/80 text-white"
            }`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setAudioOpen((v) => !v);
            }}
            title="Audio settings"
          >
            {isMuted ? <MdVolumeOff size={10} /> : <MdVolumeUp size={10} />}
          </button>
        )}
      </div>

      {hasAudio && audioOpen && (
        <div
          className="absolute"
          style={{ left, top: top + 36, zIndex: 60 }}
        >
          <AudioPopover
            media={media}
            placement={top < 200 ? "below" : "above"}
            onClose={() => setAudioOpen(false)}
          />
        </div>
      )}

      {/* Right resize handle */}
      <div
        className="w-1 h-9 absolute hover:bg-typography rounded-2xl transition-all duration-200"
        draggable={false}
        style={{ left: `${dragDurationLeft - 4}px`, top }}
        onPointerDown={resizeRightMedia.onPointerDown}
        onPointerMove={resizeRightMedia.onPointerMove}
        onPointerUp={resizeRightMedia.onPointerUp}
      />

      {/* Left resize handle (not for images) */}
      {media.type !== "img" && (
        <div
          className="w-1 h-9 absolute hover:bg-typography rounded-2xl transition-all duration-200"
          draggable={false}
          style={{ left: `${left}px`, top }}
          onPointerDown={resizeLeftMedia.onPointerDown}
          onPointerMove={resizeLeftMedia.onPointerMove}
          onPointerUp={resizeLeftMedia.onPointerUp}
        />
      )}
    </div>
  );
}
