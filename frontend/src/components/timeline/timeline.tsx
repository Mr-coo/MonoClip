import { useEffect, useMemo, useRef, useState } from "react";
import { useTimelineStore } from "../../store/timeline.store";
import { FaPlay } from "react-icons/fa6";
import { FaPause } from "react-icons/fa6";
import { TiArrowSortedDown } from "react-icons/ti";
import { MediaAsset } from "../../types/mediaAsset";
import { useReziseTimeline } from "../../hook/useResizeTimeline";
import { useEditorStore } from "../../store/editor.store";

export default function Timeline() {
  const { assets, currentTime, isPlaying, togglePlay } = useTimelineStore();
  const editorStore = useEditorStore()
  const resizeTimelineHook = useReziseTimeline()

  const layers = new Set(assets.map(a=>a.layer))
  
  const sortedMedias = useMemo(() => {
    return [...assets].sort((a, b) => {
      if (b.layer !== a.layer) return b.layer - a.layer;
      return a.startInTimeLine - b.startInTimeLine;
    });
  }, [assets]);

  return (
    <div>
      <div className="w-full relative flex justify-center items-center p-2">
        <button 
          className="bg-primary p-3 rounded-4xl hover:bg-primary/80"
          onClick={togglePlay}
        >{isPlaying?<FaPause/>:<FaPlay/>}</button>
      </div>
      <div 
        className="bg-mid w-full overflow-x-auto overflow-y-auto relative border-t border-white/10 px-2" 
        style={{height: `${editorStore.timelineHeight}px`}}
      >
        <div className="group">
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
        <div className="relative h-full min-w-max">
            {sortedMedias.map((media) => {
              const left = media.startInTimeLine * editorStore.pixelPerSecond;
              const width = (media.endTime - (media.startTime || 0)) * editorStore.pixelPerSecond;
              const top = (media.layer - 1) * editorStore.layerHeight;

              return (
                <div
                  key={media.id}
                  className="absolute bg-gray-800 border border-white/10 rounded overflow-hidden h-9 opacity-60 hover:opacity-100 transition-opacity"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                  }}
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
            })}
            {[...layers].map((val)=>{
              return <div 
                className="bg-shadow/80 w-full h-px cursor-ns-resize transition-colors z-50 absolute left-0"
                style={{top: `${val*editorStore.layerHeight-3}px`}}
              ></div>
            })}
        </div>
      </div>
    </div>
  );
}