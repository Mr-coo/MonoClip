import { useEffect, useRef } from "react";
import { useMoveMediaInContent } from "../../hook/useMoveMediaInContent";
import { useTimelineStore } from "../../store/timeline.store";
import { MediaAsset } from "../../types/mediaAsset";

export function ContentMediaAsset({ asset }: { asset: MediaAsset }) {
  const moveMedia = useMoveMediaInContent(asset.id);
  const { currentTime, isPlaying } = useTimelineStore();
  const mediaRef = useRef<
    HTMLVideoElement | HTMLImageElement | HTMLAudioElement
  >(null);

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
    top: asset.y,
    left: asset.x,
    width: asset.width,
    height: asset.height,
    zIndex: asset.layer,
  };

  if (asset.type === "img") {
    return (
      <img
        ref={mediaRef}
        src={asset.path}
        draggable={false}
        style={style}
        className="box-border hover:border-2 hover:border-constrast"
        {...moveMedia}
      />
    );
  }

  if (asset.type === "video") {
    return (
      <video
        ref={mediaRef}
        src={asset.path}
        style={style}
        className="box-border hover:border-2 hover:border-constrast"
        {...moveMedia}
      />
    );
  }

  return <audio ref={mediaRef} src={asset.path} />;
}