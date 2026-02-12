export default function ButtonFilled({label, onClick}:{label:string, onClick:() => void}){
  return (
    <button 
      className="bg-primary text-typography p-2 rounded-xl w-full shadow-lg shadow-black hover:bg-shadow hover:shadow-none transition-all duration-200"
      onClick={onClick}
    >{label}</button>
  )
}