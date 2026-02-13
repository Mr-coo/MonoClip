import { useRef, useState } from "react";
import ButtonOutlined from "../../buttons/button.outlined";
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, invoke } from "@tauri-apps/api/core";

export default function MediaItem(){
  const [videoPaths, setVideoPaths] = useState<string[]>([]);
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [audioPaths, setAudioPaths] = useState<string[]>([]);

  async function handleButtonClicked(){
    const file = await open({
      multiple: false,
      directory: false,
    });

    if(!file) return

    const result = await invoke('load_file_data', {
      path: file
    })
    if(!result) return

    if(['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm'].includes(result.extension)){
      setVideoPaths(prev => [...prev, convertFileSrc(file)])
    }
  }

  return (
  <div className="flex flex-col w-full h-full min-h-0">
    <h2 className="text-2xl border-b-2 border-b-shadow w-full p-2">
      Media
    </h2>
    
    <div className="flex-1 w-full my-5 p-2 flex justify-between items-start flex-wrap gap-4 overflow-y-auto no-scrollbar">
      {videoPaths.map((val, i) => (
        <video src={val} className="w-32 h-32  rounded object-cover"></video>
      ))}
    </div>
    <ButtonOutlined label="Upload" onClick={handleButtonClicked} />
  </div>

  )
}