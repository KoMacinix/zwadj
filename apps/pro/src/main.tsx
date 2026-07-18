import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Readex Pro auto-hébergée (@fontsource, latin + arabe) + tokens partagés
// @zwadj/ui — même fondation visuelle que le site client (D19).
import "@fontsource/readex-pro/300.css";
import "@fontsource/readex-pro/400.css";
import "@fontsource/readex-pro/500.css";
import "@fontsource/readex-pro/600.css";
import "@fontsource/readex-pro/700.css";
import "@zwadj/ui/styles.css";
import "./theme.css";
import { initI18n } from "./i18n";
import { App } from "./App";

initI18n();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
