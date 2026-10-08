// ADAPTATEUR du port `PdfRenderer` — le Chromium de Playwright. Rang 33 (D326), décisions 2, 3 et 5 du relecteur.
//
// ── Les quatre gardes de la décision 3, chacune avec son test qui rougit quand on la retire ─────────────────────────────────────────────────────
//   1. JAVASCRIPT COUPÉ dans la page de rendu (`javaScriptEnabled: false`) : le modèle est une page remplie de saisies ; si une saisie
//      devenait un `<script>` malgré l'échappement, elle ne s'exécuterait pas. Défense en profondeur : l'échappement est la première ligne.
//   2. RÉSEAU BLOQUÉ : toute requête de la page est AVORTÉE (`route("**/*", abort)`). Un `<img src="http://hôte-interne/…">` ferait sinon
//      appeler par le SERVEUR ce que la page demande (SSRF). La police et les styles viennent du dépôt, injectés dans le document (`data:`).
//   3. NAVIGATEUR FERMÉ SUR TOUS LES CHEMINS, erreur et délai compris (`finally`) : un Chromium qui reste est de la mémoire perdue. ⚠ La porte
//      `chrome` = 0 des certifications NE LE VERRAIT PAS : le processus s'appelle `headless_shell` (mesuré, D326) — c'est ce test, pas cette
//      porte, qui garde la fermeture.
//   4. RENDUS SIMULTANÉS BORNÉS : un Chromium coûte des dizaines de Mo ; N rendus en parallèle sans borne épuisent une instance. La borne est
//      écrite (`MAX_CONCURRENT_RENDERS`), PAS MESURÉE sur l'hébergeur — backlog, piste du déploiement.
//
// Un navigateur PAR rendu (lancé puis fermé) et non un navigateur partagé : plus lent d'environ une seconde, mais rien ne reste vivant entre deux
// requêtes, et il n'y a aucun état à nettoyer après une page qui a mal tourné.
//
// ⚠ L'adaptateur reçoit son lanceur (`launch`) : le spec le remplace par un faux navigateur pour mesurer la fermeture sur les chemins d'erreur ;
// le test d'intégration le laisse lancer le VRAI Chromium. Le cast des faux vit dans le spec d'un ADAPTATEUR — c'est son métier (AGENTS.md).
import { chromium, type Browser } from "playwright-core";
import { PdfRenderUnavailableError, type PdfRenderer } from "./pdf-renderer.port";

/** Rendus simultanés au plus. Écrite, pas mesurée sur l'hébergeur. */
export const MAX_CONCURRENT_RENDERS = 2;
/** Au-delà, le moteur est tenu pour en panne et le navigateur est fermé. */
export const RENDER_TIMEOUT_MS = 30_000;

/** Un feu de circulation à N places : `run` attend qu'une place se libère. Pur, sans dépendance. */
export class Gate {
  private actifs = 0;
  private readonly attente: (() => void)[] = [];

  constructor(private readonly max: number) {
    if (!Number.isInteger(max) || max < 1) throw new RangeError("Gate attend un entier ≥ 1.");
  }

  async run<T>(travail: () => Promise<T>): Promise<T> {
    if (this.actifs >= this.max) await new Promise<void>((libre) => this.attente.push(libre));
    this.actifs += 1;
    try {
      return await travail();
    } finally {
      this.actifs -= 1;
      this.attente.shift()?.();
    }
  }
}

export interface PlaywrightPdfRendererOptions {
  launch?: () => Promise<Browser>;
  maxConcurrent?: number;
  timeoutMs?: number;
}

export class PlaywrightPdfRenderer implements PdfRenderer {
  private readonly launch: () => Promise<Browser>;
  private readonly gate: Gate;
  private readonly timeoutMs: number;

  constructor(options: PlaywrightPdfRendererOptions = {}) {
    this.launch = options.launch ?? (() => chromium.launch());
    this.gate = new Gate(options.maxConcurrent ?? MAX_CONCURRENT_RENDERS);
    this.timeoutMs = options.timeoutMs ?? RENDER_TIMEOUT_MS;
  }

  render(html: string): Promise<Buffer> {
    return this.gate.run(() => this.renderOne(html));
  }

  private async renderOne(html: string): Promise<Buffer> {
    // `as` : sans lui, TypeScript réduit `browser` à `undefined` au `finally` (l'affectation vit dans une fermeture) et refuse `.close()`.
    let browser = undefined as Browser | undefined;
    let minuteur: NodeJS.Timeout | undefined;
    // ⚠ Posé par le `finally` : si le DÉLAI tombe pendant que le navigateur se lance encore, `browser` est indéfini et le `finally` n'a rien à fermer —
    // le navigateur qui finirait de se lancer APRÈS serait orphelin. Le travail, lui, le voit et le ferme lui-même.
    let abandonne = false;
    try {
      const travail = (async () => {
        const lance = await this.launch();
        browser = lance;
        if (abandonne) {
          await lance.close().catch(() => undefined);
          browser = undefined;
          throw new Error("rendu abandonné avant la fin du lancement");
        }
        // Garde 1 : JavaScript coupé.
        const context = await lance.newContext({ javaScriptEnabled: false });
        // Garde 2 : toute requête avortée. `data:` n'est pas une requête réseau — la police du dépôt, injectée dans le document, passe.
        await context.route("**/*", (route) => route.abort());
        const page = await context.newPage();
        await page.setContent(html, { waitUntil: "load", timeout: this.timeoutMs });
        return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
      })();
      const delai = new Promise<never>((_, rejette) => {
        minuteur = setTimeout(() => rejette(new Error(`rendu PDF : délai de ${this.timeoutMs} ms dépassé`)), this.timeoutMs);
      });
      // Le travail est « mangé » s'il échoue APRÈS le délai : sans ce `catch`, son rejet tardif serait une promesse rejetée sans écouteur.
      travail.catch(() => undefined);
      return await Promise.race([travail, delai]);
    } catch (erreur) {
      throw new PdfRenderUnavailableError(erreur);
    } finally {
      abandonne = true;
      if (minuteur !== undefined) clearTimeout(minuteur);
      // Garde 3 : fermé sur tous les chemins. Si le lancement échoue, `browser` est indéfini — rien à fermer ; sinon on ferme, et une fermeture
      // qui échoue à son tour ne masque pas l'erreur d'origine.
      if (browser !== undefined) await browser.close().catch(() => undefined);
    }
  }
}
