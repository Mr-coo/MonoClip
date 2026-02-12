import ButtonOutlined from "../../buttons/button.outlined";

export default function MediaItem(){
  return (
  <div className="flex flex-col w-full h-full min-h-0">
    <h2 className="text-2xl border-b-2 border-b-shadow w-full p-2">
      Media
    </h2>
    
    <div className="flex-1 w-full my-5 p-2 flex justify-between items-start flex-wrap gap-4 overflow-y-auto no-scrollbar">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="w-32 h-32 bg-amber-500 rounded">
          test
        </div>
      ))}
    </div>
    <ButtonOutlined label="Upload" onClick={() => {}} />
  </div>

  )
}