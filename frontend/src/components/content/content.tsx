import { useLayoutEffect, useRef, useState } from "react";
import { useTimelineStore } from "../../store/timeline.store";
import { ContentMediaAsset } from "./contentMediaAsset";
import { useEditorStore } from "../../store/editor.store";

export default function Content(){
  const { assets } = useTimelineStore();
  const { timelineHeight } = useEditorStore();
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const { width, height } = containerRef.current.getBoundingClientRect();
      const scaleX = width / DESIGN_WIDTH;
      const scaleY = height / DESIGN_HEIGHT;

      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [timelineHeight]);
  
  return (
    <div className="p-10 h-2/3 flex items-center justify-center">
      <div 
        ref={containerRef}
        className="bg-white h-full aspect-video relative"
      >
        <div
          className="absolute top-0 left-0"
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {assets.map((asset) => (
            <ContentMediaAsset key={asset.id} asset={asset} />
          ))}
        </div>
      </div>
    </div>
  )
}