import { createRoot } from "react-dom/client";
import App from "./App";
import AppBoundary from "./AppBoundary";
import "./style.css";
import "./gameplay-vfx.css";
import "./audio.css";
import "./library-life.css";
import "./app-finish.css";
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <App />
  </AppBoundary>,
);
