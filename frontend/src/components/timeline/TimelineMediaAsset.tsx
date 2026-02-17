import { useMoveMediaInTimeline } from "../../hook/useMoveMediaInTimeline";
import { useEditorStore } from "../../store/editor.store";
import { MediaAsset } from "../../types/mediaAsset";

export function TimelineMedia({ media }: { media: MediaAsset }) {
  const editorStore = useEditorStore();
  const moveMedia = useMoveMediaInTimeline(media.id);

  const left = media.startInTimeLine * editorStore.pixelPerSecond;
  const width =
    (media.endTime - (media.startTime || 0)) *
    editorStore.pixelPerSecond;
  const top = (media.layer - 1) * editorStore.layerHeight;

  return (
    <div
      onPointerDown={moveMedia.onPointerDown}
      onPointerMove={moveMedia.onPointerMove}
      onPointerUp={moveMedia.onPointerUp}
      className="absolute bg-gray-800 border border-white/10 rounded overflow-hidden h-9 opacity-60 hover:opacity-100 transition-opacity"
      style={{ left, top, width }}
    >
      {media.type === "video" ? (
        <video
          src={media.path}
          className="w-full h-full object-cover"
          onLoadedData={(e) => {
            e.currentTarget.currentTime = 0; 
          }}
          muted
          playsInline
        />
      ) : (
        <img src={media.path} className="w-full h-full object-cover" />
      )}
    </div>
  );
}
