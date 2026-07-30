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
import { applyStoredTheme } from "@zwadj/ui";

// UI-D2 — avant le premier rendu : le CSS gère déjà la préférence SYSTÈME, ce
// appel ne sert qu'au CHOIX explicite. Le pro n'ayant pas de HTML rendu par
// React, il n'y a pas de <head> où injecter le script d'amorçage du client.
applyStoredTheme();
import { initI18n } from "./i18n";
import { App } from "./App";

initI18n();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
