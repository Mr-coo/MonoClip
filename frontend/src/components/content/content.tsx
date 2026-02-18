import { useEffect, useRef } from "react";
import { useTimelineStore } from "../../store/timeline.store";
import { ContentMediaAsset } from "./contentMediaAsset";

export default function Content(){
  const { assets, currentTime, isPlaying } = useTimelineStore();
  
  return (
    <div className="p-10 h-2/3 flex items-center justify-center">
      <div className="bg-white h-full aspect-video relative">
        {assets.map((val, i)=>{
          return <ContentMediaAsset asset={val} key={i} />
        })}
      </div>
    </div>
  )
}