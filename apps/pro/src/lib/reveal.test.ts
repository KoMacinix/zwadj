// Lot R2d — le helper isolé. Le parcours walk-in le teste EN SITUATION ; ici on
// mesure les détails qu'un test de composant ne peut pas voir : l'ordre exact
// des appels et la valeur passée à `behavior`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion, revealAndFocus } from "./reveal";

/** Pose une préférence système. `undefined` = `matchMedia` absent. */
function poserPreference(reduit: boolean | undefined): void {
  if (reduit === undefined) {
    Reflect.deleteProperty(window, "matchMedia");
    return;
  }
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (requete: string) => ({ matches: requete.includes("reduce") && reduit })
  });
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  vi.restoreAllMocks();
});

describe("prefersReducedMotion", () => {
  it("lit la préférence système quand elle est disponible", () => {
    poserPreference(true);
    expect(prefersReducedMotion()).toBe(true);
    poserPreference(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  /** ⚠ L'inconfort n'est pas symétrique : animer quelqu'un qui a demandé à ne
   *  pas l'être peut déclencher un vertige, alors que sauter sans glisser ne
   *  coûte que de l'élégance. Dans le doute, on ne bouge pas. */
  it("sans matchMedia, répond « mouvement réduit » — le défaut prudent", () => {
    poserPreference(undefined);
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe("revealAndFocus", () => {
  function cible(): HTMLElement {
    const el = document.createElement("section");
    el.tabIndex = -1;
    document.body.append(el);
    return el;
  }

  it("pose le focus ET fait défiler — pas l'un sans l'autre", () => {
    poserPreference(false);
    const el = cible();
    const scroll = vi.fn();
    el.scrollIntoView = scroll;

    revealAndFocus(el);

    expect(document.activeElement).toBe(el);
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  /** ⚠ LE CŒUR DU HELPER. `focus()` fait défiler tout seul, sèchement et sans
   *  regarder la préférence. Sans `preventScroll`, l'écran sauterait PUIS
   *  glisserait — deux mouvements pour une seule intention. */
  it("neutralise le défilement implicite de focus() avant de défiler lui-même", () => {
    poserPreference(false);
    const el = cible();
    const ordre: string[] = [];
    el.focus = vi.fn((options?: FocusOptions) => {
      ordre.push(`focus:preventScroll=${String(options?.preventScroll)}`);
    });
    el.scrollIntoView = vi.fn(() => void ordre.push("scroll"));

    revealAndFocus(el);

    expect(ordre).toEqual(["focus:preventScroll=true", "scroll"]);
  });

  it("glisse quand le mouvement est accepté, saute quand il est refusé", () => {
    for (const [reduit, attendu] of [
      [false, "smooth"],
      [true, "auto"]
    ] as const) {
      poserPreference(reduit);
      const el = cible();
      const scroll = vi.fn();
      el.scrollIntoView = scroll;

      revealAndFocus(el);

      expect(scroll, `préférence réduite=${String(reduit)}`).toHaveBeenCalledWith({
        behavior: attendu,
        block: "start"
      });
    }
  });

  /** Le bloc du devis n'existe pas tant qu'aucun devis n'a été calculé : la ref
   *  vaut alors `null`, et ce n'est pas une erreur. */
  it("ne fait rien sur une cible absente, sans lever", () => {
    expect(() => revealAndFocus(null)).not.toThrow();
  });
});
