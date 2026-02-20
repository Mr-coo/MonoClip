import { useMoveMediaInTimeline } from "../../hook/useMoveMediaInTimeline";
import { useResizeMediaInTimeline } from "../../hook/useResizeMediaInTimeline";
import { useEditorStore } from "../../store/editor.store";
import { MediaAsset } from "../../types/mediaAsset";

export function TimelineMedia({ media }: { media: MediaAsset }) {
  const editorStore = useEditorStore();
  const moveMedia = useMoveMediaInTimeline(media.id);
  const resizeMedia = useResizeMediaInTimeline(media.id);

  const left = media.startInTimeLine * editorStore.pixelPerSecond;
  const dragDurationLeft = (media.startInTimeLine+media.endTime) * editorStore.pixelPerSecond;
  const width =
    (media.endTime - (media.startTime || 0)) *
    editorStore.pixelPerSecond;
  const top = (media.layer - 1) * editorStore.layerHeight;

  return (
    <div>
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
          media.type === "img" ? (
            <img src={media.path} className="w-full h-full object-cover" draggable={false}/>
          ) : (
            <div className="w-full h-full bg-base"><p className="text-xs p-2 select-none">♪ {media.name} ♪</p></div>
          )
        )}
      </div>
      <div 
        className="w-1 h-9 absolute hover:bg-typography rounded-2xl transition-all duration-200"
        draggable={false}
        style={{ left:`${dragDurationLeft-4}px`, top }}
        onPointerDown={resizeMedia.onPointerDown}
        onPointerMove={resizeMedia.onPointerMove}
        onPointerUp={resizeMedia.onPointerUp}
      ></div>
    </div>
  );
}
