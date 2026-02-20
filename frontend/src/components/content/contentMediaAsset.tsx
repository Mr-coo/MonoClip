import { useEffect, useRef } from "react";
import { MediaAsset } from "../../types/mediaAsset"
import { useTimelineStore } from "../../store/timeline.store";
import { useMoveMediaInContent } from "../../hook/useMoveMediaInContent";

export function ContentMediaAsset({asset}: {asset:MediaAsset}){
  const moveMedia = useMoveMediaInContent(asset.id)
  const { currentTime, isPlaying } = useTimelineStore();

  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | HTMLAudioElement>(null);

  useEffect(()=>{
    const media = mediaRef.current
    if (!media) return;

    const isVisible = currentTime >= asset.startInTimeLine && 
                      currentTime <= asset.startInTimeLine + asset.endTime;

    if(isVisible){
      media.style.display = 'block'

      if(media instanceof HTMLVideoElement || media instanceof HTMLAudioElement){
        const localTime = currentTime - asset.startInTimeLine;
        if (Math.abs(media.currentTime - localTime) > 0.1) media.currentTime = localTime;
        if (isPlaying) media.play();
        else media.pause();
      }
    }
    else{
      media.style.display = "none";
      if(media instanceof HTMLVideoElement) media.pause();
    }
  }, [currentTime, isPlaying, asset])
  return (
  <>
    {asset.type=="img"
      ? (<img 
        ref={mediaRef}
        src={asset.path}
        draggable={false}
        className="absolute box-border hover:border-2 hover:border-constrast h-full"
        style={{zIndex: asset.layer, top: asset.y, left: asset.x}}
        onPointerDown={moveMedia.onPointerDown}
        onPointerMove={moveMedia.onPointerMove}
        onPointerUp={moveMedia.onPointerUp}
        />
      ) :( asset.type=="video"
      ? (<video 
          ref={mediaRef}
          src={asset.path}
          className="absolute box-border hover:border-2 hover:border-constrast h-full"
          style={{zIndex: asset.layer, top: asset.y, left: asset.x}}
          onPointerDown={moveMedia.onPointerDown}
          onPointerMove={moveMedia.onPointerMove}
          onPointerUp={moveMedia.onPointerUp}
        ></video>
      ) : (
        <audio 
          ref={mediaRef}
          src={asset.path}
          className="hidden"
        ></audio>
      ))
    }
  </>
  )
}