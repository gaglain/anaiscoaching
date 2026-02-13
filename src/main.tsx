import { createRoot } from "react-dom/client";
// @ts-ignore - virtual module from vite-plugin-pwa
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker with auto-update
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);
