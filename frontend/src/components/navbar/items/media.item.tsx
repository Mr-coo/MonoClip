import ButtonOutlined from "../../buttons/button.outlined";
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useMediaStore } from "../../../store/media.store";
import { DEFAULT_MEDIA_ASSET_SETTINGS, MediaAsset } from "../../../types/mediaAsset";
import { MdOutlineAudiotrack } from "react-icons/md";
import { FaImages } from "react-icons/fa";
import { FaVideo } from "react-icons/fa6";
import { useTimelineStore } from "../../../store/timeline.store";

export default function MediaItem(){
  const addAssetMediaStore = useMediaStore((state) => state.addAsset);
  const addAssetTimeline = useTimelineStore((state) => state.addAsset);
  const assets = useMediaStore((state) => state.assets);

  function getFileType(path: string): string{
    const extension = path.split(".").pop()?.toLowerCase() ?? "";

    if(['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'].includes(extension)) return "video"
    else if(['mp3', 'wav'].includes(extension)) return "audio"
    else if(['png', 'jpg', 'jpeg'].includes(extension)) return "img"

    return "";
  }

  function getFileMetadata(path: string, type: string): Promise<MediaAsset> {
    return new Promise((resolve, reject) => {
      let data: HTMLVideoElement | HTMLImageElement | HTMLAudioElement;

      if (type === "video") data = document.createElement("video");
      else if (type === "audio") data = document.createElement("audio");
      else data = document.createElement("img");

      data.src = convertFileSrc(path);

      const handleLoad = () => {
        resolve({
          ...DEFAULT_MEDIA_ASSET_SETTINGS,
          id: "",
          type: type,
          path: data.src,
          name: path.split(/[\\/]/).pop() || "unknown",
          endTime: data instanceof HTMLMediaElement ? data.duration : 5,
          width: data instanceof HTMLVideoElement ? data.videoWidth : (data instanceof HTMLImageElement ? data.naturalWidth : 0),
          height: data instanceof HTMLVideoElement ? data.videoHeight : (data instanceof HTMLImageElement ? data.naturalHeight : 0),
        });
      };

      if (data instanceof HTMLImageElement) {
        data.onload = handleLoad;
      } else {
        data.preload = "metadata";
        data.onloadedmetadata = handleLoad;
      }

      data.onerror = () => reject(new Error(`Failed to load ${type} metadata`));
    });
  }

  async function handleButtonClicked(){
    const filePath = await open({
      multiple: false,
      filters: [
        {
          name: "Media",
          extensions: ["mp4", "mov", "mkv", "mp3", "wav", "png", "jpg", 'jpeg']
        }
      ]
    });
    if(!filePath) return

    const type = getFileType(filePath)
    if(type=="") return
    
    addAssetMediaStore(await getFileMetadata(filePath, type))
  }

  return (
  <div className="flex flex-col w-full h-full min-h-0">
    <h2 className="text-2xl border-b-2 border-b-shadow w-full p-2">
      Media
    </h2>
    
    <div className="flex-1 w-full my-5 p-2 flex justify-between items-start content-start flex-wrap gap-4 overflow-y-auto no-scrollbar">
      {assets.map((val, i) => {
        switch (val.type) {
          case "video":
            return <div 
              key={i}
              className="relative w-32 h-32 rounded group overflow-hidden hover:scale-105 transition-all duration-200 cursor-pointer" 
              onClick={()=> {addAssetTimeline(val)}}
            >
              <div className="bg-linear-to-b from-base/60 to-dark/90 absolute z-10 w-32 h-32 rounded top-32 group-hover:top-0 transition-all duration-200 flex flex-col items-center justify-center">
                <FaVideo size={35}/>
                <p className="text-xs mt-2">{val.name.length < 9 ? val.name : val.name.substring(0, 9) + '...'}</p>
              </div>
              <video src={val.path} className="w-32 h-32 rounded object-cover"/>
            </div>
          case "img":
            return <div
              key={i}
              className="relative w-32 h-32 rounded group overflow-hidden hover:scale-105 transition-all duration-200 cursor-pointer" 
              onClick={()=> {addAssetTimeline(val)}}
            >
              <div className="bg-linear-to-b from-base/60 to-dark/90 absolute z-10 w-32 h-32 rounded top-32 group-hover:top-0 transition-all duration-200 flex flex-col items-center justify-center">
                <FaImages size={35}/>
                <p className="text-xs mt-2">{val.name.length < 9 ? val.name : val.name.substring(0, 9) + '...'}</p>
              </div>
              <img src={val.path} alt={val.name} className="w-32 h-32 rounded object-cover absolute"/>
            </div>
          case "audio":
            return <div 
              key={i}
              className="w-32 h-32 rounded object-cover bg-white/10 flex items-center justify-center flex-col hover:scale-105 transition-all duration-200 cursor-pointer" 
              onClick={()=> {addAssetTimeline(val)}}
            >
              <MdOutlineAudiotrack size={35}/>
              <p className="text-xs mt-2">{val.name.length < 9 ? val.name : val.name.substring(0, 9) + '...'}</p>
            </div>
        }
      })}
    </div>
    <ButtonOutlined label="Upload" onClick={handleButtonClicked} />
  </div>

  )
}