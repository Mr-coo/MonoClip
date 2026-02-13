import { useEffect, useMemo, useState } from "react";
import { useTimelineStore } from "../../store/timeline.store";

export default function Timeline() {
  const assets = useTimelineStore((state) => state.assets);
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const layers = new Set(assets.map(a=>a.layer))

  const PIXELS_PER_SECOND = 10; 
  const LAYER_HEIGHT = 42;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
        setTimelineHeight(newHeight);
      }
    };

    const stopResizing = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopResizing);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);
  
  const sortedMedias = useMemo(() => {
    return [...assets].sort((a, b) => {
      if (b.layer !== a.layer) return b.layer - a.layer;
      return a.startInTimeLine - b.startInTimeLine;
    });
  }, [assets]);

  return (
    <div className="bg-mid w-full overflow-x-auto overflow-y-auto relative border-t border-white/10 px-2" style={{height: `${timelineHeight}px`}}>
      <div 
        className="bg-mid hover:bg-primary w-full h-1 cursor-ns-resize transition-colors z-50" 
        onMouseDown={()=>setIsResizing(true)}
      />
      <div className="bg-mid-300 w-full h-8 relative">
        {Array(200).fill(0).map((_, i)=>{
          return <div className={`w-px h-${i%10==0?4:2} bg-typography/80 absolute text-xs`} style={{left: `${i*PIXELS_PER_SECOND}px`}}>
            <div className="absolute top-4 -left-1.5 text-typography">{i%10==0?i:""}</div>
          </div>
        })}
      </div>
      <div className="relative h-full min-w-max">
          {sortedMedias.map((media) => {
            const left = media.startInTimeLine * PIXELS_PER_SECOND;
            const width = (media.endTime - (media.startTime || 0)) * PIXELS_PER_SECOND;
            const top = (media.layer - 1) * LAYER_HEIGHT;

            return (
              <div
                key={media.id}
                className="absolute bg-gray-800 border border-white/10 rounded overflow-hidden h-9"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                }}
              >
                {media.type === "video" ? (
                  <video
                    src={media.path} // Ensure this is wrapped in convertFileSrc if using Tauri
                    className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                    onLoadedData={(e) => {
                      // This shows the very first frame of the video
                      e.currentTarget.currentTime = 0; 
                    }}
                    muted
                    playsInline
                  />
                ) : (
                  <img src={media.path} className="w-full h-full object-cover opacity-60" />
                )}
              </div>
            );
          })}
          {[...layers].map((val)=>{
            console.log(layers)
            return <div 
              className="bg-shadow/80 w-full h-px cursor-ns-resize transition-colors z-50 absolute left-0"
              style={{top: `${val*LAYER_HEIGHT-3}px`}}
            ></div>
          })}
      </div>
    </div>
  );
}