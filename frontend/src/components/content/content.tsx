import { useTimelineStore } from "../../store/timeline.store";

export default function Content(){
  const assets = useTimelineStore((state) => state.assets);
  
  return (
    <div className="p-10 h-2/3 flex items-center justify-center">
      <div className="bg-white h-full aspect-video"></div>
    </div>
  )
}