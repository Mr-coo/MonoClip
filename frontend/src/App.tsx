import { useState } from "react";
import Navbar from "./components/navbar/navbar";
import Topbar from "./components/topbar/topbar";
import Content from "./components/content/content";
import TimeLine from "./components/timeline/timeline";
import { DragGhost } from "./components/DragGhost";
import { usePlayback } from "./hook/usePlayback";
import { useKeyboardShortcuts } from "./hook/useKeyboardShortcuts";

function App() {
  const [isShowDetail, setIsShowDetail] = useState<boolean>(true)

  usePlayback()
  useKeyboardShortcuts()

  return (
    <main className="w-screen h-screen bg-black overflow-hidden flex justify-between items-center">
      <Navbar isShowDetail={isShowDetail} setIsShowDetail={setIsShowDetail}/>
      <div className={`h-screen bg-base text-typography flex justify-between flex-col ${isShowDetail?"w-[calc(100vw-400px)]":"w-[calc(100vw-20px)] transition-all duration-200"}`}>
        <Topbar/>
        <Content/>
        <TimeLine/>
      </div>
      <DragGhost />
    </main>
  );
}

export default App;
