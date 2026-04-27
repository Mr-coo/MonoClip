import { useEffect, useRef } from "react";
import { useMoveMediaInContent } from "../../hook/useMoveMediaInContent";
import { useResizeMediaInContent } from "../../hook/useResizeMediaInContent";
import { useTimelineStore } from "../../store/timeline.store";
import { MediaAsset } from "../../types/mediaAsset";
import { PreviewStateType } from "../../enum/previewStateType.enum";
import { DEFAULT_TEXT_STYLE } from "../../types/textStyle";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.startsWith('#') ? hex : `#${hex}`;
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function ContentMediaAsset({ asset }: { asset: MediaAsset }) {
  const moveMedia = useMoveMediaInContent(asset.id);
  const resizeTL = useResizeMediaInContent(asset.id, "tl");
  const resizeTR = useResizeMediaInContent(asset.id, "tr");
  const resizeBL = useResizeMediaInContent(asset.id, "bl");
  const resizeBR = useResizeMediaInContent(asset.id, "br");
  
  const { currentTime, isPlaying, preview } = useTimelineStore();
  const mediaRef = useRef<any>(null);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const visible =
      currentTime >= asset.startInTimeLine &&
      currentTime <= asset.startInTimeLine + (asset.endTime - asset.startTime);

    media.style.display = visible ? "block" : "none";

    if (
      visible &&
      (media instanceof HTMLVideoElement ||
        media instanceof HTMLAudioElement)
    ) {
      const localTime =
        currentTime - asset.startInTimeLine + asset.startTime;

      if (Math.abs(media.currentTime - localTime) > 0.1) {
        media.currentTime = localTime;
      }

      isPlaying ? media.play() : media.pause();
    } else if (media instanceof HTMLVideoElement) {
      media.pause();
    }
  }, [currentTime, isPlaying, asset]);

  const style = {
    position: "absolute" as const,
    top: preview?.id === asset.id && preview.type === PreviewStateType.EDIT_MEDIA_SIZE ? preview.y : asset.y,
    left: preview?.id === asset.id && preview.type === PreviewStateType.EDIT_MEDIA_SIZE ? preview.x : asset.x,
    width: (preview?.id === asset.id && preview.type === PreviewStateType.EDIT_MEDIA_SIZE ? preview.width : asset.width) as number,
    height: (preview?.id === asset.id && preview.type === PreviewStateType.EDIT_MEDIA_SIZE ? preview.height : asset.height) as number,
    zIndex: asset.layer,
  };


  if (asset.type === "img") {
    return (
      <div className="group">
        <img
          ref={mediaRef}
          src={asset.path}
          draggable={false}
          style={style}
          className="box-border group-hover:border-2 group-hover:border-constrast"
          {...moveMedia}
        />
        <div className="hidden group-hover:block absolute bg-typography shadow-xl/20 rounded-4xl w-12 h-12 cursor-nwse-resize" style={{top: style.top - 24, left: style.left - 24, zIndex: 100}} {...resizeTL}/>
        <div className="hidden group-hover:block absolute bg-typography shadow-xl/20 rounded-4xl w-12 h-12 cursor-nesw-resize" style={{top: style.top - 24, left: style.left + style.width - 24, zIndex: 100}} {...resizeTR}/>
        <div className="hidden group-hover:block absolute bg-typography shadow-xl/20 rounded-4xl w-12 h-12 cursor-nesw-resize" style={{top: style.top + style.height - 24, left: style.left - 24, zIndex: 100}} {...resizeBL}/>
        <div className="hidden group-hover:block absolute bg-typography shadow-xl/20 rounded-4xl w-12 h-12 cursor-nwse-resize" style={{top: style.top + style.height - 24, left: style.left + style.width - 24, zIndex: 100}} {...resizeBR}/>
      </div>
    );
  }

  if (asset.type === "video") {
    return (
      <div className="group">
        <video
          ref={mediaRef}
          src={asset.path}
          style={style}
          className="box-border hover:border-2 hover:border-constrast"
          {...moveMedia}
        />
        <div className="hidden group-hover:block absolute bg-typography shadow-2xl rounded-4xl w-12 h-12 cursor-nwse-resize" style={{top: style.top - 24, left: style.left - 24, zIndex: 100}} {...resizeTL}/>
        <div className="hidden group-hover:block absolute bg-typography shadow-2xl rounded-4xl w-12 h-12 cursor-nesw-resize" style={{top: style.top - 24, left: style.left + style.width - 24, zIndex: 100}} {...resizeTR}/>
        <div className="hidden group-hover:block absolute bg-typography shadow-2xl rounded-4xl w-12 h-12 cursor-nesw-resize" style={{top: style.top + style.height - 24, left: style.left - 24, zIndex: 100}} {...resizeBL}/>
        <div className="hidden group-hover:block absolute bg-typography shadow-2xl rounded-4xl w-12 h-12 cursor-nwse-resize" style={{top: style.top + style.height - 24, left: style.left + style.width - 24, zIndex: 100}} {...resizeBR}/>
      </div>
    );
  }

  if (asset.type === "text") {
    const ts = asset.textStyle ?? DEFAULT_TEXT_STYLE;

    let textColorStyles: React.CSSProperties = {};
    if (ts.gradient) {
      const gradStr =
        ts.gradient.type === 'linear'
          ? `linear-gradient(${ts.gradient.angle}deg, ${ts.gradient.fromColor}, ${ts.gradient.toColor})`
          : `radial-gradient(circle, ${ts.gradient.fromColor}, ${ts.gradient.toColor})`;
      textColorStyles = {
        backgroundImage: gradStr,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };
    } else {
      textColorStyles = { color: ts.color };
    }

    const textShadow =
      ts.shadowOpacity > 0
        ? `${ts.shadowOffsetX}px ${ts.shadowOffsetY}px ${ts.shadowBlur}px ${hexToRgba(ts.shadowColor, ts.shadowOpacity)}`
        : undefined;

    const bgColor = ts.bgOpacity > 0 ? hexToRgba(ts.bgColor, ts.bgOpacity) : 'transparent';

    return (
      <div
        ref={mediaRef}
        style={{
          position: 'absolute',
          top: style.top,
          left: style.left,
          width: style.width,
          opacity: ts.opacity,
          zIndex: style.zIndex,
          cursor: 'move',
          userSelect: 'none',
        }}
        {...moveMedia}
      >
        <div
          style={{
            backgroundColor: bgColor,
            padding: ts.bgOpacity > 0 ? ts.bgPadding : 0,
            borderRadius: ts.bgRadius,
          }}
        >
          <p
            style={{
              fontFamily: ts.fontFamily,
              fontSize: ts.fontSize,
              fontWeight: ts.fontWeight,
              letterSpacing: `${ts.letterSpacing}px`,
              lineHeight: ts.lineHeight,
              textAlign: ts.textAlign,
              textShadow,
              WebkitTextStroke:
                ts.strokeWidth > 0 ? `${ts.strokeWidth}px ${ts.strokeColor}` : undefined,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              pointerEvents: 'none',
              ...textColorStyles,
            }}
          >
            {ts.content}
          </p>
        </div>
      </div>
    );
  }

  return <audio ref={mediaRef} src={asset.path} />;
}