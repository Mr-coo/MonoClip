import { useEffect, useRef } from "react";
import { MediaAsset } from "../../types/mediaAsset"
import { useTimelineStore } from "../../store/timeline.store";
import { useMoveMediaInContent } from "../../hook/useMoveMediaInContent";

export function ContentMediaAsset({asset}: {asset:MediaAsset}){
  const moveMedia = useMoveMediaInContent(asset.id)
  const { currentTime, isPlaying } = useTimelineStore();

  const videoRef = useRef<HTMLElement>(null);

  useEffect(()=>{
    const video = videoRef.current
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
  }, [currentTime, isPlaying, asset])
  return (
    <video 
      ref={videoRef}
      src={asset.path}
      className="absolute box-border hover:border-2 hover:border-constrast"
      style={{zIndex: asset.layer, top: asset.y, left: asset.x}}
      onPointerDown={moveMedia.onPointerDown}
      onPointerMove={moveMedia.onPointerMove}
      onPointerUp={moveMedia.onPointerUp}
    ></video>
  )
}