import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './app.css';
import '@fontsource/google-sans-code/index.css';
import TestAutoTranslate from "./TestAutoTranslate";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TestAutoTranslate />
  </React.StrictMode>,
);
