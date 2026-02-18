import { useEffect, useRef } from "react";
import { useTimelineStore } from "../../store/timeline.store";

export default function Content(){
  const { assets, currentTime, isPlaying } = useTimelineStore();
  const videoRefs = useRef<HTMLElement[]>([]);

  useEffect(()=>{
    assets.forEach((asset, i)=>{
      const video = videoRefs.current[i]
      if (!video) return;

      const localTime = currentTime - asset.startInTimeLine;
      const isVisible = currentTime >= asset.startInTimeLine && 
                        currentTime <= asset.startInTimeLine + asset.endTime;
      if(isVisible){
        video.style.display = 'block'

        if(video instanceof HTMLVideoElement){
          if (Math.abs(video.currentTime - localTime) > 0.1) video.currentTime = localTime;
          if (isPlaying) video.play();
          else video.pause();
        }
      }
      else{
        video.style.display = "none";
        if(video instanceof HTMLVideoElement) video.pause();
      }
    })
  }, [currentTime, isPlaying, assets])
  
  return (
    <div className="p-10 h-2/3 flex items-center justify-center">
      <div className="bg-white h-full aspect-video">
        {assets.map((val, i)=>{
          return (
            <video 
              key={i}
              ref={(el) => (videoRefs.current[i] = el)}
              src={val.path}
            ></video>
          )
        })}
      </div>
    </div>
  )
}