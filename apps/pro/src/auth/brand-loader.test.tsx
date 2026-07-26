// Tests du BrandLoader (Lot A12, D44). Le composant vit dans @zwadj/ui — on le
// teste ICI pour réutiliser le harnais jsdom de l'app Pro, sans ajouter de
// configuration vitest au paquet (même décision qu'en A5 pour ConfirmDialog).
//
// Deux régressions RÉELLES sont couvertes :
//  - l'attente doit être ANNONCÉE (role=status + texte localisé masqué) alors
//    que le SVG, lui, reste décoratif ;
//  - le tracé ne doit avoir QU'UN SEUL sous-chemin : SVG réinitialise le motif
//    de tirets à chaque sous-chemin, donc un `M` au milieu ferait apparaître
//    DEUX serpents simultanés, un par anneau.
import { render, screen } from "@testing-library/react";
import { BRAND_LOADER_PATH, BrandLoader } from "@zwadj/ui";

describe("BrandLoader — accessibilité", () => {
  it("annonce l'attente (role=status, aria-live) avec un texte MASQUÉ, et cache le SVG", () => {
    const { container } = render(<BrandLoader label="Chargement…" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");

    // Le libellé arrive en PROP (le paquet ne connaît aucun runtime i18n) et il
    // est masqué VISUELLEMENT, jamais retiré de l'arbre d'accessibilité.
    const label = screen.getByText("Chargement…");
    expect(label).toHaveClass("sr-only");
    expect(status).toContainElement(label);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("BrandLoader — tracé", () => {
  it("UN SEUL sous-chemin : un second « M » ferait deux serpents simultanés", () => {
    expect((BRAND_LOADER_PATH.match(/M/g) ?? []).length).toBe(1);
  });

  it("le tracé rendu est bien celui-là, avec pathLength normalisé à 1", () => {
    const { container } = render(<BrandLoader label="Chargement…" />);
    const path = container.querySelector("path");

    expect(path?.getAttribute("d")).toBe(BRAND_LOADER_PATH);
    // Sans `pathLength="1"`, les valeurs de tirets de la feuille de styles
    // (0.3 / 0.7) ne veulent plus rien dire et le serpent disparaît.
    expect(path?.getAttribute("pathLength")).toBe("1");
  });
});
