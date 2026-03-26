import { useEffect, useRef } from "react";
import { useMoveMediaInContent } from "../../hook/useMoveMediaInContent";
import { useResizeMediaInContent } from "../../hook/useResizeMediaInContent";
import { useTimelineStore } from "../../store/timeline.store";
import { MediaAsset } from "../../types/mediaAsset";
import { PreviewStateType } from "../../enum/previewStateType.enum";

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
      currentTime <= asset.startInTimeLine + asset.endTime;

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

  return <audio ref={mediaRef} src={asset.path} />;
}