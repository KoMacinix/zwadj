import type { Browser } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { Gate, MAX_CONCURRENT_RENDERS, PlaywrightPdfRenderer } from "./playwright-pdf.renderer";
import { PdfRenderUnavailableError } from "./pdf-renderer.port";

// Rang 33 (D326), décision 3 — les gardes de l'ADAPTATEUR, mesurées avec un FAUX navigateur : on ne peut pas rendre un navigateur qui échoue
// « à la demande » avec le vrai. (Le vrai Chromium est joué par `test/int/pdf-renderer.int-spec.ts` : script inerte, réseau muet, police embarquée.)
// Le cast `as unknown as Browser` vit ICI, dans le spec d'un adaptateur : c'est son métier de parler à un SDK (AGENTS.md).
const dormir = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
const PDF = Uint8Array.from([0x25, 0x50, 0x44, 0x46]); // « %PDF »

interface Espion {
  newContextArgs: unknown[];
  routes: { motif: string; abort: ReturnType<typeof vi.fn> }[];
  closes: number;
  ouverts: number;
  maxOuverts: number;
  setContents: { html: string }[];
}

function faux(options: {
  launchMs?: number;
  launchEchoue?: boolean;
  newPageEchoue?: boolean;
  pdf?: () => Promise<Uint8Array>;
  closeEchoue?: boolean;
}) {
  const espion: Espion = { newContextArgs: [], routes: [], closes: 0, ouverts: 0, maxOuverts: 0, setContents: [] };
  const launch = async (): Promise<Browser> => {
    if (options.launchMs) await dormir(options.launchMs);
    if (options.launchEchoue) throw new Error("navigateur introuvable");
    espion.ouverts += 1;
    espion.maxOuverts = Math.max(espion.maxOuverts, espion.ouverts);
    return {
      newContext: async (args: unknown) => {
        espion.newContextArgs.push(args);
        return {
          route: async (motif: string, gestionnaire: (route: { abort: () => Promise<void>; continue: () => Promise<void> }) => unknown) => {
            const abort = vi.fn().mockResolvedValue(undefined);
            espion.routes.push({ motif, abort });
            // Le gestionnaire est EXERCÉ : une garde qui n'avorte pas se verrait ici.
            // `continue` existe aussi (comme sur la vraie route) : un gestionnaire qui LAISSE PASSER la requête se voit par `abort` jamais appelé, pas par un plantage.
            await gestionnaire({ abort, continue: vi.fn().mockResolvedValue(undefined) });
          },
          newPage: async () => {
            if (options.newPageEchoue) throw new Error("page refusée");
            return {
              setContent: async (html: string) => {
                espion.setContents.push({ html });
              },
              pdf: options.pdf ?? (async () => PDF)
            };
          }
        };
      },
      close: async () => {
        espion.closes += 1;
        espion.ouverts -= 1;
        if (options.closeEchoue) throw new Error("fermeture refusée");
      }
    } as unknown as Browser;
  };
  return { launch, espion };
}

describe("PlaywrightPdfRenderer — les gardes de la décision 3", () => {
  it("rend les octets du PDF, JavaScript COUPÉ et TOUTE requête avortée, navigateur fermé", async () => {
    const { launch, espion } = faux({});
    const octets = await new PlaywrightPdfRenderer({ launch }).render("<p>x</p>");
    expect(Array.from(octets)).toEqual(Array.from(PDF));
    // Garde 1 : JavaScript coupé.
    expect(espion.newContextArgs).toEqual([{ javaScriptEnabled: false }]);
    // Garde 2 : un gestionnaire est posé sur TOUTES les requêtes, et il AVORTE.
    expect(espion.routes.map((r) => r.motif)).toEqual(["**/*"]);
    expect(espion.routes[0]!.abort).toHaveBeenCalledTimes(1);
    // Le HTML reçu est celui qu'on a passé : l'adaptateur ne le réécrit pas.
    expect(espion.setContents).toEqual([{ html: "<p>x</p>" }]);
    // Garde 3 : fermé, une fois.
    expect(espion.closes).toBe(1);
  });

  it("garde 3 — le navigateur est fermé quand la PAGE est refusée", async () => {
    const { launch, espion } = faux({ newPageEchoue: true });
    await expect(new PlaywrightPdfRenderer({ launch }).render("x")).rejects.toBeInstanceOf(PdfRenderUnavailableError);
    expect(espion.closes).toBe(1);
  });

  it("garde 3 — le navigateur est fermé quand le RENDU échoue", async () => {
    const { launch, espion } = faux({ pdf: async () => Promise.reject(new Error("pdf impossible")) });
    await expect(new PlaywrightPdfRenderer({ launch }).render("x")).rejects.toBeInstanceOf(PdfRenderUnavailableError);
    expect(espion.closes).toBe(1);
  });

  it("garde 3 — le navigateur est fermé quand le rendu DÉPASSE son délai", async () => {
    const { launch, espion } = faux({ pdf: () => new Promise<Uint8Array>(() => undefined) }); // ne se résout jamais
    await expect(new PlaywrightPdfRenderer({ launch, timeoutMs: 20 }).render("x")).rejects.toBeInstanceOf(PdfRenderUnavailableError);
    expect(espion.closes).toBe(1);
  });

  it("garde 3 — un délai qui tombe PENDANT le lancement ne laisse PAS le navigateur orphelin", async () => {
    const { launch, espion } = faux({ launchMs: 80 });
    await expect(new PlaywrightPdfRenderer({ launch, timeoutMs: 20 }).render("x")).rejects.toBeInstanceOf(PdfRenderUnavailableError);
    // À cet instant le navigateur n'est pas encore lancé : rien à fermer. Il finit de se lancer ensuite, et c'est LE TRAVAIL qui le ferme.
    await dormir(200);
    expect(espion.ouverts).toBe(0);
    expect(espion.closes).toBe(1);
  });

  it("un lancement qui ÉCHOUE est une panne du moteur (PdfRenderUnavailableError), sans rien à fermer", async () => {
    const { launch, espion } = faux({ launchEchoue: true });
    const erreur = await new PlaywrightPdfRenderer({ launch }).render("x").catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(PdfRenderUnavailableError);
    expect((erreur as Error).cause).toBeInstanceOf(Error);
    expect(((erreur as Error).cause as Error).message).toBe("navigateur introuvable");
    expect(espion.closes).toBe(0);
  });

  it("une fermeture qui échoue à son tour ne MASQUE pas l'erreur d'origine", async () => {
    const { launch, espion } = faux({ newPageEchoue: true, closeEchoue: true });
    const erreur = await new PlaywrightPdfRenderer({ launch }).render("x").catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(PdfRenderUnavailableError);
    expect(((erreur as Error).cause as Error).message).toBe("page refusée");
    expect(espion.closes).toBe(1);
  });

  it("garde 4 — jamais plus de N rendus simultanés, et N est ATTEINT (une borne à 1 passerait le premier contrôle seul)", async () => {
    const { launch, espion } = faux({ pdf: async () => (await dormir(25), PDF) });
    const rendu = new PlaywrightPdfRenderer({ launch });
    const resultats = await Promise.all(Array.from({ length: 6 }, (_, i) => rendu.render(`<p>${i}</p>`)));
    expect(resultats).toHaveLength(6);
    expect(espion.maxOuverts).toBe(MAX_CONCURRENT_RENDERS);
    expect(espion.closes).toBe(6);
  });

  it("garde 4 — la borne se règle : à 1, les rendus passent un par un", async () => {
    const { launch, espion } = faux({ pdf: async () => (await dormir(15), PDF) });
    const rendu = new PlaywrightPdfRenderer({ launch, maxConcurrent: 1 });
    await Promise.all([rendu.render("a"), rendu.render("b"), rendu.render("c")]);
    expect(espion.maxOuverts).toBe(1);
  });
});

describe("Gate", () => {
  it("⛔ la place rendue est TRANSMISE à celui qui attend : le second travail démarre quand le premier se termine — mesuré par une course bornée, jamais par un délai de test", async () => {
    const gate = new Gate(1);
    const ordre: string[] = [];
    const premier = gate.run(async () => {
      await dormir(10);
      ordre.push("premier");
    });
    const second = gate.run(async () => {
      ordre.push("second");
    });
    // Une borne explicite : si la file n'est jamais relancée, la course rend `false` — une ASSERTION qui échoue, pas un test qui n'en finit pas.
    const termine = await Promise.race([Promise.all([premier, second]).then(() => true), dormir(250).then(() => false)]);
    expect(termine).toBe(true);
    expect(ordre).toEqual(["premier", "second"]);
  });

  it("refuse une borne qui n'est pas un entier ≥ 1", () => {
    expect(() => new Gate(0)).toThrow(RangeError);
    expect(() => new Gate(1.5)).toThrow(RangeError);
  });

  it("libère la place même quand le travail ÉCHOUE (sinon un échec bloquerait la file à jamais)", async () => {
    const gate = new Gate(1);
    await expect(gate.run(async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    await expect(gate.run(async () => "suite")).resolves.toBe("suite");
  });
});
