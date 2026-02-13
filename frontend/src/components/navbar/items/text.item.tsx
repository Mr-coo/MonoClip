import ButtonOutlined from "../../buttons/button.outlined";

export default function TextItem(){
  return (
    <div className="flex flex-col justify-start items-center gap-5">
      <h2 className="text-2xl border-b-2 border-b-shadow w-full p-2">
        Text
      </h2>
      <ButtonOutlined label="add detail text" fontSize={12} onClick={()=>{}}/>
      <ButtonOutlined label="add regular text" fontSize={16} onClick={()=>{}}/>
      <ButtonOutlined label="add subheading text" fontSize={20} onClick={()=>{}}/>
      <ButtonOutlined label="add heading text" fontSize={24} onClick={()=>{}}/>
      
    </div>
  )
}