import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export default function TestAutoTranslate() {
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    const unlisten = listen("subtitle", (event) => {
      setSubtitle(event.payload as string);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <div style={{
      position: "fixed",
      bottom: 40,
      width: "100%",
      textAlign: "center",
      fontSize: "24px",
      fontWeight: "bold"
    }}>
      {subtitle}
    </div>
  );
}
