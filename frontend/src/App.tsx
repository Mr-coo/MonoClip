import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Navbar from "./components/navbar/navbar";
import Topbar from "./components/topbar/topbar";
import Content from "./content/content";
import TimeLine from "./components/timeline/timeline";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [isShowDetail, setIsShowDetail] = useState<boolean>(true)

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container w-screen h-screen bg-black overflow-hidden flex justify-between items-center">
      <Navbar isShowDetail={isShowDetail} setIsShowDetail={setIsShowDetail}/>
      <div className={`h-screen bg-base text-typography flex justify-between flex-col ${isShowDetail?"w-[calc(100vw-400px)]":"w-[calc(100vw-20px)] transition-all duration-200"}`}>
        <Topbar/>
        <Content/>
        <TimeLine/>
      </div>
    </main>
  );
}

export default App;
