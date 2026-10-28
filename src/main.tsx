import { createRoot } from "react-dom/client";
import App from "./App";
import AppBoundary from "./AppBoundary";
import "./fonts.css";
import "./style.css";
import "./gameplay-vfx.css";
import "./audio.css";
import "./library-life.css";
import "./app-finish.css";
import "./premium6.css";
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <App />
  </AppBoundary>,
);
