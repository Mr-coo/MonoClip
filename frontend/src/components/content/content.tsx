import { useLayoutEffect, useRef, useState } from "react";
import { useTimelineStore } from "../../store/timeline.store";
import { ContentMediaAsset } from "./contentMediaAsset";
import { useEditorStore } from "../../store/editor.store";
import { useCaptionStore } from "../../store/caption.store";

export default function Content() {
  const { assets, currentTime } = useTimelineStore();
  const { timelineHeight, canvasWidth, canvasHeight, setContentScale, snapGuides } = useEditorStore();
  const { segments } = useCaptionStore();

  const [scale, setScale] = useState(1);
  const [displayW, setDisplayW] = useState(0);
  const [displayH, setDisplayH] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      if (!outerRef.current) return;
      const { width, height } = outerRef.current.getBoundingClientRect();
      // p-10 = 40px each side
      const availW = width - 80;
      const availH = height - 80;
      const s = Math.min(availW / canvasWidth, availH / canvasHeight);
      setScale(s);
      setDisplayW(Math.round(canvasWidth * s));
      setDisplayH(Math.round(canvasHeight * s));
      setContentScale(s);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [timelineHeight, canvasWidth, canvasHeight]);

  const activeCaption = segments.find(
    (s) => currentTime >= s.start && currentTime < s.end,
  );

  return (
    <div ref={outerRef} className="p-10 h-2/3 flex items-center justify-center">
      <div
        className="bg-white relative overflow-visible"
        style={{ width: displayW, height: displayH }}
      >
        <div
          className="absolute top-0 left-0"
          style={{
            width: canvasWidth,
            height: canvasHeight,
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
                bottom: Math.round(canvasHeight * 0.074),
                padding: `0 ${Math.round(canvasWidth * 0.083)}px`,
                fontSize: Math.round(canvasHeight * 0.059),
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

          {/* Snap guide lines */}
          {snapGuides?.vertical !== undefined && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: snapGuides.vertical,
                width: 1,
                height: canvasHeight,
                backgroundColor: "rgba(0, 210, 255, 0.85)",
                zIndex: 9999,
              }}
            />
          )}
          {snapGuides?.horizontal !== undefined && (
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: snapGuides.horizontal,
                width: canvasWidth,
                height: 1,
                backgroundColor: "rgba(0, 210, 255, 0.85)",
                zIndex: 9999,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
