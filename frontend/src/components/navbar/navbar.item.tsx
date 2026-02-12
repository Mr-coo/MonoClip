import { ReactNode } from "react";

interface ToolbarButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

export default function NavbarItem({
  icon,
  label,
  onClick,
}: ToolbarButtonProps){
  return (
    <div
      onClick={onClick}
      className="w-15 h-15 flex justify-center items-center flex-col rounded-lg cursor-pointer hover:scale-110 hover:translate-y-1 transition-all duration-200"
    >
      {icon}
      <p className="text-typography text-[9px] mt-1">{label}</p>
    </div>
  );
}