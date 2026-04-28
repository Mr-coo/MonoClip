import { useLayoutEffect, useRef, useState } from "react";
import { useTimelineStore } from "../../store/timeline.store";
import { ContentMediaAsset } from "./contentMediaAsset";
import { useEditorStore } from "../../store/editor.store";
import { useCaptionStore } from "../../store/caption.store";

export default function Content() {
  const { assets, currentTime } = useTimelineStore();
  const { timelineHeight } = useEditorStore();
  const { segments } = useCaptionStore();

  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setScale(Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [timelineHeight]);

  const activeCaption = segments.find(
    (s) => currentTime >= s.start && currentTime < s.end,
  );

  return (
    <div className="p-10 h-2/3 flex items-center justify-center">
      <div ref={containerRef} className="bg-white h-full aspect-video relative">
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

          {activeCaption && (
            <div
              className="absolute left-0 w-full text-center pointer-events-none select-none"
              style={{
                bottom: 80,
                padding: "0 160px",
                fontSize: 64,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.3,
                textShadow:
                  "0 2px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.8)",
                WebkitTextStroke: "1px rgba(0,0,0,0.4)",
              }}
            >
              {activeCaption.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}