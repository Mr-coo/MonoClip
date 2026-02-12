export default function ButtonOutlined({label,  fontSize=16, onClick}:{label:string, fontSize?:number, onClick:() => void}){
  return (
    <button 
      className={`text-typography border border-typography p-2 rounded-xl w-full hover:bg-typography/5 transition-all duration-200`}
      style={{fontSize: fontSize+"px"}}
      onClick={onClick}
    >{label}</button>
  )
}