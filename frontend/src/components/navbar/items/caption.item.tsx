import { MdOutlineCloudUpload } from "react-icons/md";
import { FaClosedCaptioning } from "react-icons/fa";
import { MdSubtitles } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import { FiDownload } from "react-icons/fi";
import { MdTranslate } from "react-icons/md";
import ButtonOutlined from "../../buttons/button.outlined";

export default function CaptionItem(){
  return (
  <div className="flex flex-col justify-start items-center w-full h-full min-h-0 p-2">
    <h2 className="text-2xl border-b-2 border-b-shadow w-full">
      Caption
    </h2>

    <div className="w-full my-4 p-2 flex justify-evenly items-start flex-wrap gap-4">
      <button className="text-[10px] flex flex-col justify-center items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90">
        <FaClosedCaptioning size={20}/>
        Auto
      </button>
      <button className="text-[10px] flex flex-col justify-center items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90">
        <MdSubtitles size={20}/>
        Manual
      </button>
      <button className="text-[10px] flex flex-col justify-center items-center gap-1 bg-shadow px-4 py-2 rounded hover:opacity-90">
        <MdOutlineCloudUpload size={20}/> 
        Upload
      </button>
    </div>

    <div className="flex items-center justify-between w-full">
      <h3>Captions</h3>
      <div className="flex items-center justify-between gap-3">
        <button className="hover:bg-shadow rounded-4xl p-2"><MdTranslate/></button>
        <button className="hover:bg-shadow rounded-4xl p-2"><FiDownload/></button>
      </div>
    </div>
    <div className="flex-1 w-full my-5 flex justify-between items-start flex-wrap gap-4 overflow-y-auto no-scrollbar">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="group w-full p-2 rounded hover:bg-shadow transition-all duration-200">
          <div className="flex justify-between items-center">
            <p className="text-[11px] mb-2 font-bold">00:00:00 - 00:00:10</p>
            <MdDelete className="hidden group-hover:block transition-all duration-200 hover:scale-105"/>
          </div>
          <p className="text-xs">Lorem ipsum dolor sit amet consectetur adipisicing elit</p>
        </div>
      ))}
    </div>
    <ButtonOutlined label="Add Caption" onClick={()=>{}}/>
    
  </div>

  )
}