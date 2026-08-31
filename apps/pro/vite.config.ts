/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    // Idem apps/api : @zwadj/types a main → dist (runtime NestJS), donc on force
    // la source ici, pour le build ET les tests. Les autres packages ont déjà
    // main → src. Ne PAS aliaser @zwadj/ui : une clé string matche aussi les
    // sous-chemins et casserait @zwadj/ui/styles.css.
    alias: { "@zwadj/types": resolve(__dirname, "../../packages/types/src/index.ts") }
  },
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
    // ⛔ D270 — BORNE DE WORKERS, ET C'EST UNE ASSURANCE, PAS UN CORRECTIF.
    //
    // Sous charge légère les trois modes sont verts ; c'est SOUS CHARGE que
    // le défaut par défaut apparaît. Mesuré le 30/08 sur machine chargée :
    // mode par défaut = 46 à 52 délais dépassés,  = 4.
    // Durées sous charge IDENTIQUE et légère (RAM ~4,2 Go, CPU 1-2 %) :
    // défaut 35 s · maxWorkers=4 46 s · --no-file-parallelism 92 s.
    // On paie donc +31 % pour encaisser la charge, là où la sérialisation
    // coûterait 2,6× pour un gain marginal.
    //
    // ⚠ Chaque worker porte un environnement jsdom complet. Le défaut de
    // vitest suit le nombre de cœurs (12 ici) sans regarder la mémoire
    // disponible — c'est ce qui s'effondre quand la machine est occupée.
    maxWorkers: 4
  }
});
