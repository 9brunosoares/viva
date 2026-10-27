// Test-only entry: original sound lifecycle, never shipped in a production build.
import { createRoot } from "react-dom/client";
import App from "../src/App";
import { audioDirector } from "../src/audio";
import "../src/style.css";
import "../src/gameplay-vfx.css";
import "../src/audio.css";
import "../src/library-life.css";
(window as any).__audio = audioDirector;
createRoot(document.getElementById("root")!).render(<App />);
