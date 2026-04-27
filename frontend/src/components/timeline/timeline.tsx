import { useMemo } from "react";
import { useTimelineStore } from "../../store/timeline.store";
import { FaPlay, FaPause, FaScissors } from "react-icons/fa6";
import { TiArrowSortedDown } from "react-icons/ti";
import { useReziseTimeline } from "../../hook/useResizeTimeline";
import { useEditorStore } from "../../store/editor.store";
import { TimelineMedia } from "./TimelineMediaAsset";
import { useRewindTimeline } from "../../hook/useRewindTimeline";

export default function Timeline() {
  const { assets, currentTime, isPlaying, selectedAssetId, togglePlay, cutAsset, selectAsset } = useTimelineStore();
  const editorStore = useEditorStore()
  const resizeTimelineHook = useReziseTimeline()
  const rewindTimelineHook = useRewindTimeline()
  const layersCount = 10
  
  const sortedMedias = useMemo(() => {
    return [...assets].sort((a, b) => {
      if (b.layer !== a.layer) return b.layer - a.layer;
      return a.startInTimeLine - b.startInTimeLine;
    });
  }, [assets]);

  return (
    <div>
      <div className="w-full relative flex justify-center items-center gap-2 p-2">
        <button
          className="bg-primary p-3 rounded-4xl hover:bg-primary/80"
          onClick={togglePlay}
        >{isPlaying?<FaPause/>:<FaPlay/>}</button>
        <button
          className={`p-3 rounded-4xl transition-colors ${selectedAssetId ? "bg-primary hover:bg-primary/80" : "bg-white/10 text-white/30 cursor-not-allowed"}`}
          onClick={cutAsset}
          disabled={!selectedAssetId}
          title="Cut selected asset at playhead"
        ><FaScissors /></button>
      </div>
      <div 
        className="bg-mid w-full overflow-x-auto overflow-y-auto relative border-t border-white/10 px-2 no-scrollbar" 
        style={{height: `${editorStore.timelineHeight}px`}}
      >
        <div 
          className="group"
          onPointerDown={rewindTimelineHook.onPointerDown}
          onPointerMove={rewindTimelineHook.onPointerMove}
          onPointerUp={rewindTimelineHook.onPointerUp}
        >
          <div 
            className="absolute z-11 p-px rounded-4xl group-hover:bg-primary" 
            style={{left: `${currentTime*editorStore.pixelPerSecond}px`}}><TiArrowSortedDown size={15}/></div>
          <div 
            className="bg-typography w-px h-full absolute z-10 translate-2 group-hover:bg-primary group-hover:w-1 group-hover:translate-1.5"
            style={{left: `${currentTime*editorStore.pixelPerSecond}px`}}></div>
        </div>
        <div 
          className="bg-mid hover:bg-primary w-full h-1 cursor-ns-resize transition-colors z-50" 
          onPointerDown={resizeTimelineHook.onPointerDown}
          onPointerMove={resizeTimelineHook.onPointerMove}
          onPointerUp={resizeTimelineHook.onPointerUp}
        />
        <div className="bg-mid-300 w-full h-8 relative">
          {Array(200).fill(0).map((_, i)=>{
            return(
              <div 
                key={i} className={`w-px bg-typography absolute text-xs`} 
                style={{left: `${i*editorStore.pixelPerSecond}px`, height: `${i%10==0?10:5}px`}}
              >
                <div className="absolute top-4 -left-1.5 text-typography">{i%10==0?i:""}</div>
              </div>
            )
          })}
        </div>
        <div className="relative h-full min-w-max" onClick={() => selectAsset(null)}>
            {sortedMedias.map((media, i) => <TimelineMedia key={i} media={media}/>)}
            {Array(layersCount).fill(0).map((_, i)=>{
              return <div 
                key={(i+1)}
                className="bg-shadow/80 w-full h-px cursor-ns-resize transition-colors z-50 absolute left-0"
                style={{top: `${(i+1)*editorStore.layerHeight-3}px`}}
              ></div>
            })}
        </div>
      </div>
    </div>
  );
}