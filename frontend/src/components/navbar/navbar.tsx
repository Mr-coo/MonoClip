import { FaKeyboard } from "react-icons/fa";
import logo from '../../../public/logo.png'
import { HiUpload } from "react-icons/hi";
import { PiTextTBold } from "react-icons/pi";
import { LuCaptions, LuScissors } from "react-icons/lu";
import { GoStarFill } from "react-icons/go";
import { FaLayerGroup } from "react-icons/fa";
import { TbBackground } from "react-icons/tb";
import { MdMyLocation, MdOutlineArrowLeft, MdOutlineArrowRight } from "react-icons/md";
import NavbarItem from "./navbar.item";
import { Dispatch, SetStateAction, useState } from "react";
import MediaItem from "./items/media.item";
import CaptionItem from "./items/caption.item";
import TextItem from "./items/text.item";
import TrackingItem from "./items/tracking.item";
import SmartCutItem from "./items/smartcut.item";
import BgRemoveItem from "./items/bgremove.item";

export default function Navbar({isShowDetail, setIsShowDetail}:{isShowDetail:boolean, setIsShowDetail: Dispatch<SetStateAction<boolean>>}){
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const iconSize = 25;
  const items = [
    {
      icon: <HiUpload className="text-typography" size={iconSize} />,
      label: "Media",
      content: <MediaItem/>
    },
    {
      icon: <PiTextTBold className="text-typography" size={iconSize} />,
      label: "Text",
      content: <TextItem/>
    },
    {
      icon: <LuCaptions className="text-typography" size={iconSize} />,
      label: "Captions",
      content: <CaptionItem/>
    },
    {
      icon: <MdMyLocation className="text-typography" size={iconSize} />,
      label: "Tracking",
      content: <TrackingItem />,
    },
    {
      icon: <LuScissors className="text-typography" size={iconSize} />,
      label: "Smart Cut",
      content: <SmartCutItem />,
    },
    {
      icon: <TbBackground className="text-typography" size={iconSize} />,
      label: "Background",
      content: <BgRemoveItem />,
    },
    {
      icon: <GoStarFill className="text-typography" size={iconSize} />,
      label: "Effect",
    },
    {
      icon: <FaLayerGroup className="text-typography" size={iconSize} />,
      label: "Transitions",
    },
  ]

  return (
    <nav className="flex justify-start items-center h-screen">
      <div className="w-20 h-screen bg-dark flex flex-col items-center justify-start shadow-[0_0px_10px] shadow-black z-10">
        <img src={logo} alt="" className='w-20'/>
        <div className="w-full flex flex-col justify-start items-center gap-4 my-4 h-[88%] overflow-scroll no-scrollbar">
          {items.map((tool, index) => (
            <NavbarItem
              key={index}
              icon={tool.icon}
              label={tool.label}
              onClick={()=>{
                setOpenIndex(prev => (prev === index ? null : index))
                setIsShowDetail(true)
              }}
            />
          ))}
        </div>
        <div className="min-w-10 min-h-10 hover:scale-105 hover:-translate-y-2 transition-all duration-200 flex justify-center items-center flex-col rounded-lg">
            <FaKeyboard className="text-typography" size={20}/>
        </div> 
      </div>
      <div 
        className={`absolute text-typography bg-dark w-80 h-screen p-3 shadow-[0_0px_10px] shadow-black z-9 ${isShowDetail?"left-20":"-left-60"} transition-all duration-200`}
      >
        {items[openIndex==null?0:openIndex].content}
      </div>
      <button 
        className={`absolute text-shadow bg-dark py-5 px-1 text-xl rounded-r-2xl hover:scale-105 hover:text-typography ${isShowDetail?"left-100":"left-20"} transition-all duration-200`}
        onClick={()=>{
          setIsShowDetail(prev => !prev)
        }}
      >
        {isShowDetail?<MdOutlineArrowLeft/>:<MdOutlineArrowRight/>}
      </button>
    </nav>
  )
}