import { useState } from "react"
import ButtonFilled from "../buttons/button.filled"

export default function Topbar(){
  const [fileName, setFileName] = useState("text")
  const [scale, setScale] = useState(100)
  const [ratio, setRation] = useState("16:9")

  return (
    <div className="bg-mid py-3 px-8 flex justify-between items-center">
      <input type="text" value={fileName} onChange={(e)=>{setFileName(e.target.value)}} className="p-2"/>
      <p>{scale}%</p>
      <div className="flex items-center gap-5">
        <div className="w-25">
          <ButtonFilled label="Export" onClick={()=>{}}/>
        </div>
        <p>{ratio}</p>
      </div>
    </div>
  )
}