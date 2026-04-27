import { useMoveMediaInTimeline } from "../../hook/useMoveMediaInTimeline";
import { useResizeMediaInTimeline } from "../../hook/useResizeMediaInTimeline";
import { useEditorStore } from "../../store/editor.store";
import { useTimelineStore } from "../../store/timeline.store";
import { MediaAsset } from "../../types/mediaAsset";

export function TimelineMedia({ media }: { media: MediaAsset }) {
  const editorStore = useEditorStore();
  const { selectedAssetId, selectAsset } = useTimelineStore();
  const isSelected = selectedAssetId === media.id;
  const moveMedia = useMoveMediaInTimeline(media.id);
  const resizeLeftMedia = useResizeMediaInTimeline(media.id, true);
  const resizeRightMedia = useResizeMediaInTimeline(media.id, false);

  const left = media.startInTimeLine * editorStore.pixelPerSecond;
  const dragDurationLeft = (media.startInTimeLine+media.endTime-media.startTime) * editorStore.pixelPerSecond;
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
        onClick={(e) => { e.stopPropagation(); selectAsset(isSelected ? null : media.id); }}
        className={`absolute bg-gray-800 rounded overflow-hidden h-9 transition-opacity cursor-pointer ${isSelected ? "border-2 border-primary opacity-100" : "border border-white/10 opacity-60 hover:opacity-100"}`}
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
          ) : media.type === "text" ? (
            <div className="w-full h-full bg-gradient-to-r from-violet-900 to-indigo-900 flex items-center px-2">
              <p className="text-xs text-white/80 truncate select-none">T  {media.textStyle?.content ?? 'Text'}</p>
            </div>
          ) : (
            <div className="w-full h-full bg-base"><p className="text-xs p-2 select-none">♪ {media.name} ♪</p></div>
          )
        )}
      </div>
      <div 
        className="w-1 h-9 absolute hover:bg-typography rounded-2xl transition-all duration-200"
        draggable={false}
        style={{ left:`${dragDurationLeft-4}px`, top }}
        onPointerDown={resizeRightMedia.onPointerDown}
        onPointerMove={resizeRightMedia.onPointerMove}
        onPointerUp={resizeRightMedia.onPointerUp}
      ></div>
      {media.type!=="img"?(<div 
        className="w-1 h-9 absolute hover:bg-typography rounded-2xl transition-all duration-200"
        draggable={false}
        style={{ left:`${left}px`, top }}
        onPointerDown={resizeLeftMedia.onPointerDown}
        onPointerMove={resizeLeftMedia.onPointerMove}
        onPointerUp={resizeLeftMedia.onPointerUp}
      ></div>):(<></>)}
    </div>
  );
}
