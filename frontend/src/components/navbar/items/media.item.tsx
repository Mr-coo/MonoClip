import ButtonOutlined from "../../buttons/button.outlined";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useMediaStore } from "../../../store/media.store";
import { DEFAULT_MEDIA_ASSET_SETTINGS, MediaAsset } from "../../../types/mediaAsset";
import { MdOutlineAudiotrack, MdDelete } from "react-icons/md";
import { FaImages } from "react-icons/fa";
import { FaVideo } from "react-icons/fa6";
import { useTimelineStore } from "../../../store/timeline.store";

export default function MediaItem() {
  const addAssetMediaStore = useMediaStore((state) => state.addAsset);
  const removeAssetMediaStore = useMediaStore((state) => state.removeAsset);
  const addAssetTimeline = useTimelineStore((state) => state.addAsset);
  const assets = useMediaStore((state) => state.assets);

  function getFileType(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    if (["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm"].includes(ext)) return "video";
    if (["mp3", "wav"].includes(ext)) return "audio";
    if (["png", "jpg", "jpeg"].includes(ext)) return "img";
    return "";
  }

  function getFileMetadata(path: string, type: string): Promise<MediaAsset> {
    return new Promise((resolve, reject) => {
      let el: HTMLVideoElement | HTMLImageElement | HTMLAudioElement;
      if (type === "video") el = document.createElement("video");
      else if (type === "audio") el = document.createElement("audio");
      else el = document.createElement("img");

      el.src = convertFileSrc(path);

      const handleLoad = () => {
        resolve({
          ...DEFAULT_MEDIA_ASSET_SETTINGS,
          id: "",
          type,
          path: el.src,
          name: path.split(/[\\/]/).pop() || "unknown",
          endTime: el instanceof HTMLMediaElement ? el.duration : 5,
          width:
            el instanceof HTMLVideoElement
              ? el.videoWidth
              : el instanceof HTMLImageElement
              ? el.naturalWidth
              : 0,
          height:
            el instanceof HTMLVideoElement
              ? el.videoHeight
              : el instanceof HTMLImageElement
              ? el.naturalHeight
              : 0,
        });
      };

      if (el instanceof HTMLImageElement) {
        el.onload = handleLoad;
      } else {
        el.preload = "metadata";
        el.onloadedmetadata = handleLoad;
      }
      el.onerror = () => reject(new Error(`Failed to load ${type} metadata`));
    });
  }

  async function handleUpload() {
    const filePath = await open({
      multiple: false,
      filters: [
        {
          name: "Media",
          extensions: ["mp4", "mov", "mkv", "mp3", "wav", "png", "jpg", "jpeg"],
        },
      ],
    });
    if (!filePath) return;
    const type = getFileType(filePath);
    if (!type) return;
    addAssetMediaStore(await getFileMetadata(filePath, type));
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    removeAssetMediaStore(id);
  }

  const shortName = (name: string) =>
    name.length < 9 ? name : name.substring(0, 9) + "…";

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <h2 className="text-2xl border-b-2 border-b-shadow w-full p-2">Media</h2>

      <div className="flex-1 w-full my-5 p-2 flex justify-between items-start content-start flex-wrap gap-4 overflow-y-auto no-scrollbar">
        {assets.map((val) => {
          switch (val.type) {
            case "video":
              return (
                <div
                  key={val.id}
                  className="relative w-32 h-32 rounded group overflow-hidden hover:scale-105 transition-all duration-200 cursor-pointer"
                  onClick={() => addAssetTimeline(val)}
                >
                  <div className="bg-linear-to-b from-base/60 to-dark/90 absolute z-10 w-32 h-32 rounded top-32 group-hover:top-0 transition-all duration-200 flex flex-col items-center justify-center">
                    <button
                      className="absolute top-1 right-1 text-red-400/70 hover:text-red-400 transition-colors"
                      onClick={(e) => handleDelete(e, val.id)}
                      title="Remove from library"
                    >
                      <MdDelete size={16} />
                    </button>
                    <FaVideo size={35} />
                    <p className="text-xs mt-2">{shortName(val.name)}</p>
                  </div>
                  <video src={val.path} className="w-32 h-32 rounded object-cover" />
                </div>
              );

            case "img":
              return (
                <div
                  key={val.id}
                  className="relative w-32 h-32 rounded group overflow-hidden hover:scale-105 transition-all duration-200 cursor-pointer"
                  onClick={() => addAssetTimeline(val)}
                >
                  <div className="bg-linear-to-b from-base/60 to-dark/90 absolute z-10 w-32 h-32 rounded top-32 group-hover:top-0 transition-all duration-200 flex flex-col items-center justify-center">
                    <button
                      className="absolute top-1 right-1 text-red-400/70 hover:text-red-400 transition-colors"
                      onClick={(e) => handleDelete(e, val.id)}
                      title="Remove from library"
                    >
                      <MdDelete size={16} />
                    </button>
                    <FaImages size={35} />
                    <p className="text-xs mt-2">{shortName(val.name)}</p>
                  </div>
                  <img
                    src={val.path}
                    alt={val.name}
                    className="w-32 h-32 rounded object-cover absolute"
                  />
                </div>
              );

            case "audio":
              return (
                <div
                  key={val.id}
                  className="relative w-32 h-32 rounded bg-white/10 flex items-center justify-center flex-col hover:scale-105 transition-all duration-200 cursor-pointer group"
                  onClick={() => addAssetTimeline(val)}
                >
                  <button
                    className="absolute top-1 right-1 text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => handleDelete(e, val.id)}
                    title="Remove from library"
                  >
                    <MdDelete size={16} />
                  </button>
                  <MdOutlineAudiotrack size={35} />
                  <p className="text-xs mt-2">{shortName(val.name)}</p>
                </div>
              );

            default:
              return null;
          }
        })}
      </div>

      <ButtonOutlined label="Upload" onClick={handleUpload} />
    </div>
  );
}