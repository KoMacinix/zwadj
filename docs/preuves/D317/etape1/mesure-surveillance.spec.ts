import { appendFileSync, existsSync, readFileSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "@playwright/test";
import { API } from "../../../../e2e/playwright.config";

/**
 * D317 — rang 26, ÉTAPE 1 — LE SERVEUR D'API DE L'E2E RECOMPILE-T-IL QUAND UN FICHIER DE SON PROGRAMME EST TOUCHÉ ?
 * Pièce versée. Mesure, pas une garde : elle n'asserte RIEN, elle relève — un rouge ici n'est pas un échec du test, c'est
 * le résultat qu'on cherche à lire.
 *
 * Pendant que le serveur tourne (celui que la configuration e2e déclare), trois bras, chacun suivi de 12 s de sondage de
 * `/api/v1/health` toutes les 100 ms :
 *   T  rien                                                                    (témoin)
 *   L  recul du dernier accès d'un fichier du programme, puis sa LECTURE        (le mécanisme « lecture »)
 *   W  ÉCRITURE : création puis suppression d'un .ts sous `apps/api/src/generated/` (dossier ignoré par git)
 * Relevé : pour chaque bras, l'heure de début, le nombre de sondes et de sondes EN ÉCHEC (connexion refusée, ou statut ≠
 * 200). Les lignes « File change detected » du serveur se lisent dans la sortie console, à côté des heures de début.
 * ⚠ Aucun fichier SUIVI n'est touché : le fichier lu et le fichier écrit sont sous `src/generated/`, ignoré par git.
 */
const racine = resolve(__dirname, "../../../..");
const LU = resolve(racine, "apps/api/src/generated/prisma/client.ts");
const ECRIT = resolve(racine, "apps/api/src/generated/zz-sonde-d317.ts");
const RELEVE = resolve(__dirname, `releve-${process.env.MESURE_ETIQUETTE ?? "sans-etiquette"}.txt`);

async function sonder(duree: number): Promise<{ sondes: number; echecs: number; premier: string | null }> {
  const fin = Date.now() + duree;
  let sondes = 0;
  let echecs = 0;
  let premier: string | null = null;
  while (Date.now() < fin) {
    sondes += 1;
    try {
      const r = await fetch(`${API}/api/v1/health`, { signal: AbortSignal.timeout(2_000) });
      if (r.status !== 200) {
        echecs += 1;
        premier ??= `statut ${r.status}`;
      }
    } catch (e) {
      echecs += 1;
      const cause = (e as { cause?: { code?: string } }).cause?.code ?? (e as Error).name;
      premier ??= String(cause);
    }
    await new Promise((ok) => setTimeout(ok, 100));
  }
  return { sondes, echecs, premier };
}

function noter(ligne: string): void {
  appendFileSync(RELEVE, `${ligne}\n`, "utf8");
}

test("relevé : le serveur d'API recompile-t-il sur lecture, sur écriture ?", async () => {
  test.setTimeout(5 * 60_000);
  writeFileSync(RELEVE, `D317 — étape 1 — relevé in situ · étiquette ${process.env.MESURE_ETIQUETTE ?? "sans-etiquette"} · ${new Date().toISOString()}\n`, "utf8");
  if (!existsSync(LU)) throw new Error(`${LU} introuvable`);
  const bras = async (nom: string, action: () => void) => {
    const debut = new Date();
    action();
    const r = await sonder(12_000);
    noter(`BRAS ${nom} · début ${debut.toTimeString().slice(0, 8)} · sondes ${r.sondes} · en échec ${r.echecs} · première cause ${r.premier ?? "—"}`);
  };
  await bras("T témoin", () => undefined);
  await bras("L recul du dernier accès puis lecture", () => {
    const st = statSync(LU);
    utimesSync(LU, new Date(Date.now() - 2 * 3600_000), st.mtime);
    readFileSync(LU);
  });
  await bras("W création d'un .ts sous src/generated", () => writeFileSync(ECRIT, "export const sondeD317 = 1;\n", "utf8"));
  await bras("W suppression de ce .ts", () => unlinkSync(ECRIT));
  noter("FIN");
});
